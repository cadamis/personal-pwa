/** On-screen controls and HUD sprites. */
import { circle, css, glow, heartPath, makeCanvas, P, paintParts, shape, sparkle, type Canvas2D } from '../draw'

export type Painter = (frame: number) => Canvas2D

export const stickBase: Painter = () => {
  const c = makeCanvas(130, 1, 3)
  const { ctx } = c
  const m = 65
  const fill = ctx.createRadialGradient(m, m, 20, m, m, 60)
  fill.addColorStop(0, css(P.white, 0.05))
  fill.addColorStop(1, css(P.white, 0.2))
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.arc(m, m, 60, 0, Math.PI * 2)
  ctx.fill()
  ctx.lineWidth = 4
  ctx.strokeStyle = css(P.white, 0.55)
  ctx.beginPath()
  ctx.arc(m, m, 60, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([6, 10])
  ctx.lineWidth = 2
  ctx.strokeStyle = css(P.pink, 0.5)
  ctx.beginPath()
  ctx.arc(m, m, 50, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2
    sparkle(ctx, m + Math.cos(a) * 60, m + Math.sin(a) * 60, 7, P.white, 0.6)
  }
  return c
}

export const stickKnob: Painter = () => {
  const c = makeCanvas(64)
  const { ctx } = c
  const m = 32
  glow(ctx, m, m, 31, P.pink, 0.4)
  paintParts(ctx, [shape((g) => g.arc(m, m, 24, 0, Math.PI * 2), { cx: m, cy: m, rx: 24, ry: 24 }, P.pink, { gloss: 0.7 })], 3, P.white)
  paintParts(ctx, [shape((g) => heartPath(g, m, m + 2, 10), { cx: m, cy: m, rx: 10, ry: 10 }, P.pinkHot, { gloss: 0.6 })], 1.5, 0xc0406a)
  return c
}

/** Chevron for the off-screen boss pointer. Points along +x; rotated in use. */
export const pointer: Painter = () => {
  const c = makeCanvas(22)
  const { ctx } = c
  ctx.beginPath()
  ctx.moveTo(2.5, 2)
  ctx.lineTo(20, 11)
  ctx.lineTo(2.5, 20)
  ctx.quadraticCurveTo(7, 11, 2.5, 2)
  ctx.closePath()
  ctx.fillStyle = css(P.gold)
  ctx.fill()
  // Thin: a heavy outline on a 22px shape swallows the gold entirely.
  ctx.lineWidth = 1.4
  ctx.strokeStyle = css(P.night)
  ctx.stroke()
  circle(ctx, 8, 8, 1.4, P.white)
  return c
}
