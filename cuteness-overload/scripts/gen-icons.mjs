#!/usr/bin/env node
// Generates the PWA's PNG icons from scratch — no image libraries, no binary
// assets checked in that a human had to draw. Everything is rasterised into an
// RGBA buffer at 4x and box-downsampled for anti-aliasing, then written out as
// a PNG using node's built-in zlib.
//
//   npm run icons
//
// The matching icon.svg / icon-maskable.svg in public/ are hand-written to the
// same design; if you change the face here, change them too.
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

  /** Downsample by SS and flatten onto nothing (keeping alpha). */
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

const rgb = (hex) => [
  ((hex >> 16) & 0xff) / 255,
  ((hex >> 8) & 0xff) / 255,
  (hex & 0xff) / 255,
]
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

// ------------------------------------------------------------------ the icon

const C = {
  bgTop: rgb(0xffc7e8),
  bgBottom: rgb(0xb79cff),
  fur: rgb(0xfff7f0),
  furShade: rgb(0xffe4ef),
  ink: rgb(0x4a3b52),
  blush: rgb(0xff9ec4),
  ear: rgb(0xffb3d9),
  sparkle: rgb(0xfff3a3),
  white: rgb(0xffffff),
}

/**
 * Draws the mascot (a round kitten-puff face) plus background.
 * All coordinates are in a 0..1 unit square so it scales to any size.
 * `inset` shrinks the face for maskable icons, whose outer 10% gets cropped.
 */
function drawIcon(size, { maskable }) {
  const r = new Raster(size)
  const S = r.size
  const u = (v) => v * S // unit -> supersampled pixels
  const ellipse = (cx, cy, rx, ry) => (x, y) => {
    const dx = (x + 0.5 - u(cx)) / u(rx)
    const dy = (y + 0.5 - u(cy)) / u(ry)
    return dx * dx + dy * dy <= 1
  }
  const box = (cx, cy, rx, ry) => [u(cx - rx) - 2, u(cy - ry) - 2, u(cx + rx) + 2, u(cy + ry) + 2]

  // --- background
  const gradient = (x, y) => mix(C.bgTop, C.bgBottom, y / S)
  if (maskable) {
    r.fill(() => true, gradient)
  } else {
    // Squircle-ish rounded square.
    const rad = 0.22
    r.fill((x, y) => {
      const px = (x + 0.5) / S
      const py = (y + 0.5) / S
      const dx = Math.max(0, Math.abs(px - 0.5) - (0.5 - rad))
      const dy = Math.max(0, Math.abs(py - 0.5) - (0.5 - rad))
      return dx * dx + dy * dy <= rad * rad
    }, gradient)
  }

  // Scale everything about the centre: the face is smaller on maskable icons so
  // it survives the platform's circular crop.
  const k = maskable ? 0.74 : 1
  const at = (v) => 0.5 + (v - 0.5) * k

  // --- sparkles behind the head
  for (const [sx, sy, sr] of [
    [0.16, 0.2, 0.055],
    [0.85, 0.26, 0.04],
    [0.8, 0.8, 0.032],
    [0.19, 0.79, 0.026],
  ]) {
    const cx = at(sx)
    const cy = at(sy)
    const rad = sr * k
    r.fill(
      (x, y) => {
        const dx = Math.abs(x + 0.5 - u(cx)) / u(rad)
        const dy = Math.abs(y + 0.5 - u(cy)) / u(rad)
        // Four-pointed star: a diamond pinched towards the centre.
        return Math.pow(dx, 0.62) + Math.pow(dy, 0.62) <= 1
      },
      C.sparkle,
      0.92,
      box(cx, cy, rad, rad),
    )
  }

  // --- ears (behind the head, so the head's edge cuts them cleanly)
  for (const side of [-1, 1]) {
    const cx = at(0.5 + side * 0.235)
    const cy = at(0.245)
    const rx = 0.13 * k
    const ry = 0.155 * k
    r.fill(ellipse(cx, cy, rx, ry), C.fur, 1, box(cx, cy, rx, ry))
    r.fill(ellipse(cx, cy + 0.012 * k, rx * 0.5, ry * 0.5), C.ear, 1, box(cx, cy, rx, ry))
  }

  // --- head
  const hx = 0.5
  const hy = at(0.53)
  const hrx = 0.335 * k
  const hry = 0.315 * k
  r.fill(ellipse(hx, hy + 0.02 * k, hrx, hry), C.furShade, 1, box(hx, hy, hrx + 0.04, hry + 0.06))
  r.fill(ellipse(hx, hy, hrx, hry), C.fur, 1, box(hx, hy, hrx, hry))

  // --- blush
  for (const side of [-1, 1]) {
    const cx = at(0.5 + side * 0.205)
    const cy = at(0.605)
    const rx = 0.062 * k
    const ry = 0.042 * k
    r.fill(ellipse(cx, cy, rx, ry), C.blush, 0.85, box(cx, cy, rx, ry))
  }

  // --- eyes: big happy ovals with a highlight
  for (const side of [-1, 1]) {
    const cx = at(0.5 + side * 0.115)
    const cy = at(0.505)
    const rx = 0.055 * k
    const ry = 0.075 * k
    r.fill(ellipse(cx, cy, rx, ry), C.ink, 1, box(cx, cy, rx, ry))
    const gx = cx + side * 0.016 * k
    const gy = cy - 0.026 * k
    r.fill(ellipse(gx, gy, 0.022 * k, 0.026 * k), C.white, 0.95, box(gx, gy, 0.03, 0.03))
    const g2y = cy + 0.03 * k
    r.fill(ellipse(cx - side * 0.012 * k, g2y, 0.012 * k, 0.013 * k), C.white, 0.6, box(cx, g2y, 0.02, 0.02))
  }

  // --- mouth: a little cat "w", drawn as two arcs
  const my = at(0.63)
  const mx = 0.5
  for (const side of [-1, 1]) {
    const cx = mx + side * 0.028 * k
    r.fill(
      (x, y) => {
        const dx = (x + 0.5 - u(cx)) / u(0.032 * k)
        const dy = (y + 0.5 - u(my)) / u(0.032 * k)
        const d = Math.sqrt(dx * dx + dy * dy)
        return d < 1 && d > 0.55 && y + 0.5 > u(my)
      },
      C.ink,
      1,
      box(cx, my, 0.04, 0.04),
    )
  }
  // Nose
  r.fill(ellipse(mx, at(0.598), 0.018 * k, 0.013 * k), C.blush, 1, box(mx, at(0.598), 0.03, 0.03))

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
