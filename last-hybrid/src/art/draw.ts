/**
 * Small canvas-2D helpers shared by every painter in `art/`.
 *
 * All of the game's art is drawn into offscreen canvases at boot rather than
 * shipped as image files, so there are no binary assets in the repo that nobody
 * can edit. Real artwork, when it arrives, is loaded from `public/sprites/`
 * instead — see [sheets.ts](./sheets.ts).
 */
import { css } from './palette'

export interface Canvas2D {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  width: number
  height: number
}

export function makeCanvas(width: number, height = width): Canvas2D {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width)
  canvas.height = Math.round(height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')
  return { canvas, ctx, width: canvas.width, height: canvas.height }
}

/** Runs `paint` with the context saved/restored around it. */
export function wrapped(ctx: CanvasRenderingContext2D, paint: () => void): void {
  ctx.save()
  paint()
  ctx.restore()
}

export function ellipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: number,
  alpha = 1,
  rotation = 0,
): void {
  ctx.beginPath()
  ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rotation, 0, Math.PI * 2)
  ctx.fillStyle = css(fill, alpha)
  ctx.fill()
}

export function circle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  fill: number,
  alpha = 1,
): void {
  ellipse(ctx, cx, cy, r, r, fill, alpha)
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  fill: number,
  alpha = 1,
): void {
  const r = Math.min(radius, Math.abs(w) / 2, Math.abs(h) / 2)
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fillStyle = css(fill, alpha)
  ctx.fill()
}

/** A filled polygon from a flat list of [x, y, x, y, ...]. */
export function poly(ctx: CanvasRenderingContext2D, points: number[], fill: number, alpha = 1): void {
  if (points.length < 6) return
  ctx.beginPath()
  ctx.moveTo(points[0], points[1])
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1])
  ctx.closePath()
  ctx.fillStyle = css(fill, alpha)
  ctx.fill()
}

/** A stroked line — used for limbs, which are just fat round-capped strokes. */
export function limb(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  color: number,
  alpha = 1,
): void {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = css(color, alpha)
  ctx.stroke()
}

/** A quadratic curve as a fat stroke — tails, vines, smoke. */
export function curve(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  cx: number,
  cy: number,
  x2: number,
  y2: number,
  width: number,
  color: number,
  alpha = 1,
): void {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.quadraticCurveTo(cx, cy, x2, y2)
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.strokeStyle = css(color, alpha)
  ctx.stroke()
}

/** The soft contact shadow every world sprite sits on. */
export function shadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry = rx * 0.42,
  alpha = 0.3,
): void {
  ellipse(ctx, cx, cy, rx, ry, 0x000000, alpha)
}

/**
 * Draws `paint` nine times, once per wrap offset, so anything crossing an edge
 * continues on the opposite one. Without this, tiled art shows its seams as a
 * grid the moment the pattern repeats across a whole area.
 */
export function tiled(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
): void {
  for (const dx of [-1, 0, 1]) {
    for (const dy of [-1, 0, 1]) {
      wrapped(ctx, () => {
        ctx.translate(dx * width, dy * height)
        paint(ctx)
      })
    }
  }
}

/**
 * Deterministic PRNG (mulberry32). Every scatter of grass tufts and pebbles
 * goes through one of these so the world looks the same on every load — a
 * player who dies and comes back shouldn't find the trees rearranged.
 */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Sine eased to 0..1, for gait cycles and idle bobbing. */
export function wave(t: number, offset = 0): number {
  return Math.sin((t + offset) * Math.PI * 2)
}
