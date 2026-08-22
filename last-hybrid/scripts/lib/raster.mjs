// Pixel pushing for the sprite pipeline: keying a background out of source
// art, cropping, and compositing pieces of it through a 2D transform.
//
// Everything here works on plain `{ width, height, rgba }` objects, where rgba
// is a Buffer of straight (non-premultiplied) 8-bit RGBA.

export function makeImage(width, height) {
  return { width, height, rgba: Buffer.alloc(width * height * 4) }
}

export function cloneImage(img) {
  return { width: img.width, height: img.height, rgba: Buffer.from(img.rgba) }
}

const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b
const saturation = (r, g, b) => {
  const max = Math.max(r, g, b)
  return max === 0 ? 0 : (max - Math.min(r, g, b)) / max
}

/**
 * Clears the background by flooding inward from the edges.
 *
 * A plain "every light pixel is background" threshold would also punch holes in
 * the character — the tail tip and the insides of the ears are nearly as pale
 * as the paper. Flooding from the border can only ever reach pixels actually
 * connected to the outside, and the character's dark outline stops it, so those
 * stay put. It also takes the drop shadow with it, which the game draws itself.
 */
export function keyBackground(img, { maxSaturation = 0.16, minLuma = 186, feather = 2 } = {}) {
  const { width, height, rgba } = img
  const background = new Uint8Array(width * height)
  const stack = []

  const isBackgroundish = (i) => {
    const r = rgba[i * 4]
    const g = rgba[i * 4 + 1]
    const b = rgba[i * 4 + 2]
    return luma(r, g, b) >= minLuma && saturation(r, g, b) <= maxSaturation
  }

  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const i = y * width + x
    if (background[i] || !isBackgroundish(i)) return
    background[i] = 1
    stack.push(x, y)
  }

  for (let x = 0; x < width; x++) {
    push(x, 0)
    push(x, height - 1)
  }
  for (let y = 0; y < height; y++) {
    push(0, y)
    push(width - 1, y)
  }

  while (stack.length) {
    const y = stack.pop()
    const x = stack.pop()
    push(x - 1, y)
    push(x + 1, y)
    push(x, y - 1)
    push(x, y + 1)
  }

  for (let i = 0; i < width * height; i++) {
    if (background[i]) rgba[i * 4 + 3] = 0
  }

  // The source is a JPEG, so the outline bleeds a pale halo into the paper.
  // Anything still opaque but touching cleared space gets its alpha pulled down
  // by how close to white it is, which dissolves the halo instead of leaving a
  // bright rim around the character.
  if (feather > 0) {
    const original = Buffer.from(rgba)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x
        if (background[i]) continue
        let nearBackground = false
        for (let dy = -feather; dy <= feather && !nearBackground; dy++) {
          for (let dx = -feather; dx <= feather; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
            if (background[ny * width + nx]) {
              nearBackground = true
              break
            }
          }
        }
        if (!nearBackground) continue
        const l = luma(original[i * 4], original[i * 4 + 1], original[i * 4 + 2])
        const alpha = Math.max(0, Math.min(1, (255 - l) / (255 - minLuma)))
        rgba[i * 4 + 3] = Math.round(rgba[i * 4 + 3] * alpha)
      }
    }
  }

  return img
}

/**
 * Keeps only the largest connected blob of opaque pixels.
 *
 * The character is one piece; the drop shadow under it is not. Keying by
 * brightness alone always leaves some of that shadow behind — its darker core
 * sits below any threshold safe for the artwork — and this removes the leavings
 * without having to find a threshold that separates them, which there isn't one.
 */
export function keepLargestComponent(img, minAlpha = 24) {
  const { width, height, rgba } = img
  const label = new Int32Array(width * height).fill(-1)
  let best = -1
  let bestSize = 0

  for (let start = 0; start < width * height; start++) {
    if (label[start] !== -1 || rgba[start * 4 + 3] < minAlpha) continue
    const id = start
    let size = 0
    const stack = [start]
    label[start] = id
    while (stack.length) {
      const i = stack.pop()
      size++
      const x = i % width
      const y = (i / width) | 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          const n = ny * width + nx
          if (label[n] !== -1 || rgba[n * 4 + 3] < minAlpha) continue
          label[n] = id
          stack.push(n)
        }
      }
    }
    if (size > bestSize) {
      bestSize = size
      best = id
    }
  }

  for (let i = 0; i < width * height; i++) {
    if (label[i] !== best) rgba[i * 4 + 3] = 0
  }
  return img
}

/** Bounding box of everything at least `minAlpha` opaque. */
export function opaqueBounds(img, minAlpha = 8) {
  let minX = img.width
  let minY = img.height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.rgba[(y * img.width + x) * 4 + 3] < minAlpha) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) throw new Error('Image is entirely transparent')
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

export function crop(img, x, y, width, height) {
  const out = makeImage(width, height)
  for (let dy = 0; dy < height; dy++) {
    const sy = y + dy
    if (sy < 0 || sy >= img.height) continue
    for (let dx = 0; dx < width; dx++) {
      const sx = x + dx
      if (sx < 0 || sx >= img.width) continue
      img.rgba.copy(out.rgba, (dy * width + dx) * 4, (sy * img.width + sx) * 4, (sy * img.width + sx) * 4 + 4)
    }
  }
  return out
}

export function trim(img) {
  const box = opaqueBounds(img)
  return { image: crop(img, box.x, box.y, box.width, box.height), box }
}

/** Bilinear sample, returning straight RGBA. Out of bounds is transparent. */
function sample(img, x, y, out) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  out[0] = out[1] = out[2] = out[3] = 0
  for (let j = 0; j <= 1; j++) {
    for (let i = 0; i <= 1; i++) {
      const sx = x0 + i
      const sy = y0 + j
      if (sx < 0 || sy < 0 || sx >= img.width || sy >= img.height) continue
      const w = (i ? fx : 1 - fx) * (j ? fy : 1 - fy)
      if (w <= 0) continue
      const k = (sy * img.width + sx) * 4
      const a = img.rgba[k + 3] / 255
      // Weight colour by alpha so transparent neighbours don't drag in their
      // (meaningless) colour and fringe the edges.
      out[0] += img.rgba[k] * a * w
      out[1] += img.rgba[k + 1] * a * w
      out[2] += img.rgba[k + 2] * a * w
      out[3] += a * w
    }
  }
}

/**
 * Composites `src` into `dst` through a transform.
 *
 * `anchor` is the point of `src` (in 0..1 of its size) placed at `x, y`.
 * Rotation is about that anchor. Minification supersamples, because source art
 * comes in three or four times the size a frame needs and point-sampling it
 * down turns fur trim and eyes into noise.
 */
export function blit(dst, src, options = {}) {
  const {
    x = 0,
    y = 0,
    anchor = [0.5, 0.5],
    scaleX = 1,
    scaleY = 1,
    rotation = 0,
    alpha = 1,
    flipX = false,
    /** Multiplied over the source colour: [r, g, b] in 0..1, or null. */
    tint = null,
    /** Blend toward black, 0..1 — used for limbs on the far side of a body. */
    shade = 0,
  } = options

  const sx = (flipX ? -1 : 1) * scaleX
  const ax = anchor[0] * src.width
  const ay = anchor[1] * src.height
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)

  // Forward transform of the source corners, to find the area to walk.
  const forward = (px, py) => {
    const lx = (px - ax) * sx
    const ly = (py - ay) * scaleY
    return [x + lx * cos - ly * sin, y + lx * sin + ly * cos]
  }
  const corners = [forward(0, 0), forward(src.width, 0), forward(0, src.height), forward(src.width, src.height)]
  const minX = Math.max(0, Math.floor(Math.min(...corners.map((c) => c[0]))) - 1)
  const maxX = Math.min(dst.width - 1, Math.ceil(Math.max(...corners.map((c) => c[0]))) + 1)
  const minY = Math.max(0, Math.floor(Math.min(...corners.map((c) => c[1]))) - 1)
  const maxY = Math.min(dst.height - 1, Math.ceil(Math.max(...corners.map((c) => c[1]))) + 1)

  const steps = Math.max(
    1,
    Math.min(4, Math.ceil(1 / Math.min(Math.abs(sx) || 1, Math.abs(scaleY) || 1))),
  )
  const sub = 1 / steps
  const acc = [0, 0, 0, 0]
  const px = [0, 0, 0, 0]

  for (let dy = minY; dy <= maxY; dy++) {
    for (let dx = minX; dx <= maxX; dx++) {
      acc[0] = acc[1] = acc[2] = acc[3] = 0
      let taken = 0
      for (let j = 0; j < steps; j++) {
        for (let i = 0; i < steps; i++) {
          // Inverse transform: destination pixel -> source coordinates.
          const ox = dx + (i + 0.5) * sub - x
          const oy = dy + (j + 0.5) * sub - y
          const rx = ox * cos + oy * sin
          const ry = -ox * sin + oy * cos
          sample(src, rx / sx + ax, ry / scaleY + ay, px)
          acc[0] += px[0]
          acc[1] += px[1]
          acc[2] += px[2]
          acc[3] += px[3]
          taken++
        }
      }
      const a = (acc[3] / taken) * alpha
      if (a <= 0.002) continue
      // Back to straight colour, then tint and shade.
      let r = acc[0] / acc[3]
      let g = acc[1] / acc[3]
      let b = acc[2] / acc[3]
      if (tint) {
        r *= tint[0]
        g *= tint[1]
        b *= tint[2]
      }
      if (shade > 0) {
        r *= 1 - shade
        g *= 1 - shade
        b *= 1 - shade
      }

      const k = (dy * dst.width + dx) * 4
      const da = dst.rgba[k + 3] / 255
      const outA = a + da * (1 - a)
      if (outA <= 0) continue
      dst.rgba[k] = Math.round((r * a + dst.rgba[k] * da * (1 - a)) / outA)
      dst.rgba[k + 1] = Math.round((g * a + dst.rgba[k + 1] * da * (1 - a)) / outA)
      dst.rgba[k + 2] = Math.round((b * a + dst.rgba[k + 2] * da * (1 - a)) / outA)
      dst.rgba[k + 3] = Math.round(outA * 255)
    }
  }
}

/** Every pixel whose colour is within `tolerance` of `color`, as a mask. */
export function colorMask(img, color, tolerance) {
  const mask = new Uint8Array(img.width * img.height)
  for (let i = 0; i < mask.length; i++) {
    if (img.rgba[i * 4 + 3] < 24) continue
    const dr = img.rgba[i * 4] - color[0]
    const dg = img.rgba[i * 4 + 1] - color[1]
    const db = img.rgba[i * 4 + 2] - color[2]
    if (Math.sqrt(dr * dr + dg * dg + db * db) <= tolerance) mask[i] = 1
  }
  return mask
}

/** Every connected run in a mask, as boxes with pixel counts. */
export function components(mask, width, height) {
  const seen = new Uint8Array(width * height)
  const found = []

  for (let start = 0; start < mask.length; start++) {
    if (seen[start] || !mask[start]) continue
    const stack = [start]
    seen[start] = 1
    let size = 0
    let minX = width
    let minY = height
    let maxX = -1
    let maxY = -1
    while (stack.length) {
      const i = stack.pop()
      const x = i % width
      const y = (i / width) | 0
      size++
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
        const n = ny * width + nx
        if (seen[n] || !mask[n]) continue
        seen[n] = 1
        stack.push(n)
      }
    }
    found.push({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, size })
  }
  return found
}

/**
 * The bounding box of a face, from a mask of skin-coloured pixels.
 *
 * Neither "every matching pixel" nor "the biggest blob" is right on its own.
 * The insides of the ears are within a hair's breadth of skin tone, so the
 * first spans the whole head; and a fringe hanging over the brow splits the
 * face into separate pieces, so the second finds only the cheeks and chin —
 * which is how one character ended up with a back view that still had eyes.
 *
 * So: start from the biggest piece and absorb anything sitting directly against
 * it. A forehead separated from the cheeks by a fringe is a few pixels above
 * them and within their width; an ear is far above and off to the side.
 */
export function faceBounds(mask, width, height, { gap = 14, minOverlap = 0.25 } = {}) {
  const found = components(mask, width, height)
  if (found.length === 0) return null

  let box = found.reduce((best, part) => (part.size > best.size ? part : best))
  const merged = new Set([box])

  let grew = true
  while (grew) {
    grew = false
    for (const part of found) {
      if (merged.has(part)) continue
      // Vertically adjacent...
      const gapY = Math.max(box.y - (part.y + part.height), part.y - (box.y + box.height))
      const gapX = Math.max(box.x - (part.x + part.width), part.x - (box.x + box.width))
      if (gapY > gap || gapX > gap) continue
      // ...and substantially within the same column of the head.
      const overlap =
        Math.min(box.x + box.width, part.x + part.width) - Math.max(box.x, part.x)
      if (overlap < minOverlap * Math.min(box.width, part.width)) continue

      const x = Math.min(box.x, part.x)
      const y = Math.min(box.y, part.y)
      box = {
        x,
        y,
        width: Math.max(box.x + box.width, part.x + part.width) - x,
        height: Math.max(box.y + box.height, part.y + part.height) - y,
        size: box.size + part.size,
      }
      merged.add(part)
      grew = true
    }
  }
  return box
}

/**
 * Mean colour over a box, ignoring outline-dark and blown-out pixels — good for
 * reading "what colour is the hair" off artwork with heavy black linework.
 */
export function averageColor(img, x, y, width, height, { minLuma = 55, maxLuma = 215 } = {}) {
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let py = y; py < y + height; py++) {
    for (let px = x; px < x + width; px++) {
      if (px < 0 || py < 0 || px >= img.width || py >= img.height) continue
      const i = (py * img.width + px) * 4
      if (img.rgba[i + 3] < 200) continue
      const l = 0.299 * img.rgba[i] + 0.587 * img.rgba[i + 1] + 0.114 * img.rgba[i + 2]
      if (l < minLuma || l > maxLuma) continue
      r += img.rgba[i]
      g += img.rgba[i + 1]
      b += img.rgba[i + 2]
      n++
    }
  }
  if (n === 0) return null
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)]
}

/** Multiplies alpha by a feathered ellipse, cutting a patch to a soft oval. */
export function multiplyEllipseAlpha(img, cx, cy, rx, ry, feather = 0.35) {
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry)
      const w = d >= 1 ? 0 : d < 1 - feather ? 1 : (1 - d) / feather
      img.rgba[i + 3] = Math.round(img.rgba[i + 3] * w)
    }
  }
}

/** Softly paints an ellipse of flat colour — used to turn a face into a nape. */
export function fillEllipse(img, cx, cy, rx, ry, color, feather = 0.25) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue
      const i = (y * img.width + x) * 4
      if (img.rgba[i + 3] < 16) continue
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry)
      if (d > 1) continue
      const w = d < 1 - feather ? 1 : (1 - d) / feather
      img.rgba[i] = Math.round(img.rgba[i] * (1 - w) + color[0] * w)
      img.rgba[i + 1] = Math.round(img.rgba[i + 1] * (1 - w) + color[1] * w)
      img.rgba[i + 2] = Math.round(img.rgba[i + 2] * (1 - w) + color[2] * w)
    }
  }
}
