/**
 * Canvas 2D drawing kit for the game's sprites.
 *
 * All the art is generated at boot rather than shipped as PNGs, which keeps the
 * repo free of binary assets nobody can edit and makes the whole look tweakable
 * from one palette. Sprites are drawn at {@link ART_SS}x and displayed at
 * 1/ART_SS so they stay crisp when the camera zooms in on a big tablet.
 *
 * The house style is "vinyl sticker": every character is built from a stack of
 * {@link Part}s that share one thick silhouette outline, each part is lit from
 * the top-left with a hue-shifted shadow crescent on the bottom-right, and
 * faces get big glossy eyes. {@link paintParts} is the function that does all
 * of that; most painters are just a list of parts followed by a face.
 */
import { css, darken, inkOf, lighten, mix, P, shade, tint } from './palette'

/** Supersample factor: draw big, display small. */
export const ART_SS = 2

export interface Canvas2D {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  /** Display size (canvas size / ART_SS), not counting {@link pad}. */
  size: number
  /**
   * Canvas pixels of spare room on every side, for art that pokes out of its
   * design box (a hat tip, a carrot's leaves). Hit sizes ignore it.
   */
  pad: number
}

type Ctx = CanvasRenderingContext2D

/**
 * Creates a square canvas whose *display* size is `size` px. Drawing helpers
 * work in display units and the context is pre-scaled, so a helper never has to
 * think about ART_SS.
 *
 * `zoom` paints the same design bigger: coordinates stay those of a `size`
 * canvas, but the result has `size * zoom` display pixels. Bosses use it so a
 * sprite shown at 2.4x is painted at 2.4x rather than stretched.
 */
export function makeCanvas(size: number, zoom = 1, pad = 0): Canvas2D {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round((size + pad * 2) * zoom * ART_SS)
  canvas.height = Math.round((size + pad * 2) * zoom * ART_SS)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Cuteness Overload needs a 2D canvas to draw its sprites')
  ctx.scale(ART_SS * zoom, ART_SS * zoom)
  // Painters keep drawing in their 0..size design box; `pad` is extra room round it.
  ctx.translate(pad, pad)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  return { canvas, ctx, size: size * zoom, pad: pad * zoom * ART_SS }
}

/** Non-square variant, for beams and banners. */
export function makeRect(width: number, height: number): Canvas2D {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * ART_SS)
  canvas.height = Math.round(height * ART_SS)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Cuteness Overload needs a 2D canvas to draw its sprites')
  ctx.scale(ART_SS, ART_SS)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  return { canvas, ctx, size: Math.max(width, height), pad: 0 }
}

/**
 * The same art with a soft halo round its silhouette, painted into extra
 * padding so hit sizes don't grow with it (see `Canvas2D.pad`). Used on enemy
 * shots so they pop out of a busy screen.
 */
export function withGlow(art: Canvas2D, color: number, blur: number, strength = 0.9): Canvas2D {
  const room = Math.ceil(blur * 1.4 * ART_SS)
  const canvas = document.createElement('canvas')
  canvas.width = art.canvas.width + room * 2
  canvas.height = art.canvas.height + room * 2
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Cuteness Overload needs a 2D canvas to draw its sprites')
  // Canvas shadows follow the image's alpha, so a zero-offset shadow is a halo
  // hugging the shape. Two passes make it read without blurring it wider.
  ctx.shadowColor = css(color, strength)
  ctx.shadowBlur = blur * ART_SS
  ctx.drawImage(art.canvas, room, room)
  ctx.drawImage(art.canvas, room, room)
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.drawImage(art.canvas, room, room)
  ctx.scale(ART_SS, ART_SS)
  return { canvas, ctx, size: art.size, pad: art.pad + room }
}

// ------------------------------------------------------------------ primitives

export function ellipse(
  ctx: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: number,
  outline?: number,
  lineWidth = 1.6,
): void {
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = css(fill)
  ctx.fill()
  if (outline !== undefined) {
    ctx.lineWidth = lineWidth
    ctx.strokeStyle = css(outline)
    ctx.stroke()
  }
}

export function circle(
  ctx: Ctx,
  cx: number,
  cy: number,
  r: number,
  fill: number,
  outline?: number,
  lineWidth = 1.6,
): void {
  ellipse(ctx, cx, cy, r, r, fill, outline, lineWidth)
}

/** Body outline colour that always reads against the meadow. */
export function rim(color: number): number {
  return inkOf(color)
}

export function roundRect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: number,
  outline?: number,
  lineWidth = 1.6,
): void {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fillStyle = css(fill)
  ctx.fill()
  if (outline !== undefined) {
    ctx.lineWidth = lineWidth
    ctx.strokeStyle = css(outline)
    ctx.stroke()
  }
}

/** A four-pointed sparkle, the game's house motif. */
export function sparkle(ctx: Ctx, cx: number, cy: number, r: number, color: number, alpha = 1): void {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = css(color)
  ctx.beginPath()
  ctx.moveTo(cx, cy - r)
  ctx.quadraticCurveTo(cx + r * 0.18, cy - r * 0.18, cx + r, cy)
  ctx.quadraticCurveTo(cx + r * 0.18, cy + r * 0.18, cx, cy + r)
  ctx.quadraticCurveTo(cx - r * 0.18, cy + r * 0.18, cx - r, cy)
  ctx.quadraticCurveTo(cx - r * 0.18, cy - r * 0.18, cx, cy - r)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

export function heartPath(ctx: Ctx, cx: number, cy: number, r: number): void {
  ctx.moveTo(cx, cy + r * 0.85)
  ctx.bezierCurveTo(cx - r * 1.5, cy - r * 0.25, cx - r * 0.55, cy - r * 1.25, cx, cy - r * 0.4)
  ctx.bezierCurveTo(cx + r * 0.55, cy - r * 1.25, cx + r * 1.5, cy - r * 0.25, cx, cy + r * 0.85)
  ctx.closePath()
}

export function heart(ctx: Ctx, cx: number, cy: number, r: number, fill: number, outline?: number): void {
  ctx.beginPath()
  heartPath(ctx, cx, cy, r)
  ctx.fillStyle = css(fill)
  ctx.fill()
  if (outline !== undefined) {
    ctx.lineWidth = 1.4
    ctx.strokeStyle = css(outline)
    ctx.stroke()
  }
}

export function starPath(ctx: Ctx, cx: number, cy: number, r: number, points: number, inner: number, turn = 0): void {
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * inner
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2 + turn
    const x = cx + Math.cos(a) * rad
    const y = cy + Math.sin(a) * rad
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

export function star(
  ctx: Ctx,
  cx: number,
  cy: number,
  r: number,
  points: number,
  inner: number,
  fill: number,
  outline?: number,
): void {
  ctx.beginPath()
  starPath(ctx, cx, cy, r, points, inner)
  ctx.fillStyle = css(fill)
  ctx.fill()
  if (outline !== undefined) {
    ctx.lineWidth = 1.4
    ctx.strokeStyle = css(outline)
    ctx.stroke()
  }
}

/** Soft radial glow, for magic, pickups and anything that should feel lit. */
export function glow(ctx: Ctx, cx: number, cy: number, r: number, color: number, alpha = 0.6): void {
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  grad.addColorStop(0, css(color, alpha))
  grad.addColorStop(0.45, css(color, alpha * 0.45))
  grad.addColorStop(1, css(color, 0))
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * The soft oval every grounded sprite stands on. Flyers get theirs further
 * below them and fainter, which is the cheapest way to say "this one is in the
 * air".
 */
export function groundShadow(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, alpha = 0.26): void {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(1, ry / rx)
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
  grad.addColorStop(0, css(P.shadow, alpha))
  grad.addColorStop(0.6, css(P.shadow, alpha * 0.75))
  grad.addColorStop(1, css(P.shadow, 0))
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(0, 0, rx, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/**
 * A crescent: the part of circle 1 not covered by circle 2. Adds to the current
 * path, like every path function.
 */
export function crescentPath(ctx: Ctx, x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): void {
  const dx = x2 - x1
  const dy = y2 - y1
  const d = Math.hypot(dx, dy)
  if (d >= r1 + r2 || d <= Math.abs(r1 - r2)) {
    ctx.moveTo(x1 + r1, y1)
    ctx.arc(x1, y1, r1, 0, Math.PI * 2)
    return
  }
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a))
  const px = x1 + (a * dx) / d
  const py = y1 + (a * dy) / d
  const ix1 = px + (h * -dy) / d
  const iy1 = py + (h * dx) / d
  const ix2 = px - (h * -dy) / d
  const iy2 = py - (h * dx) / d
  const t1a = Math.atan2(iy1 - y1, ix1 - x1)
  const t1b = Math.atan2(iy2 - y1, ix2 - x1)
  const t2a = Math.atan2(iy1 - y2, ix1 - x2)
  const t2b = Math.atan2(iy2 - y2, ix2 - x2)
  // Which way round each arc goes: circle 1's arc must bulge away from circle
  // 2's centre, and circle 2's arc must bulge towards circle 1's.
  const midClockwise = (from: number, to: number): number => from + ((((to - from) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / 2
  const away = Math.atan2(-dy, -dx)
  const outerMid = midClockwise(t1a, t1b)
  const outerCcw = Math.cos(outerMid - away) < 0
  const towards = Math.atan2(-dy, -dx)
  const innerMid = midClockwise(t2b, t2a)
  const innerCcw = Math.cos(innerMid - towards) < 0
  ctx.moveTo(ix1, iy1)
  ctx.arc(x1, y1, r1, t1a, t1b, outerCcw)
  ctx.arc(x2, y2, r2, t2b, t2a, innerCcw)
  ctx.closePath()
}

// ---------------------------------------------------------------------- parts

/**
 * Adds a shape to the current path. Path functions never call `beginPath` —
 * the caller does — so the same function can be stroked, filled, clipped, or
 * combined with a second copy of itself to cut a crescent.
 */
export type PathFn = (ctx: Ctx) => void

/** The box a part's lighting is laid out in. */
export interface Bounds {
  cx: number
  cy: number
  rx: number
  ry: number
}

export interface Part {
  path: PathFn
  color: number
  b: Bounds
  /**
   * - `out` (default): contributes to the shared silhouette outline.
   * - `in`: sits in front of earlier parts, so it gets its own thinner outline
   *   drawn on top (an arm across a tummy, a paw, a hat brim).
   * - `none`: no outline at all (markings, bellies, inner ears).
   */
  line?: 'out' | 'in' | 'none'
  /** Skip the lighting and fill flat. */
  flat?: boolean
  /** Strength of the shadow crescent, 0..1. Default 1. */
  shadow?: number
  /** Adds a glossy highlight, for squishy things (slimes, bubbles, noses). */
  gloss?: number
  /** Override the outline colour for this part. */
  ink?: number
}

export function ellPath(cx: number, cy: number, rx: number, ry: number, rot = 0): PathFn {
  return (ctx) => {
    ctx.moveTo(cx + Math.cos(rot) * rx, cy + Math.sin(rot) * rx)
    ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2)
  }
}

/** A part that is an ellipse, which is most of them. */
export function ell(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: number,
  opts: Omit<Part, 'path' | 'color' | 'b'> & { rot?: number } = {},
): Part {
  return { path: ellPath(cx, cy, rx, ry, opts.rot ?? 0), color, b: { cx, cy, rx, ry }, ...opts }
}

/** A part from a custom path; `b` is the box to light it in. */
export function shape(path: PathFn, b: Bounds, color: number, opts: Omit<Part, 'path' | 'color' | 'b'> = {}): Part {
  return { path, color, b, ...opts }
}

/**
 * Fills one part with its lighting: a soft top-left key light, a hard-edged
 * hue-shifted shadow crescent on the bottom-right, and an optional gloss.
 */
export function fillShaded(ctx: Ctx, part: Part): void {
  const { path, color, b } = part
  ctx.save()
  ctx.beginPath()
  path(ctx)
  if (part.flat) {
    ctx.fillStyle = css(color)
    ctx.fill()
    ctx.restore()
    return
  }
  ctx.clip()

  const pad = 3
  const x0 = b.cx - b.rx - pad
  const y0 = b.cy - b.ry - pad
  const w = b.rx * 2 + pad * 2
  const h = b.ry * 2 + pad * 2

  // Soft key light from the top-left.
  const lx = b.cx - b.rx * 0.38
  const ly = b.cy - b.ry * 0.5
  const reach = Math.max(b.rx, b.ry) * 1.7
  const grad = ctx.createRadialGradient(lx, ly, reach * 0.04, lx, ly, reach)
  grad.addColorStop(0, css(tint(color, 0.32)))
  grad.addColorStop(0.42, css(color))
  grad.addColorStop(1, css(shade(color, 0.16)))
  ctx.fillStyle = grad
  ctx.fillRect(x0, y0, w, h)

  // Hard core-shadow crescent: everything inside the part that a copy of the
  // part, nudged towards the light, doesn't cover.
  const strength = part.shadow ?? 1
  if (strength > 0) {
    ctx.beginPath()
    ctx.rect(x0 - 20, y0 - 20, w + 40, h + 40)
    ctx.save()
    const k = 0.2
    ctx.translate(-b.rx * k * 0.75, -b.ry * k)
    // Scale about the centre very slightly so thin parts keep a sliver of lit
    // edge on the shadow side instead of going wholly dark.
    ctx.translate(b.cx, b.cy)
    ctx.scale(1.04, 1.04)
    ctx.translate(-b.cx, -b.cy)
    path(ctx)
    ctx.restore()
    ctx.fillStyle = css(shade(color, 0.2), 0.75 * strength)
    ctx.fill('evenodd')
  }

  if (part.gloss) {
    ctx.save()
    ctx.globalAlpha = part.gloss
    ctx.fillStyle = css(P.white)
    ctx.beginPath()
    ctx.ellipse(b.cx - b.rx * 0.42, b.cy - b.ry * 0.5, b.rx * 0.28, b.ry * 0.17, -0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(b.cx - b.rx * 0.1, b.cy - b.ry * 0.66, Math.min(b.rx, b.ry) * 0.07, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

/**
 * Paints a stack of parts as one sticker: first every silhouette part's outline
 * (doubled width, so the fills then cover the inner half and the parts fuse
 * into one clean shape), then every fill in order.
 */
export function paintParts(ctx: Ctx, parts: readonly Part[], width = 1.9, ink?: number): void {
  const outlineOf = (part: Part): string => css(part.ink ?? ink ?? inkOf(part.color))
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  for (const part of parts) {
    if ((part.line ?? 'out') !== 'out') continue
    ctx.beginPath()
    part.path(ctx)
    ctx.lineWidth = width * 2
    ctx.strokeStyle = outlineOf(part)
    ctx.stroke()
  }
  for (const part of parts) {
    fillShaded(ctx, part)
    if (part.line === 'in') {
      ctx.beginPath()
      part.path(ctx)
      ctx.lineWidth = width * 0.7
      ctx.strokeStyle = outlineOf(part)
      ctx.stroke()
    }
  }
}

/** Strokes an open line (a tail, a whisker, a stalk) with a proper outline. */
export function inkedStroke(ctx: Ctx, path: PathFn, color: number, width: number, outline = inkOf(color)): void {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  path(ctx)
  ctx.lineWidth = width + 2.4
  ctx.strokeStyle = css(outline)
  ctx.stroke()
  ctx.lineWidth = width
  ctx.strokeStyle = css(color)
  ctx.stroke()
  ctx.lineWidth = Math.max(0.6, width * 0.35)
  ctx.strokeStyle = css(tint(color, 0.4), 0.7)
  ctx.save()
  ctx.translate(-width * 0.15, -width * 0.2)
  ctx.beginPath()
  path(ctx)
  ctx.stroke()
  ctx.restore()
}

// ----------------------------------------------------------------- cute faces

export type EyeStyle =
  /** Big glossy eye: the default for friends. */
  | 'shiny'
  /** Glossy with a star-shaped glint. */
  | 'sparkly'
  /** "^" — delighted. */
  | 'happy'
  /** Glossy, half-lidded, with a cross brow: every Grump. */
  | 'grumpy'
  /** Heavy lids, relaxed brow. */
  | 'sleepy'
  /** Gently shut "∩". */
  | 'closed'
  /** Tiny dot eyes, for small or silly things. */
  | 'dot'

export interface EyeOpts {
  style?: EyeStyle
  /** Colour glowing up from the bottom of the eye. */
  iris?: number
  /** Skin colour, used to draw lids over the eye. */
  lid?: number
  /** Which way the eye looks, as a fraction of its radius. */
  look?: { x: number; y: number }
  /** Stroke width for line-style eyes, relative to the eye radius. */
  weight?: number
}

/** One eye at (x, y) with radius `r`. `side` is -1 for the left eye, 1 for the right. */
export function eye(ctx: Ctx, x: number, y: number, r: number, side: number, opts: EyeOpts = {}): void {
  const style = opts.style ?? 'shiny'
  const iris = opts.iris ?? 0x6a4a9a
  const weight = opts.weight ?? 0.42
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (style === 'happy' || style === 'closed') {
    ctx.beginPath()
    if (style === 'happy') ctx.arc(x, y + r * 0.45, r * 0.95, Math.PI * 1.18, Math.PI * 1.82)
    else ctx.arc(x, y - r * 0.2, r * 0.9, Math.PI * 0.2, Math.PI * 0.8)
    ctx.lineWidth = r * weight
    ctx.strokeStyle = css(P.eyeDark)
    ctx.stroke()
    ctx.restore()
    return
  }

  if (style === 'dot') {
    ellipse(ctx, x, y, r * 0.55, r * 0.7, P.eyeDark)
    circle(ctx, x - r * 0.15, y - r * 0.25, r * 0.2, P.white)
    ctx.restore()
    return
  }

  const lookX = (opts.look?.x ?? 0) * r * 0.12
  const lookY = (opts.look?.y ?? 0) * r * 0.12
  const rx = r * 0.78
  const ry = r

  // The eye itself: deep plum at the top, glowing into the iris colour below.
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  const grad = ctx.createLinearGradient(x, y - ry, x, y + ry)
  grad.addColorStop(0, css(P.eyeDark))
  grad.addColorStop(0.5, css(mix(P.eyeDark, iris, 0.35)))
  grad.addColorStop(1, css(lighten(iris, 0.15)))
  ctx.fillStyle = grad
  ctx.fill()

  ctx.save()
  ctx.clip()
  // A pale crescent of reflected light along the bottom.
  ctx.beginPath()
  ctx.ellipse(x, y + ry * 0.62, rx * 0.72, ry * 0.3, 0, 0, Math.PI)
  ctx.fillStyle = css(lighten(iris, 0.55), 0.55)
  ctx.fill()

  if (style === 'grumpy' || style === 'sleepy') {
    // A lid across the top, slanting down towards the nose when cross.
    const lid = opts.lid ?? P.cream
    const slant = style === 'grumpy' ? 0.55 : 0
    const lidY = style === 'grumpy' ? -0.15 : 0.05
    ctx.beginPath()
    ctx.moveTo(x - rx * 1.4, y - ry * 1.4)
    ctx.lineTo(x + rx * 1.4, y - ry * 1.4)
    ctx.lineTo(x + rx * 1.4, y + ry * (lidY - slant * side))
    ctx.lineTo(x - rx * 1.4, y + ry * (lidY + slant * side))
    ctx.closePath()
    ctx.fillStyle = css(lid)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(x - rx * 1.2, y + ry * (lidY + slant * side * 0.86))
    ctx.lineTo(x + rx * 1.2, y + ry * (lidY - slant * side * 0.86))
    ctx.lineWidth = r * 0.34
    ctx.strokeStyle = css(P.eyeDark)
    ctx.stroke()
  }
  ctx.restore()

  // Highlights: one big soft one up and away from the nose, one tiny one below.
  const hx = x - side * rx * 0.05 - rx * 0.3 + lookX
  const hy = y - ry * 0.34 + lookY + (style === 'grumpy' ? ry * 0.35 : 0) + (style === 'sleepy' ? ry * 0.32 : 0)
  if (style === 'sparkly') {
    sparkle(ctx, hx, hy, r * 0.5, P.white, 1)
  } else {
    ellipse(ctx, hx, hy, r * 0.3, r * 0.34, P.white)
  }
  circle(ctx, x + rx * 0.35 + lookX, y + ry * 0.36 + lookY, r * 0.14, P.white)

  if (style === 'grumpy') {
    // The brow: a short thick dash, low at the nose end.
    ctx.beginPath()
    ctx.moveTo(x - side * rx * 1.25, y - ry * 1.45)
    ctx.lineTo(x + side * rx * 0.95, y - ry * 0.8)
    ctx.lineWidth = r * 0.46
    ctx.strokeStyle = css(P.eyeDark)
    ctx.stroke()
  } else {
    // A single upper lash line gives the eye its shape at small sizes.
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, 0, Math.PI * 1.08, Math.PI * 1.92)
    ctx.lineWidth = r * 0.22
    ctx.strokeStyle = css(P.eyeDark)
    ctx.stroke()
  }
  ctx.restore()
}

/** A pair of eyes, `spread` either side of cx. */
export function eyes(ctx: Ctx, cx: number, cy: number, spread: number, r: number, style: EyeStyle | EyeOpts = 'shiny'): void {
  const opts = typeof style === 'string' ? { style } : style
  for (const side of [-1, 1]) eye(ctx, cx + side * spread, cy, r, side, opts)
}

export function blush(
  ctx: Ctx,
  cx: number,
  cy: number,
  spread: number,
  w: number,
  h: number,
  color: number = P.pinkHot,
  alpha = 0.55,
): void {
  for (const side of [-1, 1]) {
    const x = cx + side * spread
    ctx.save()
    ctx.translate(x, cy)
    ctx.scale(1, h / w)
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, w)
    grad.addColorStop(0, css(color, alpha))
    grad.addColorStop(0.55, css(color, alpha * 0.7))
    grad.addColorStop(1, css(color, 0))
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(0, 0, w, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

export type MouthStyle =
  /** Gentle closed smile. */
  | 'smile'
  /** Open smile with a tongue: delighted. */
  | 'grin'
  /** The cat "ω". */
  | 'cat'
  /** Downturned: a Grump. */
  | 'frown'
  /** A frown with one little fang poking out — cross, but still cute. */
  | 'fang'
  /** Wavy: flustered. */
  | 'wobble'
  /** Small round "o". */
  | 'oh'
  /** Tiny pout. */
  | 'pout'

export function mouth(ctx: Ctx, cx: number, cy: number, w: number, style: MouthStyle = 'smile'): void {
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(1.1, w * 0.26)
  ctx.strokeStyle = css(P.eyeDark)
  ctx.fillStyle = css(P.eyeDark)
  switch (style) {
    case 'smile':
      ctx.beginPath()
      ctx.arc(cx, cy - w * 0.45, w, Math.PI * 0.22, Math.PI * 0.78)
      ctx.stroke()
      break
    case 'grin': {
      ctx.beginPath()
      ctx.moveTo(cx - w, cy - w * 0.15)
      ctx.quadraticCurveTo(cx, cy - w * 0.05, cx + w, cy - w * 0.15)
      ctx.quadraticCurveTo(cx + w * 0.8, cy + w * 1.05, cx, cy + w * 1.05)
      ctx.quadraticCurveTo(cx - w * 0.8, cy + w * 1.05, cx - w, cy - w * 0.15)
      ctx.closePath()
      ctx.fillStyle = css(0x6a2446)
      ctx.fill()
      ctx.save()
      ctx.clip()
      ellipse(ctx, cx, cy + w * 1.05, w * 0.62, w * 0.5, 0xff8fa8)
      ctx.restore()
      ctx.lineWidth = Math.max(1, w * 0.2)
      ctx.stroke()
      break
    }
    case 'cat':
      for (const side of [-1, 1]) {
        ctx.beginPath()
        ctx.arc(cx + side * w * 0.5, cy - w * 0.12, w * 0.52, Math.PI * 0.12, Math.PI * 0.88)
        ctx.stroke()
      }
      break
    case 'frown':
      ctx.beginPath()
      ctx.arc(cx, cy + w * 0.95, w, Math.PI * 1.26, Math.PI * 1.74)
      ctx.stroke()
      break
    case 'fang': {
      ctx.beginPath()
      ctx.arc(cx, cy + w * 0.95, w, Math.PI * 1.26, Math.PI * 1.74)
      ctx.stroke()
      // The fang hangs off the mouth line, just right of centre.
      const fx = cx + w * 0.32
      const fy = cy + w * 0.02
      ctx.beginPath()
      ctx.moveTo(fx - w * 0.2, fy)
      ctx.lineTo(fx + w * 0.2, fy - w * 0.04)
      ctx.lineTo(fx + w * 0.02, fy + w * 0.4)
      ctx.closePath()
      ctx.fillStyle = css(P.white)
      ctx.fill()
      ctx.lineWidth = Math.max(0.7, w * 0.12)
      ctx.stroke()
      break
    }
    case 'wobble':
      ctx.beginPath()
      ctx.moveTo(cx - w, cy)
      ctx.quadraticCurveTo(cx - w * 0.5, cy - w * 0.6, cx, cy)
      ctx.quadraticCurveTo(cx + w * 0.5, cy + w * 0.6, cx + w, cy)
      ctx.stroke()
      break
    case 'oh':
      ellipse(ctx, cx, cy, w * 0.45, w * 0.55, 0x6a2446, P.eyeDark, Math.max(0.8, w * 0.18))
      break
    case 'pout':
      ctx.beginPath()
      ctx.moveTo(cx - w * 0.5, cy + w * 0.1)
      ctx.quadraticCurveTo(cx, cy - w * 0.4, cx + w * 0.5, cy + w * 0.1)
      ctx.stroke()
      break
  }
  ctx.restore()
}

/** Little glossy highlight, for the "squishy toy" look. */
export function gloss(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, alpha = 0.5, rot = -0.45): void {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = css(P.white)
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** A cute little nose: a rounded triangle with a gleam. */
export function nose(ctx: Ctx, cx: number, cy: number, r: number, color: number = P.eyeDark): void {
  ctx.beginPath()
  ctx.moveTo(cx - r, cy - r * 0.45)
  ctx.quadraticCurveTo(cx, cy - r * 0.8, cx + r, cy - r * 0.45)
  ctx.quadraticCurveTo(cx + r * 0.6, cy + r * 0.55, cx, cy + r * 0.6)
  ctx.quadraticCurveTo(cx - r * 0.6, cy + r * 0.55, cx - r, cy - r * 0.45)
  ctx.closePath()
  ctx.fillStyle = css(color)
  ctx.fill()
  circle(ctx, cx - r * 0.3, cy - r * 0.25, r * 0.25, P.white)
}

/** Short curved strokes for fur tufts and feather edges. */
export function tufts(ctx: Ctx, points: readonly [number, number, number][], color: number, width = 1): void {
  ctx.save()
  ctx.lineCap = 'round'
  ctx.strokeStyle = css(color)
  ctx.lineWidth = width
  for (const [x, y, a] of points) {
    ctx.beginPath()
    ctx.moveTo(x - Math.cos(a) * 1.4, y - Math.sin(a) * 1.4)
    ctx.quadraticCurveTo(x, y, x + Math.cos(a + 0.9) * 1.6, y + Math.sin(a + 0.9) * 1.6)
    ctx.stroke()
  }
  ctx.restore()
}

/**
 * Repeats `fn` in a 3x3 grid so anything drawn near an edge wraps around —
 * used to make backdrop textures seamlessly tileable.
 */
export function wrapped(ctx: Ctx, size: number, fn: () => void): void {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      ctx.save()
      ctx.translate(dx * size, dy * size)
      fn()
      ctx.restore()
    }
  }
}

/** Deterministic pseudo-random, so the art is identical every boot. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

export { css, darken, inkOf, lighten, mix, P, shade, tint }
