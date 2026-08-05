/**
 * Canvas 2D drawing helpers for the game's sprites.
 *
 * All the art is generated at boot rather than shipped as PNGs, which keeps the
 * repo free of binary assets nobody can edit and makes the whole look tweakable
 * from one palette. Sprites are drawn at {@link ART_SS}x and displayed at
 * 1/ART_SS so they stay crisp when the camera zooms in on a big tablet.
 */
import { css, darken, lighten, P } from './palette'

/** Supersample factor: draw big, display small. */
export const ART_SS = 2

export interface Canvas2D {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  /** Display size (canvas size / ART_SS). */
  size: number
}

/**
 * Creates a square canvas whose *display* size is `size` px. Drawing helpers
 * work in display units and the context is pre-scaled, so a helper never has to
 * think about ART_SS.
 */
export function makeCanvas(size: number): Canvas2D {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(size * ART_SS)
  canvas.height = Math.round(size * ART_SS)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Cuteness Overload needs a 2D canvas to draw its sprites')
  ctx.scale(ART_SS, ART_SS)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  return { canvas, ctx, size }
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
  return { canvas, ctx, size: Math.max(width, height) }
}

// ------------------------------------------------------------------ primitives

export function ellipse(
  ctx: CanvasRenderingContext2D,
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
  ctx: CanvasRenderingContext2D,
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
  return darken(color, 0.42)
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
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
export function sparkle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: number,
  alpha = 1,
): void {
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

export function heart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  fill: number,
  outline?: number,
): void {
  ctx.beginPath()
  ctx.moveTo(cx, cy + r * 0.85)
  ctx.bezierCurveTo(cx - r * 1.5, cy - r * 0.25, cx - r * 0.55, cy - r * 1.25, cx, cy - r * 0.4)
  ctx.bezierCurveTo(cx + r * 0.55, cy - r * 1.25, cx + r * 1.5, cy - r * 0.25, cx, cy + r * 0.85)
  ctx.closePath()
  ctx.fillStyle = css(fill)
  ctx.fill()
  if (outline !== undefined) {
    ctx.lineWidth = 1.4
    ctx.strokeStyle = css(outline)
    ctx.stroke()
  }
}

export function star(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  points: number,
  inner: number,
  fill: number,
  outline?: number,
): void {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * inner
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2
    const x = cx + Math.cos(a) * rad
    const y = cy + Math.sin(a) * rad
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = css(fill)
  ctx.fill()
  if (outline !== undefined) {
    ctx.lineWidth = 1.4
    ctx.strokeStyle = css(outline)
    ctx.stroke()
  }
}

// ----------------------------------------------------------------- cute faces

export type EyeStyle = 'happy' | 'wide' | 'cross' | 'sleepy' | 'sparkly'
export type MouthStyle = 'smile' | 'grin' | 'frown' | 'wobble' | 'oh' | 'cat'

export function eyes(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spread: number,
  r: number,
  style: EyeStyle = 'wide',
): void {
  for (const side of [-1, 1]) {
    const ex = cx + side * spread
    if (style === 'happy') {
      // Upturned arc — the "^^" eye.
      ctx.beginPath()
      ctx.arc(ex, cy + r * 0.35, r, Math.PI * 1.15, Math.PI * 1.85)
      ctx.lineWidth = r * 0.55
      ctx.strokeStyle = css(P.ink)
      ctx.stroke()
      continue
    }
    if (style === 'cross') {
      // Angry slanted eye: an oval with a brow cutting across it.
      ellipse(ctx, ex, cy, r * 0.75, r * 0.95, P.ink)
      ctx.beginPath()
      ctx.moveTo(ex - side * r * 1.1, cy - r * 1.35)
      ctx.lineTo(ex + side * r * 0.9, cy - r * 0.65)
      ctx.lineWidth = r * 0.5
      ctx.strokeStyle = css(P.ink)
      ctx.stroke()
      continue
    }
    if (style === 'sleepy') {
      ctx.beginPath()
      ctx.arc(ex, cy - r * 0.3, r, Math.PI * 0.15, Math.PI * 0.85)
      ctx.lineWidth = r * 0.5
      ctx.strokeStyle = css(P.ink)
      ctx.stroke()
      continue
    }
    ellipse(ctx, ex, cy, r * 0.78, r, P.ink)
    circle(ctx, ex - side * r * 0.24, cy - r * 0.34, r * 0.3, P.white)
    if (style === 'sparkly') circle(ctx, ex + side * r * 0.22, cy + r * 0.36, r * 0.16, P.white)
  }
}

export function blush(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spread: number,
  w: number,
  h: number,
  color: number = P.pinkHot,
): void {
  ctx.save()
  ctx.globalAlpha = 0.7
  for (const side of [-1, 1]) ellipse(ctx, cx + side * spread, cy, w, h, color)
  ctx.restore()
}

export function mouth(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  style: MouthStyle = 'smile',
): void {
  ctx.lineWidth = Math.max(1.2, w * 0.22)
  ctx.strokeStyle = css(P.ink)
  ctx.fillStyle = css(P.ink)
  switch (style) {
    case 'smile':
      ctx.beginPath()
      ctx.arc(cx, cy - w * 0.3, w, Math.PI * 0.2, Math.PI * 0.8)
      ctx.stroke()
      break
    case 'grin':
      ctx.beginPath()
      ctx.arc(cx, cy - w * 0.2, w, 0, Math.PI)
      ctx.closePath()
      ctx.fill()
      break
    case 'frown':
      ctx.beginPath()
      ctx.arc(cx, cy + w * 0.9, w, Math.PI * 1.25, Math.PI * 1.75)
      ctx.stroke()
      break
    case 'wobble':
      ctx.beginPath()
      ctx.moveTo(cx - w, cy)
      ctx.quadraticCurveTo(cx - w * 0.5, cy - w * 0.6, cx, cy)
      ctx.quadraticCurveTo(cx + w * 0.5, cy + w * 0.6, cx + w, cy)
      ctx.stroke()
      break
    case 'oh':
      ellipse(ctx, cx, cy, w * 0.55, w * 0.7, P.ink)
      break
    case 'cat':
      for (const side of [-1, 1]) {
        ctx.beginPath()
        ctx.arc(cx + side * w * 0.5, cy - w * 0.1, w * 0.55, Math.PI * 0.1, Math.PI * 0.9)
        ctx.stroke()
      }
      break
  }
}

/** Little glossy highlight, top-left, for the "squishy toy" look. */
export function gloss(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  alpha = 0.5,
): void {
  ctx.save()
  ctx.globalAlpha = alpha
  ellipse(ctx, cx, cy, rx, ry, P.white)
  ctx.restore()
}

/**
 * Repeats `fn` in a 3x3 grid so anything drawn near an edge wraps around —
 * used to make the meadow texture seamlessly tileable.
 */
export function wrapped(ctx: CanvasRenderingContext2D, size: number, fn: () => void): void {
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

export { css, darken, lighten, P }
