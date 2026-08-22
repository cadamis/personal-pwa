// A minimal PNG codec, built on node's zlib and nothing else.
//
// The repo's rule for scripts is no image libraries and no binary assets that
// only a GUI can produce — see gen-icons.mjs, which rasterises the app icons
// from scratch. This module is the read half of that: enough of the spec to
// load the artwork we're handed and get at its pixels.
//
// Supported on decode: 8-bit truecolour, with or without alpha, and 8-bit
// greyscale, non-interlaced. That covers anything `sips -s format png` emits,
// which is how source art gets here. Anything else throws rather than quietly
// producing garbage.
import { deflateSync, inflateSync } from 'node:zlib'

// ---------------------------------------------------------------------- CRC

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

// ------------------------------------------------------------------- encode

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}

/**
 * Filters one scanline five ways and keeps whichever deflates best, judged by
 * the usual sum-of-absolute-values heuristic.
 *
 * Worth the effort: on a sprite sheet of smooth artwork, filtering the rows
 * rather than storing them raw roughly halves the file, and this one is
 * precached by the service worker for offline play.
 */
function filterScanline(line, prev, bpp, out) {
  let bestType = 0
  let bestScore = Infinity
  const candidate = Buffer.alloc(line.length)

  for (let type = 0; type < 5; type++) {
    let score = 0
    for (let i = 0; i < line.length; i++) {
      const a = i >= bpp ? line[i - bpp] : 0
      const b = prev[i]
      const c = i >= bpp ? prev[i - bpp] : 0
      let v
      switch (type) {
        case 0: v = line[i]; break
        case 1: v = line[i] - a; break
        case 2: v = line[i] - b; break
        case 3: v = line[i] - ((a + b) >> 1); break
        default: v = line[i] - paeth(a, b, c)
      }
      v &= 0xff
      candidate[i] = v
      // Signed magnitude: bytes near zero in either direction compress well.
      score += v < 128 ? v : 256 - v
    }
    if (score < bestScore) {
      bestScore = score
      bestType = type
      candidate.copy(out)
    }
  }
  return bestType
}

/** Applies one filter type (or the per-row best, for `strategy === 'adaptive'`). */
function filterImage(width, height, rgba, strategy) {
  const stride = width * 4
  const raw = Buffer.alloc(height * (1 + stride))
  const filtered = Buffer.alloc(stride)
  const zero = Buffer.alloc(stride)
  let prev = zero

  for (let y = 0; y < height; y++) {
    const line = rgba.subarray(y * stride, (y + 1) * stride)
    const dst = y * (1 + stride)
    if (strategy === 'adaptive') {
      raw[dst] = filterScanline(line, prev, 4, filtered)
      filtered.copy(raw, dst + 1)
    } else if (strategy === 0) {
      raw[dst] = 0
      line.copy(raw, dst + 1)
    } else {
      raw[dst] = strategy
      for (let i = 0; i < stride; i++) {
        const a = i >= 4 ? line[i - 4] : 0
        const b = prev[i]
        const c = i >= 4 ? prev[i - 4] : 0
        const pred = strategy === 1 ? a : strategy === 2 ? b : strategy === 3 ? (a + b) >> 1 : paeth(a, b, c)
        raw[dst + 1 + i] = (line[i] - pred) & 0xff
      }
    }
    prev = line
  }
  return raw
}

/**
 * RGBA buffer -> PNG bytes.
 *
 * Tries a handful of filtering strategies and keeps whichever actually
 * deflates smallest, rather than trusting the usual per-row heuristic. That
 * heuristic picks badly on sprite sheets: most rows are large runs of identical
 * transparent pixels, and letting the filter type change from row to row costs
 * deflate more in lost cross-row matches than the filtering saves. Measuring is
 * cheap here and guarantees this never makes a file bigger.
 */
export function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // truecolour with alpha
  // 10, 11, 12 = deflate / adaptive filtering / no interlace, all zero already.

  let best = null
  for (const strategy of [0, 1, 2, 4, 'adaptive']) {
    const deflated = deflateSync(filterImage(width, height, rgba, strategy), { level: 9 })
    if (!best || deflated.length < best.length) best = deflated
  }

  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', best),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ------------------------------------------------------------------- decode

/** Undoes one scanline's filter, in place. `bpp` is bytes per pixel. */
function unfilter(type, line, prev, bpp) {
  const n = line.length
  switch (type) {
    case 0:
      break
    case 1: // Sub
      for (let i = bpp; i < n; i++) line[i] = (line[i] + line[i - bpp]) & 0xff
      break
    case 2: // Up
      for (let i = 0; i < n; i++) line[i] = (line[i] + prev[i]) & 0xff
      break
    case 3: // Average
      for (let i = 0; i < n; i++) {
        const left = i >= bpp ? line[i - bpp] : 0
        line[i] = (line[i] + ((left + prev[i]) >> 1)) & 0xff
      }
      break
    case 4: // Paeth
      for (let i = 0; i < n; i++) {
        const a = i >= bpp ? line[i - bpp] : 0
        const b = prev[i]
        const c = i >= bpp ? prev[i - bpp] : 0
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        const pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
        line[i] = (line[i] + pred) & 0xff
      }
      break
    default:
      throw new Error(`Unknown PNG filter type ${type}`)
  }
}

/** PNG bytes -> { width, height, rgba }. */
export function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) throw new Error('Not a PNG')

  let width = 0
  let height = 0
  let depth = 0
  let colorType = 0
  const idat = []

  let offset = 8
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    offset += 12 + length

    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      depth = data[8]
      colorType = data[9]
      if (data[12] !== 0) throw new Error('Interlaced PNGs are not supported')
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') {
      break
    }
  }

  if (depth !== 8) throw new Error(`Only 8-bit PNGs are supported (got ${depth})`)
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType]
  if (!channels) throw new Error(`Unsupported PNG colour type ${colorType}`)

  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const rgba = Buffer.alloc(width * height * 4)
  let prev = Buffer.alloc(stride)

  for (let y = 0; y < height; y++) {
    const start = y * (stride + 1)
    const filter = raw[start]
    const line = Buffer.from(raw.subarray(start + 1, start + 1 + stride))
    unfilter(filter, line, prev, channels)
    prev = line

    for (let x = 0; x < width; x++) {
      const src = x * channels
      const dst = (y * width + x) * 4
      if (channels >= 3) {
        rgba[dst] = line[src]
        rgba[dst + 1] = line[src + 1]
        rgba[dst + 2] = line[src + 2]
        rgba[dst + 3] = channels === 4 ? line[src + 3] : 255
      } else {
        // Greyscale, with or without an alpha channel.
        rgba[dst] = line[src]
        rgba[dst + 1] = line[src]
        rgba[dst + 2] = line[src]
        rgba[dst + 3] = channels === 2 ? line[src + 1] : 255
      }
    }
  }

  return { width, height, rgba }
}
