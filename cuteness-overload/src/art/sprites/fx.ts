/**
 * Effects and particles: swipes, blasts, puffs, sparkles, hit flashes. Most of
 * these are drawn white-ish and soft-edged so the game can tint them per use.
 */
import {
  circle,
  css,
  ell,
  glow,
  heartPath,
  makeCanvas,
  P,
  paintParts,
  seededRandom,
  sparkle,
  type Canvas2D,
} from '../draw'

export type Painter = (frame: number) => Canvas2D

/** A crescent slash opening to the right (+x); rotated in game to face the swipe. */
export function paintSwipe(inner: number, outer: number, sparkles: number): Canvas2D {
  const c = makeCanvas(60)
  const { ctx } = c
  const cx = 30
  const cy = 30
  // A slim crescent near the rim, fat in the middle and tapering to points,
  // rather than a whole pale wedge: at the top weapon levels three of these
  // are each wider than the screen is tall, and a wedge would wash it out.
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, 28, -Math.PI * 0.46, Math.PI * 0.46)
  ctx.quadraticCurveTo(cx + 19, cy, cx + Math.cos(-Math.PI * 0.46) * 28, cy + Math.sin(-Math.PI * 0.46) * 28)
  ctx.closePath()
  const grad = ctx.createRadialGradient(cx, cy, 17, cx, cy, 28)
  grad.addColorStop(0, css(inner, 0))
  grad.addColorStop(0.35, css(inner, 0.6))
  grad.addColorStop(0.8, css(outer, 0.95))
  grad.addColorStop(1, css(P.white, 1))
  ctx.fillStyle = grad
  ctx.fill()
  ctx.restore()
  // A crisp white leading edge.
  ctx.beginPath()
  ctx.arc(cx, cy, 27, -Math.PI * 0.42, Math.PI * 0.42)
  ctx.lineWidth = 2
  ctx.strokeStyle = css(P.white, 0.95)
  ctx.stroke()
  const rnd = seededRandom(sparkles * 31 + inner)
  for (let i = 0; i < sparkles; i++) {
    const a = (rnd() - 0.5) * Math.PI * 0.8
    const r = 18 + rnd() * 10
    sparkle(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2 + rnd() * 2.5, P.white, 0.95)
  }
  return c
}

export const swipe: Painter = () => paintSwipe(P.pink, P.lemon, 5)

/** A blast ring: bright rim, soft inside, a scatter of sparkles and hearts. */
export function paintNova(rim: number, inside: number, hearts: boolean): Canvas2D {
  const c = makeCanvas(76)
  const { ctx } = c
  const m = 38
  const grad = ctx.createRadialGradient(m, m, 6, m, m, 36)
  grad.addColorStop(0, css(P.white, 0))
  grad.addColorStop(0.5, css(inside, 0.25))
  grad.addColorStop(0.82, css(rim, 0.85))
  grad.addColorStop(0.9, css(P.white, 0.95))
  grad.addColorStop(1, css(P.white, 0))
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(m, m, 36, 0, Math.PI * 2)
  ctx.fill()
  const rnd = seededRandom(rim)
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2
    const r = 20 + rnd() * 13
    const x = m + Math.cos(a) * r
    const y = m + Math.sin(a) * r
    if (hearts && i % 3 === 0) {
      ctx.beginPath()
      heartPath(ctx, x, y, 2.4 + rnd() * 1.5)
      ctx.fillStyle = css(P.white, 0.95)
      ctx.fill()
    } else {
      sparkle(ctx, x, y, 2.2 + rnd() * 2.4, P.white, 0.9)
    }
  }
  return c
}

export const nova: Painter = () => paintNova(P.pinkHot, P.lemon, true)

/** A soft pastel puff, the basic particle. Tinted per use. */
export const puff: Painter = () => {
  const c = makeCanvas(20)
  const { ctx } = c
  const grad = ctx.createRadialGradient(10, 10, 0, 10, 10, 10)
  grad.addColorStop(0, css(P.white, 1))
  grad.addColorStop(0.5, css(P.white, 0.75))
  grad.addColorStop(1, css(P.white, 0))
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(10, 10, 10, 0, Math.PI * 2)
  ctx.fill()
  return c
}

export const starDust: Painter = () => {
  const c = makeCanvas(16)
  const { ctx } = c
  glow(ctx, 8, 8, 7, P.lemon, 0.5)
  sparkle(ctx, 8, 8, 7.5, P.lemon, 1)
  sparkle(ctx, 8, 8, 3.6, P.white, 1)
  return c
}

/**
 * The twinkle a Grump leaves as it pops: a big four-point glint over a
 * smaller diagonal one, on a soft glow. The game pops it in, turns it a little
 * and shrinks it away.
 */
export const twinkle: Painter = () => {
  const c = makeCanvas(36)
  const { ctx } = c
  glow(ctx, 18, 18, 17, P.pink, 0.55)
  glow(ctx, 18, 18, 9, P.white, 0.8)
  ctx.save()
  ctx.translate(18, 18)
  ctx.rotate(Math.PI / 4)
  sparkle(ctx, 0, 0, 10, P.lavender, 0.95)
  sparkle(ctx, 0, 0, 6, P.white, 1)
  ctx.restore()
  sparkle(ctx, 18, 18, 16, P.lemon, 1)
  sparkle(ctx, 18, 18, 11, P.cream, 1)
  sparkle(ctx, 18, 18, 6.5, P.white, 1)
  circle(ctx, 8, 9, 1.4, P.white)
  circle(ctx, 28.5, 27, 1.1, P.white)
  circle(ctx, 27, 8.5, 0.9, P.lemon)
  return c
}

/** A tiny heart, for the confetti a Grump turns into. Tinted per use. */
export const heartBit: Painter = () => {
  const c = makeCanvas(12)
  const { ctx } = c
  ctx.beginPath()
  heartPath(ctx, 6, 6.5, 4.5)
  ctx.fillStyle = css(P.white)
  ctx.fill()
  return c
}

/**
 * The cartoon "poof" a Grump leaves behind. Drawn white with a lavender
 * underside so it reads on every floor; the game scales and fades it.
 */
export const poof: Painter = () => {
  const c = makeCanvas(40)
  const { ctx } = c
  const rnd = seededRandom(5)
  const parts = []
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2
    const r = 9 + rnd() * 3
    parts.push(ell(20 + Math.cos(a) * 9, 20 + Math.sin(a) * 8, r * 0.7, r * 0.62, 0xfbf8ff, { shadow: 0.8 }))
  }
  parts.push(ell(20, 20, 10, 9, 0xfbf8ff))
  paintParts(ctx, parts, 1.3, 0xb8a8d8)
  sparkle(ctx, 11, 10, 2.5, P.white, 1)
  return c
}

/** Impact flash: a small, sharp star burst. */
export const hitFlash: Painter = () => {
  const c = makeCanvas(22)
  const { ctx } = c
  glow(ctx, 11, 11, 10, P.white, 0.7)
  ctx.fillStyle = css(P.white)
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const r = i % 2 === 0 ? 10 : 3.5
    const x = 11 + Math.cos(a) * r
    const y = 11 + Math.sin(a) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
  return c
}

/** A thin shockwave ring, for bombs, boss slams and chest openings. */
export const ring: Painter = () => {
  const c = makeCanvas(64)
  const { ctx } = c
  const grad = ctx.createRadialGradient(32, 32, 22, 32, 32, 31)
  grad.addColorStop(0, css(P.white, 0))
  grad.addColorStop(0.6, css(P.white, 0.8))
  grad.addColorStop(0.8, css(P.white, 1))
  grad.addColorStop(1, css(P.white, 0))
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(32, 32, 31, 0, Math.PI * 2)
  ctx.fill()
  return c
}

/** Light rays, spun behind a chest or an evolution reveal. */
export const rays: Painter = () => {
  const c = makeCanvas(120)
  const { ctx } = c
  const m = 60
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const grad = ctx.createLinearGradient(m, m, m + Math.cos(a) * 60, m + Math.sin(a) * 60)
    grad.addColorStop(0, css(P.white, 0.7))
    grad.addColorStop(1, css(P.white, 0))
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(m, m)
    ctx.arc(m, m, 60, a - 0.12, a + 0.12)
    ctx.closePath()
    ctx.fill()
  }
  glow(ctx, m, m, 30, P.white, 0.8)
  return c
}

/** A sleepy "z", floated above dozing Grumps during Nap Time. */
export const zzz: Painter = () => {
  const c = makeCanvas(14)
  const { ctx } = c
  ctx.strokeStyle = css(0x5a7ab0)
  ctx.lineWidth = 3.4
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(3, 3.5)
  ctx.lineTo(11, 3.5)
  ctx.lineTo(3, 10.5)
  ctx.lineTo(11, 10.5)
  ctx.stroke()
  ctx.strokeStyle = css(P.white)
  ctx.lineWidth = 1.6
  ctx.stroke()
  return c
}

