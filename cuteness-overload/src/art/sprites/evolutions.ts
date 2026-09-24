/**
 * Art for the three newest weapons and for every evolution.
 *
 * An evolution should be recognisably its base weapon, but *more*: richer
 * colour, gold or rainbow accents, sparkles, a glow. Most of these reuse the
 * base weapon's painter with a new palette and the "shiny" switches turned on.
 */
import {
  css,
  ell,
  glow,
  heartPath,
  makeCanvas,
  makeRect,
  P,
  paintParts,
  seededRandom,
  shape,
  sparkle,
  starPath,
  type Canvas2D,
} from '../draw'
import {
  paintBeam,
  paintBoba,
  paintBubble,
  paintBurr,
  paintCarrot,
  paintCone,
  paintCupcake,
  paintFrosting,
  paintGoose,
  paintKittenRocket,
  paintStarSticker,
} from './projectiles'
import { paintNova, paintSwipe } from './fx'

export type Painter = (frame: number) => Canvas2D

// --------------------------------------------------------------- new weapons

/**
 * An aura ring, drawn with a 60px radius (the game scales it to the weapon's
 * actual reach). Soft inside, a brighter rim, and a ring of little hearts.
 */
export function paintAura(inner: number, rim: number, hearts: number): Canvas2D {
  const c = makeCanvas(126)
  const { ctx } = c
  const m = 63
  const grad = ctx.createRadialGradient(m, m, 0, m, m, 60)
  grad.addColorStop(0, css(inner, 0.05))
  grad.addColorStop(0.7, css(inner, 0.22))
  grad.addColorStop(0.93, css(rim, 0.6))
  grad.addColorStop(1, css(rim, 0))
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(m, m, 60, 0, Math.PI * 2)
  ctx.fill()
  ctx.setLineDash([3, 6])
  ctx.lineWidth = 1.6
  ctx.strokeStyle = css(P.white, 0.7)
  ctx.beginPath()
  ctx.arc(m, m, 55, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  for (let i = 0; i < hearts; i++) {
    const a = (i / hearts) * Math.PI * 2
    ctx.beginPath()
    heartPath(ctx, m + Math.cos(a) * 55, m + Math.sin(a) * 55, 3.4)
    ctx.fillStyle = css(P.white, 0.9)
    ctx.fill()
  }
  return c
}

/** A cartoon lightning bolt, top to bottom, landing at the canvas's lower middle. */
export function paintZap(core: number, edge: number, wide: boolean): Canvas2D {
  const c = makeRect(34, 130)
  const { ctx } = c
  const w = wide ? 1.4 : 1
  glow(ctx, 17, 120, 14, edge, 0.6)
  const bolt = (g: CanvasRenderingContext2D): void => {
    g.moveTo(17 + 3 * w, 0)
    g.lineTo(17 - 8 * w, 52)
    g.lineTo(17 + 1 * w, 50)
    g.lineTo(17 - 6 * w, 96)
    g.lineTo(17 + 3 * w, 94)
    g.lineTo(17, 124)
    g.lineTo(17 + 10 * w, 84)
    g.lineTo(17 + 2 * w, 86)
    g.lineTo(17 + 9 * w, 44)
    g.lineTo(17 + 1 * w, 46)
    g.lineTo(17 + 10 * w, 0)
    g.closePath()
  }
  ctx.save()
  ctx.shadowColor = css(edge, 0.9)
  ctx.shadowBlur = 8
  ctx.beginPath()
  bolt(ctx)
  ctx.fillStyle = css(edge)
  ctx.fill()
  ctx.restore()
  ctx.beginPath()
  bolt(ctx)
  ctx.lineWidth = 1.6
  ctx.strokeStyle = css(edge)
  ctx.stroke()
  ctx.save()
  ctx.translate(17, 0)
  ctx.scale(0.55, 1)
  ctx.translate(-17, 0)
  ctx.beginPath()
  bolt(ctx)
  ctx.fillStyle = css(core)
  ctx.fill()
  ctx.restore()
  sparkle(ctx, 17, 122, 6, P.white, 1)
  return c
}

/** A wobbly jelly puddle, drawn with a 30px radius. */
export function paintPuddle(colours: readonly number[]): Canvas2D {
  const c = makeCanvas(66)
  const { ctx } = c
  const m = 33
  const rnd = seededRandom(colours[0])
  const blob = (g: CanvasRenderingContext2D, r: number): void => {
    const n = 10
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2
      const wob = r * (0.88 + ((i * 7919) % 11) / 55)
      const x = m + Math.cos(a) * wob
      const y = m + Math.sin(a) * wob * 0.85
      if (i === 0) g.moveTo(x, y)
      else {
        const pa = ((i - 0.5) / n) * Math.PI * 2
        g.quadraticCurveTo(m + Math.cos(pa) * r * 1.08, m + Math.sin(pa) * r * 0.92, x, y)
      }
    }
    g.closePath()
  }
  ctx.save()
  ctx.beginPath()
  blob(ctx, 29)
  ctx.clip()
  const grad = ctx.createLinearGradient(m - 30, m - 30, m + 30, m + 30)
  colours.forEach((col, i) => grad.addColorStop(i / Math.max(1, colours.length - 1), css(col, 0.78)))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 66, 66)
  ctx.restore()
  ctx.beginPath()
  blob(ctx, 29)
  ctx.lineWidth = 2
  ctx.strokeStyle = css(colours[0], 0.95)
  ctx.stroke()
  // Glossy highlights and a few bubbles caught in the jelly.
  ctx.fillStyle = css(P.white, 0.6)
  ctx.beginPath()
  ctx.ellipse(m - 10, m - 9, 9, 4, -0.4, 0, Math.PI * 2)
  ctx.fill()
  for (let i = 0; i < 5; i++) {
    const a = rnd() * Math.PI * 2
    const d = 6 + rnd() * 16
    ctx.beginPath()
    ctx.arc(m + Math.cos(a) * d, m + Math.sin(a) * d * 0.85, 1.2 + rnd() * 1.6, 0, Math.PI * 2)
    ctx.strokeStyle = css(P.white, 0.75)
    ctx.lineWidth = 0.8
    ctx.stroke()
  }
  return c
}

export const aura: Painter = () => paintAura(0xff9ecb, 0xff6fae, 10)
export const zap: Painter = () => paintZap(0xffffff, 0xffd84a, false)
export const puddle: Painter = () => paintPuddle([0xff9a6a, 0xffc07a, 0xff8a9a])

// --------------------------------------------------------------- evolutions

export const bubbleEvo: Painter = () => paintBubble(28, 'rainbow')

/** The Rainbow Parasol's dome: a bubble of rainbow, drawn with a 40px radius. */
export const parasol: Painter = () => {
  const c = makeCanvas(84)
  const { ctx } = c
  const m = 42
  const body = ctx.createRadialGradient(m - 10, m - 12, 4, m, m, 40)
  body.addColorStop(0, css(P.white, 0.18))
  body.addColorStop(0.75, css(0xe8d8ff, 0.18))
  body.addColorStop(1, css(0xd8c8ff, 0.5))
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(m, m, 40, 0, Math.PI * 2)
  ctx.fill()
  const rim = ctx.createLinearGradient(0, 0, 84, 84)
  const bands = [P.pinkHot, P.gold, P.lemon, P.mint, P.sky, P.purple, P.pinkHot]
  bands.forEach((col, i) => rim.addColorStop(i / (bands.length - 1), css(col, 0.95)))
  ctx.strokeStyle = rim
  ctx.lineWidth = 3.6
  ctx.beginPath()
  ctx.arc(m, m, 38.5, 0, Math.PI * 2)
  ctx.stroke()
  // Umbrella ribs, faint, so it still reads as the Brolly grown up.
  ctx.strokeStyle = css(P.white, 0.4)
  ctx.lineWidth = 1
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(m, m)
    ctx.lineTo(m + Math.cos(a) * 38, m + Math.sin(a) * 38)
    ctx.stroke()
  }
  ctx.fillStyle = css(P.white, 0.8)
  ctx.beginPath()
  ctx.ellipse(m - 16, m - 18, 9, 4, -0.7, 0, Math.PI * 2)
  ctx.fill()
  for (const [x, y, r] of [
    [m + 22, m - 20, 3.2],
    [m - 26, m + 14, 2.6],
    [m + 12, m + 28, 2.2],
  ] as const) {
    sparkle(ctx, x, y, r, P.white, 0.95)
  }
  paintParts(ctx, [ell(m, m, 3.6, 3.6, P.lemon, { gloss: 0.7 })], 1.2, 0x8a5a1a)
  return c
}

export const swipeEvo: Painter = () => {
  const c = paintSwipe(P.lavender, P.gold, 10)
  const rnd = seededRandom(77)
  for (let i = 0; i < 5; i++) {
    const a = (rnd() - 0.5) * Math.PI * 0.7
    const r = 14 + rnd() * 12
    c.ctx.beginPath()
    starPath(c.ctx, 30 + Math.cos(a) * r, 30 + Math.sin(a) * r, 2.6 + rnd() * 1.5, 5, 0.5)
    c.ctx.fillStyle = css(0xfff0a0)
    c.ctx.fill()
  }
  return c
}

export const spikeEvo: Painter = () => {
  const c = paintBurr(26, 0xffc36a, 0xd8703a, 2)
  glow(c.ctx, 13, 13, 12, 0xff9a4a, 0.25)
  return c
}

export const carrotEvo: Painter = () => paintCarrot(30, 0xffcf3a, 0x7ae08a, true)
export const novaEvo: Painter = () => paintNova(P.purple, P.pink, true)
export const kittenEvo: Painter = () => paintKittenRocket(34, 0xe8dcff, P.sky, true)

export const beamEvo: Painter = () => {
  const c = paintBeam([P.pinkHot, P.pink, P.white, P.pink, P.pinkHot])
  const rnd = seededRandom(9)
  for (let i = 0; i < 10; i++) {
    c.ctx.beginPath()
    heartPath(c.ctx, 12 + rnd() * 216, 5 + rnd() * 12, 2.4 + rnd() * 1.4)
    c.ctx.fillStyle = css(P.white, 0.95)
    c.ctx.fill()
  }
  return c
}

export const cupcakeEvo: Painter = () => paintCupcake(38, 0xa8f0d8, true)
export const frostingEvo: Painter = () => paintFrosting(20, 0x9ad8ff)
export const bobaEvo: Painter = () => paintBoba(22, 0xd9a040, true)

export const stickerEvo: Painter = () => {
  const c = paintStarSticker(32, 0xffc93a)
  sparkle(c.ctx, 26, 6, 3, P.white, 1)
  sparkle(c.ctx, 5, 24, 2, P.white, 0.9)
  return c
}

export const gooseEvo: Painter = () => paintGoose(34, true)
export const coneEvo: Painter = () => paintCone(30, [0xffb3d9, 0x9a6a4a, 0xfff6e0], true)

export const auraEvo: Painter = () => {
  const c = paintAura(0xffd08a, 0xff7eb6, 14)
  // A soft golden halo, for the big warm feeling.
  glow(c.ctx, 63, 63, 40, 0xffe8a0, 0.25)
  return c
}

export const zapEvo: Painter = () => paintZap(0xfff6ff, 0xc47aff, true)
export const puddleEvo: Painter = () => paintPuddle([0xff7eb6, 0xffd166, 0x7ae08a, 0x7ad8ff, 0xb08aff])

// ------------------------------------------------------------------ extras

/** The little crown that floats over an elite Grump. */
export const crown: Painter = () => {
  const c = makeCanvas(22)
  const { ctx } = c
  glow(ctx, 11, 12, 10, P.gold, 0.45)
  paintParts(ctx, [
    shape(
      (g) => {
        g.moveTo(3, 16)
        g.lineTo(2, 6)
        g.lineTo(7, 10)
        g.lineTo(11, 3)
        g.lineTo(15, 10)
        g.lineTo(20, 6)
        g.lineTo(19, 16)
        g.quadraticCurveTo(11, 14, 3, 16)
        g.closePath()
      },
      { cx: 11, cy: 10, rx: 9, ry: 6 },
      0xffd166,
      { gloss: 0.6 },
    ),
  ], 1.3, 0x8a5a1a)
  paintParts(ctx, [ell(11, 12.5, 1.8, 1.8, 0xff6a8a, { gloss: 0.8 })], 0.8, 0x8a5a1a)
  return c
}
