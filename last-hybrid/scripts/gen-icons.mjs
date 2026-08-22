#!/usr/bin/env node
// Generates the PWA's PNG icons from scratch — no image libraries, no binary
// assets checked in that a human had to draw. Everything is rasterised into an
// RGBA buffer at 4x and box-downsampled for anti-aliasing, then written out as
// a PNG using node's built-in zlib.
//
//   npm run icons
//
// The matching icon.svg / icon-maskable.svg in public/ are hand-written to the
// same design; if you change the wolf here, change them too.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
const SS = 4 // supersample factor

// ---------------------------------------------------------------- PNG writing

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // truecolour with alpha
  // 10,11,12 = deflate / adaptive filtering / no interlace, all zero already.

  // One filter byte (0 = None) per scanline, then the raw pixels.
  const raw = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    const dst = y * (1 + width * 4)
    raw[dst] = 0
    rgba.copy(raw, dst + 1, y * width * 4, (y + 1) * width * 4)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ------------------------------------------------------------ tiny rasteriser

class Raster {
  constructor(size) {
    this.size = size * SS
    this.px = new Float64Array(this.size * this.size * 4) // straight alpha, 0..1
  }

  /** Composite `color` over the pixel at (x, y) with coverage/alpha `a`. */
  blend(x, y, [r, g, b], a) {
    if (a <= 0 || x < 0 || y < 0 || x >= this.size || y >= this.size) return
    const i = (y * this.size + x) * 4
    const px = this.px
    const dstA = px[i + 3]
    const outA = a + dstA * (1 - a)
    if (outA <= 0) return
    px[i] = (r * a + px[i] * dstA * (1 - a)) / outA
    px[i + 1] = (g * a + px[i + 1] * dstA * (1 - a)) / outA
    px[i + 2] = (b * a + px[i + 2] * dstA * (1 - a)) / outA
    px[i + 3] = outA
  }

  /**
   * Fills every pixel for which `inside(x, y)` returns true, in supersampled
   * coordinates. `color` may be a constant or a function of (x, y) for
   * gradients. Bounds are in supersampled space; pass them to avoid scanning
   * the whole icon for a small shape.
   */
  fill(inside, color, alpha = 1, bounds = null) {
    const [x0, y0, x1, y1] = bounds ?? [0, 0, this.size, this.size]
    const lo = (v) => Math.max(0, Math.floor(v))
    const hi = (v) => Math.min(this.size, Math.ceil(v))
    const isFn = typeof color === 'function'
    for (let y = lo(y0); y < hi(y1); y++) {
      for (let x = lo(x0); x < hi(x1); x++) {
        if (inside(x, y)) this.blend(x, y, isFn ? color(x, y) : color, alpha)
      }
    }
  }

  /** Downsample by SS, keeping alpha. */
  toRgba() {
    const out = this.size / SS
    const buf = Buffer.alloc(out * out * 4)
    const n = SS * SS
    for (let y = 0; y < out; y++) {
      for (let x = 0; x < out; x++) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0
        for (let sy = 0; sy < SS; sy++) {
          for (let sx = 0; sx < SS; sx++) {
            const i = ((y * SS + sy) * this.size + (x * SS + sx)) * 4
            const pa = this.px[i + 3]
            r += this.px[i] * pa
            g += this.px[i + 1] * pa
            b += this.px[i + 2] * pa
            a += pa
          }
        }
        const o = (y * out + x) * 4
        // Un-premultiply back to straight alpha for the PNG.
        buf[o] = a > 0 ? Math.round((r / a) * 255) : 0
        buf[o + 1] = a > 0 ? Math.round((g / a) * 255) : 0
        buf[o + 2] = a > 0 ? Math.round((b / a) * 255) : 0
        buf[o + 3] = Math.round((a / n) * 255)
      }
    }
    return buf
  }
}

const rgb = (hex) => [((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255]
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

// ------------------------------------------------------------------ the icon

// Kept in step with src/art/palette.ts by hand — this script can't import it.
const C = {
  bgTop: rgb(0x27324a),
  bgBottom: rgb(0x0d1117),
  fur: rgb(0xbfd4e8),
  furShade: rgb(0x6d829a),
  ink: rgb(0x141b24),
  moon: rgb(0xdfe9f5),
  eye: rgb(0xffc861),
}

/**
 * A wolf's head, head-on: two ears, a tapered face, gold eyes, with the moon
 * rising behind it. All coordinates are in a 0..1 unit square so it scales to
 * any size. `maskable` shrinks the art, whose outer 10% gets cropped.
 */
function drawIcon(size, { maskable }) {
  const r = new Raster(size)
  const S = r.size
  const u = (v) => v * S // unit -> supersampled pixels
  const ellipse =
    (cx, cy, rx, ry) =>
    (x, y) => {
      const dx = (x + 0.5 - u(cx)) / u(rx)
      const dy = (y + 0.5 - u(cy)) / u(ry)
      return dx * dx + dy * dy <= 1
    }
  const box = (cx, cy, rx, ry) => [u(cx - rx) - 2, u(cy - ry) - 2, u(cx + rx) + 2, u(cy + ry) + 2]

  /** Even-odd point-in-polygon over a flat [x, y, ...] list of unit coords. */
  const polygon = (points) => (x, y) => {
    const px = (x + 0.5) / S
    const py = (y + 0.5) / S
    let inside = false
    for (let i = 0, j = points.length / 2 - 1; i < points.length / 2; j = i++) {
      const xi = points[i * 2]
      const yi = points[i * 2 + 1]
      const xj = points[j * 2]
      const yj = points[j * 2 + 1]
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
  }

  // --- background
  const gradient = (x, y) => mix(C.bgTop, C.bgBottom, y / S)
  if (maskable) {
    r.fill(() => true, gradient)
  } else {
    const rad = 0.22
    r.fill((x, y) => {
      const px = (x + 0.5) / S
      const py = (y + 0.5) / S
      const dx = Math.max(0, Math.abs(px - 0.5) - (0.5 - rad))
      const dy = Math.max(0, Math.abs(py - 0.5) - (0.5 - rad))
      return dx * dx + dy * dy <= rad * rad
    }, gradient)
  }

  // Scale everything about the centre; smaller on maskable icons so it
  // survives the platform's circular crop.
  const k = maskable ? 0.74 : 1
  const at = (v) => 0.5 + (v - 0.5) * k

  // --- the moon, cut by a second disc offset up and right
  const moonX = at(0.5)
  const moonY = at(0.4)
  const moonR = 0.31 * k
  const insideMoon = ellipse(moonX, moonY, moonR, moonR)
  const insideBite = ellipse(moonX + 0.11 * k, moonY - 0.1 * k, moonR * 0.94, moonR * 0.94)
  r.fill((x, y) => insideMoon(x, y) && !insideBite(x, y), C.moon, 0.5, box(moonX, moonY, moonR, moonR))

  // --- ears, behind the head so its edge cuts them cleanly
  for (const side of [-1, 1]) {
    r.fill(
      polygon([
        at(0.5 + side * 0.14),
        at(0.42),
        at(0.5 + side * 0.33),
        at(0.16),
        at(0.5 + side * 0.36),
        at(0.47),
      ]),
      C.fur,
      1,
      box(at(0.5 + side * 0.25), at(0.32), 0.2, 0.2),
    )
    r.fill(
      polygon([
        at(0.5 + side * 0.185),
        at(0.4),
        at(0.5 + side * 0.31),
        at(0.235),
        at(0.5 + side * 0.325),
        at(0.42),
      ]),
      C.furShade,
      1,
      box(at(0.5 + side * 0.25), at(0.32), 0.2, 0.2),
    )
  }

  // --- head: a broad brow tapering to the muzzle
  const head = polygon([
    at(0.2),
    at(0.42),
    at(0.28),
    at(0.34),
    at(0.72),
    at(0.34),
    at(0.8),
    at(0.42),
    at(0.72),
    at(0.62),
    at(0.6),
    at(0.72),
    at(0.5),
    at(0.87),
    at(0.4),
    at(0.72),
    at(0.28),
    at(0.62),
  ])
  r.fill(head, C.fur, 1, box(0.5, at(0.58), 0.42, 0.42))

  // Shading down the right side, so it doesn't read as flat.
  r.fill(
    (x, y) => head(x, y) && (x + 0.5) / S > at(0.52),
    C.furShade,
    0.35,
    box(0.5, at(0.58), 0.42, 0.42),
  )

  // --- muzzle and nose
  r.fill(
    polygon([at(0.42), at(0.66), at(0.58), at(0.66), at(0.5), at(0.86)]),
    C.furShade,
    0.85,
    box(0.5, at(0.75), 0.14, 0.14),
  )
  r.fill(ellipse(0.5, at(0.79), 0.045 * k, 0.035 * k), C.ink, 1, box(0.5, at(0.79), 0.07, 0.07))

  // --- eyes: gold slits, angled inward for a hard stare
  for (const side of [-1, 1]) {
    const ex = at(0.5 + side * 0.145)
    const ey = at(0.5)
    r.fill(
      polygon([
        ex - side * 0.075 * k,
        ey - 0.012 * k,
        ex + side * 0.06 * k,
        ey - 0.052 * k,
        ex + side * 0.072 * k,
        ey + 0.016 * k,
        ex - side * 0.06 * k,
        ey + 0.034 * k,
      ]),
      C.eye,
      1,
      box(ex, ey, 0.11, 0.09),
    )
    r.fill(
      polygon([
        ex - side * 0.012 * k,
        ey - 0.03 * k,
        ex + side * 0.012 * k,
        ey - 0.024 * k,
        ex + side * 0.012 * k,
        ey + 0.02 * k,
        ex - side * 0.012 * k,
        ey + 0.016 * k,
      ]),
      C.ink,
      0.85,
      box(ex, ey, 0.05, 0.05),
    )
  }

  return r
}

// --------------------------------------------------------------------- output

mkdirSync(OUT, { recursive: true })

const jobs = [
  ['icon-192.png', 192, { maskable: false }],
  ['icon-512.png', 512, { maskable: false }],
  ['icon-maskable-192.png', 192, { maskable: true }],
  ['icon-maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, { maskable: true }],
]

for (const [name, size, opts] of jobs) {
  const raster = drawIcon(size, opts)
  writeFileSync(join(OUT, name), encodePng(size, size, raster.toRgba()))
  console.log(`[gen-icons] ${name} (${size}x${size})`)
}
