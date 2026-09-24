/**
 * The Grumps of Frosty Peaks, Candy Carnival and Starlight Dreamland, plus the
 * things bosses throw.
 *
 * Same family rules as {@link ./grumps}: two frames each, facing right, glossy
 * half-lidded eyes under a cross brow, and a fang or a pout.
 */
import {
  blush,
  circle,
  css,
  ell,
  ellPath,
  eyes,
  glow,
  groundShadow,
  heartPath,
  inkedStroke,
  makeCanvas,
  mouth,
  nose,
  P,
  paintParts,
  seededRandom,
  shape,
  sparkle,
  starPath,
  tint,
  type Canvas2D,
  type Part,
} from '../draw'

export type Painter = (frame: number) => Canvas2D

// ================================================================ FROSTY PEAKS

const PENGUIN = 0x4e5a8a
const PENGUIN_BELLY = 0xf8faff
const BEAK = 0xffa640

export const penguin: Painter = (frame) => {
  const c = makeCanvas(36)
  const { ctx } = c
  const cx = 18
  const tilt = frame === 0 ? -0.08 : 0.08
  groundShadow(ctx, cx, 32, 10, 2.6)
  ctx.save()
  ctx.translate(cx, 30)
  ctx.rotate(tilt)
  ctx.translate(-cx, -30)
  paintParts(ctx, [
    ell(cx - 4, 30.5, 3.6, 1.8, BEAK),
    ell(cx + 5, 30.5, 3.6, 1.8, BEAK),
    ell(cx - 10, 20, 3, 6.5, PENGUIN, { rot: 0.35 }), // flippers
    ell(cx + 10, 20, 3, 6.5, PENGUIN, { rot: -0.35 }),
    ell(cx, 18.5, 10, 12, PENGUIN),
    shape(
      (g) => {
        g.moveTo(cx - 6.5, 14)
        g.quadraticCurveTo(cx - 9, 27, cx, 29.5)
        g.quadraticCurveTo(cx + 9, 27, cx + 6.5, 14)
        g.quadraticCurveTo(cx + 3, 9, cx + 1, 13)
        g.quadraticCurveTo(cx - 1, 10, cx - 2.5, 13)
        g.quadraticCurveTo(cx - 4, 9, cx - 6.5, 14)
        g.closePath()
      },
      { cx, cy: 21, rx: 7.5, ry: 8 },
      PENGUIN_BELLY,
      { line: 'none', shadow: 0.6 },
    ),
  ], 1.7, 0x252a4a)
  eyes(ctx, cx + 1, 15, 3.3, 2.2, { style: 'grumpy', lid: PENGUIN_BELLY, iris: 0x4a6ab0 })
  paintParts(ctx, [
    shape(
      (g) => {
        g.moveTo(cx - 1, 18)
        g.lineTo(cx + 6, 19.2)
        g.lineTo(cx - 1, 20.8)
        g.closePath()
      },
      { cx: cx + 2, cy: 19.3, rx: 3.5, ry: 1.5 },
      BEAK,
    ),
  ], 1, 0x6a3a1a)
  blush(ctx, cx + 1, 20, 6, 1.8, 1.2, P.pinkHot, 0.4)
  ctx.restore()
  return c
}

const SNOW = 0xf4f8ff

export const snowballFoe: Painter = (frame) => {
  const c = makeCanvas(36, 1, 1)
  const { ctx } = c
  const cx = 18
  const squash = frame === 1 ? 1 : 0
  groundShadow(ctx, cx, 31, 12, 3)
  paintParts(ctx, [ell(cx, 19 + squash, 13 + squash, 12 - squash, SNOW, { gloss: 0.4 })], 1.7, 0x4a5a8a)
  // Lumpy snow texture and a few glints.
  const rnd = seededRandom(frame + 3)
  ctx.fillStyle = css(0xd6e4f8, 0.8)
  for (let i = 0; i < 6; i++) {
    const a = rnd() * Math.PI * 2
    const d = 5 + rnd() * 5
    ctx.beginPath()
    ctx.arc(cx + Math.cos(a) * d, 19 + Math.sin(a) * d, 1.2 + rnd() * 1.2, 0, Math.PI * 2)
    ctx.fill()
  }
  sparkle(ctx, cx - 7, 12, 1.6, P.white, 1)
  // Twig arms.
  for (const side of [-1, 1]) {
    inkedStroke(ctx, (g) => {
      g.moveTo(cx + side * 11, 19)
      g.lineTo(cx + side * 16, 15 - squash * 2)
      g.moveTo(cx + side * 14, 16.5 - squash)
      g.lineTo(cx + side * 15.5, 19.5)
    }, 0x8a5a3a, 1, 0x3a2418)
  }
  eyes(ctx, cx + 1, 18, 4.2, 2.6, { style: 'grumpy', lid: SNOW, iris: 0x5a7ab0 })
  mouth(ctx, cx + 1, 24, 1.8, 'fang')
  blush(ctx, cx + 1, 22, 8, 2.2, 1.4, P.pinkHot, 0.45)
  return c
}

const FOX = 0xf6f7ff
const FOX_SHADE = 0xc8d4f0

export const fox: Painter = (frame) => {
  const c = makeCanvas(38, 1, 1.5)
  const { ctx } = c
  const run = frame === 0 ? 1 : -1
  groundShadow(ctx, 19, 33, 13, 2.6)
  paintParts(ctx, [
    // bushy tail, curling up behind
    shape(
      (g) => {
        g.moveTo(10, 24)
        g.bezierCurveTo(0, 26, -1, 12, 6, 9 + run)
        g.bezierCurveTo(9, 12, 7, 18, 14, 21)
        g.closePath()
      },
      { cx: 7, cy: 17, rx: 6, ry: 8 },
      FOX,
    ),
    ell(13 + run, 30, 2.4, 3, FOX_SHADE),
    ell(24 - run, 30, 2.4, 3, FOX_SHADE),
    ell(17, 24, 8.5, 6.5, FOX),
    // head
    shape(
      (g) => {
        g.moveTo(21, 9)
        g.lineTo(23, 2)
        g.lineTo(26.5, 8)
        g.lineTo(30, 3)
        g.lineTo(31, 10.5)
        g.quadraticCurveTo(37.5, 16, 33, 20)
        g.quadraticCurveTo(26, 23, 20, 18)
        g.quadraticCurveTo(18, 12, 21, 9)
        g.closePath()
      },
      { cx: 27, cy: 13, rx: 8, ry: 8 },
      FOX,
    ),
  ], 1.6, 0x3a4a7a)
  ctx.fillStyle = css(0xb8c8ee)
  ctx.beginPath()
  ctx.moveTo(22.5, 4.5)
  ctx.lineTo(24.5, 8.5)
  ctx.lineTo(22, 9)
  ctx.closePath()
  ctx.moveTo(29.5, 5)
  ctx.lineTo(29.8, 9.5)
  ctx.lineTo(27.5, 8.8)
  ctx.closePath()
  ctx.fill()
  // tail tip
  ctx.fillStyle = css(0xdde6fa)
  ctx.beginPath()
  ctx.arc(5, 11 + run, 3, 0, Math.PI * 2)
  ctx.fill()
  eyes(ctx, 27.5, 13, 2.6, 2, { style: 'grumpy', lid: FOX, iris: 0x5a8ad0 })
  nose(ctx, 34, 16, 1.2)
  blush(ctx, 28, 16.5, 4, 1.6, 1.1, P.pinkHot, 0.4)
  return c
}

const OWL = 0xeef2fb

export const owl: Painter = (frame) => {
  const c = makeCanvas(38, 1, 2.5)
  const { ctx } = c
  const cx = 19
  const up = frame === 0
  groundShadow(ctx, cx, 35, 8, 2, 0.15)
  paintParts(ctx, [
    ell(cx - 11, up ? 13 : 20, 6, 9, 0xd6e0f5, { rot: up ? 0.9 : 0.3 }),
    ell(cx + 11, up ? 13 : 20, 6, 9, 0xd6e0f5, { rot: up ? -0.9 : -0.3 }),
    ell(cx, 19, 10.5, 11.5, OWL),
    // ear tufts
    shape(
      (g) => {
        g.moveTo(cx - 8, 11)
        g.lineTo(cx - 10, 4)
        g.lineTo(cx - 4, 9)
        g.moveTo(cx + 8, 11)
        g.lineTo(cx + 10, 4)
        g.lineTo(cx + 4, 9)
      },
      { cx, cy: 8, rx: 9, ry: 3 },
      OWL,
    ),
    ell(cx, 23, 6.5, 6, 0xffffff, { line: 'none', shadow: 0.3 }),
  ], 1.6, 0x3a4a7a)
  // Speckles.
  ctx.fillStyle = css(0x8aa0cc, 0.8)
  for (const [x, y] of [
    [cx - 4, 22],
    [cx + 3, 21],
    [cx - 1, 25],
    [cx + 5, 25],
    [cx - 6, 18],
  ] as const) {
    ctx.beginPath()
    ctx.ellipse(x, y, 1.1, 0.7, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // Big owl eye discs.
  for (const side of [-1, 1]) circle(ctx, cx + side * 4.2, 15, 3.6, 0xfff6d8)
  eyes(ctx, cx, 15, 4.2, 2.3, { style: 'grumpy', lid: 0xfff6d8, iris: 0x6ab8ff })
  paintParts(ctx, [
    shape(
      (g) => {
        g.moveTo(cx - 1.5, 18)
        g.lineTo(cx + 1.5, 18)
        g.lineTo(cx, 21)
        g.closePath()
      },
      { cx, cy: 19, rx: 1.5, ry: 1.5 },
      0xffb050,
    ),
  ], 0.9, 0x6a3a1a)
  return c
}

const YETI = 0xeaf0ff

export const yeti: Painter = (frame) => {
  const c = makeCanvas(40)
  const { ctx } = c
  const cx = 20
  const stomp = frame === 1 ? 1 : 0
  groundShadow(ctx, cx, 35.5, 13, 3)
  const shag: Part[] = []
  const rnd = seededRandom(9)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    shag.push(ell(cx + Math.cos(a) * 11, 22 + Math.sin(a) * 10.5, 5, 4.5 + rnd(), YETI, { shadow: 0.5 }))
  }
  paintParts(ctx, [
    ell(cx - 6, 34 - stomp, 4, 2.4, 0xa8b8e0),
    ell(cx + 6, 34 - (1 - stomp), 4, 2.4, 0xa8b8e0),
    // little horns
    shape(
      (g) => {
        g.moveTo(cx - 8, 12)
        g.quadraticCurveTo(cx - 13, 6, cx - 10, 3)
        g.quadraticCurveTo(cx - 8, 8, cx - 5, 10)
        g.moveTo(cx + 8, 12)
        g.quadraticCurveTo(cx + 13, 6, cx + 10, 3)
        g.quadraticCurveTo(cx + 8, 8, cx + 5, 10)
      },
      { cx, cy: 7, rx: 10, ry: 5 },
      0xc9b8ff,
    ),
    ...shag,
    ell(cx, 22, 11, 10.5, YETI),
    ell(cx + 1, 21, 7.5, 6.5, 0xb8c8f0, { line: 'none', shadow: 0.4 }), // face patch
    ell(cx - 12, 25 + stomp, 3.5, 5.5, YETI, { line: 'in' }),
    ell(cx + 12, 25 + (1 - stomp), 3.5, 5.5, YETI, { line: 'in' }),
  ], 1.8, 0x3a4a7a)
  eyes(ctx, cx + 1, 19.5, 3.2, 2.3, { style: 'grumpy', lid: 0xb8c8f0, iris: 0x5a6ab0 })
  mouth(ctx, cx + 1, 24, 2.2, 'fang')
  blush(ctx, cx + 1, 22.5, 6, 1.8, 1.2, P.pinkHot, 0.45)
  return c
}

export const snowman: Painter = (frame) => {
  const c = makeCanvas(48, 1.8, 5)
  const { ctx } = c
  const cx = 24
  const bob = frame === 1 ? 1 : 0
  groundShadow(ctx, cx, 44, 15, 3.5)
  paintParts(ctx, [
    ell(cx, 35, 14, 10.5, SNOW),
    ell(cx, 23 + bob * 0.5, 11, 9, SNOW),
    ell(cx, 12 + bob, 8.5, 7.5, SNOW),
  ], 1.9, 0x4a5a8a)
  // Buttons.
  for (const y of [21, 26, 32, 37]) circle(ctx, cx, y + (y < 28 ? bob * 0.5 : 0), 1.3, 0x4a3a52)
  // Scarf, blowing.
  paintParts(ctx, [
    shape((g) => g.roundRect(cx - 9, 17 + bob * 0.7, 18, 4, 2), { cx, cy: 19, rx: 9, ry: 2 }, 0xff6a8a),
    shape(
      (g) => {
        g.moveTo(cx + 5, 19 + bob)
        g.lineTo(cx + 12, 25 + bob)
        g.lineTo(cx + 9, 26.5 + bob)
        g.lineTo(cx + 3, 21 + bob)
        g.closePath()
      },
      { cx: cx + 7, cy: 23, rx: 4, ry: 3 },
      0xff6a8a,
    ),
  ], 1.2, 0x6a1a3a)
  // Top hat.
  paintParts(ctx, [
    ell(cx, 5.5 + bob, 9, 2.2, 0x3a3050),
    shape((g) => g.roundRect(cx - 5.5, -3 + bob, 11, 9, 1.5), { cx, cy: 1.5, rx: 5.5, ry: 4.5 }, 0x4a4066),
  ], 1.2, 0x1a1428)
  ctx.fillStyle = css(0xff7eb6)
  ctx.fillRect(cx - 5.5, 3 + bob, 11, 1.8)
  eyes(ctx, cx, 11 + bob, 3.2, 2, { style: 'grumpy', lid: SNOW, iris: 0x4a6ab0 })
  paintParts(ctx, [
    shape(
      (g) => {
        g.moveTo(cx, 13 + bob)
        g.lineTo(cx + 7, 14.5 + bob)
        g.lineTo(cx, 15.8 + bob)
        g.closePath()
      },
      { cx: cx + 3, cy: 14.5, rx: 3.5, ry: 1.4 },
      0xff8a3a,
    ),
  ], 0.9, 0x6a2a0a)
  mouth(ctx, cx, 17 + bob, 1.6, 'frown')
  // Twig arms.
  for (const side of [-1, 1]) {
    inkedStroke(ctx, (g) => {
      g.moveTo(cx + side * 10, 23)
      g.lineTo(cx + side * 18, 17 - bob * 2)
      g.moveTo(cx + side * 15, 19.5)
      g.lineTo(cx + side * 17, 23)
    }, 0x8a5a3a, 1.2, 0x3a2418)
  }
  return c
}

export const waddles: Painter = (frame) => {
  const c = makeCanvas(76, 2.4)
  const { ctx } = c
  const cx = 38
  const flap = frame === 1 ? 1 : 0
  groundShadow(ctx, cx, 70, 24, 5)
  paintParts(ctx, [
    ell(cx - 9, 69, 7, 3, BEAK),
    ell(cx + 9, 69, 7, 3, BEAK),
    ell(cx - 22, 42 - flap * 4, 6, 15, PENGUIN, { rot: 0.45 + flap * 0.4 }),
    ell(cx + 22, 42 - flap * 4, 6, 15, PENGUIN, { rot: -0.45 - flap * 0.4 }),
    ell(cx, 42, 22, 27, PENGUIN),
    shape(
      (g) => {
        g.moveTo(cx - 15, 32)
        g.quadraticCurveTo(cx - 19, 62, cx, 67)
        g.quadraticCurveTo(cx + 19, 62, cx + 15, 32)
        g.quadraticCurveTo(cx + 6, 21, cx, 30)
        g.quadraticCurveTo(cx - 6, 21, cx - 15, 32)
        g.closePath()
      },
      { cx, cy: 47, rx: 16, ry: 18 },
      PENGUIN_BELLY,
      { line: 'none', shadow: 0.6 },
    ),
    // golden throat patch
    ell(cx, 30, 8, 4, 0xffd166, { line: 'none', shadow: 0.3 }),
  ], 2.1, 0x252a4a)
  // Medals.
  for (const [x, col] of [
    [cx - 7, 0xff6a8a],
    [cx - 1, 0x6ab8ff],
  ] as const) {
    ctx.fillStyle = css(col)
    ctx.fillRect(x - 1.5, 38, 3, 5)
    paintParts(ctx, [ell(x, 45, 2.6, 2.6, 0xffd166, { gloss: 0.7 })], 0.9, 0x8a5a1a)
  }
  eyes(ctx, cx + 1, 22, 7, 4.2, { style: 'grumpy', lid: PENGUIN_BELLY, iris: 0x4a6ab0 })
  paintParts(ctx, [
    shape(
      (g) => {
        g.moveTo(cx - 2, 27)
        g.lineTo(cx + 11, 29.5)
        g.lineTo(cx - 2, 32.5)
        g.closePath()
      },
      { cx: cx + 3, cy: 29.5, rx: 6, ry: 2.5 },
      BEAK,
    ),
  ], 1.3, 0x6a3a1a)
  // The admiral's bicorne hat, jauntily cross.
  paintParts(ctx, [
    shape(
      (g) => {
        g.moveTo(cx - 24, 16)
        g.quadraticCurveTo(cx - 12, 0, cx, 4)
        g.quadraticCurveTo(cx + 12, 0, cx + 24, 16)
        g.quadraticCurveTo(cx, 11, cx - 24, 16)
        g.closePath()
      },
      { cx, cy: 9, rx: 24, ry: 7 },
      0x2a2a48,
      { gloss: 0.3 },
    ),
  ], 1.6, 0x0a0a18)
  ctx.strokeStyle = css(0xffd166)
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(cx - 20, 14.5)
  ctx.quadraticCurveTo(cx, 9.5, cx + 20, 14.5)
  ctx.stroke()
  paintParts(ctx, [ell(cx, 8, 3, 3, 0xff6a8a, { gloss: 0.7 })], 1, 0x6a1a3a)
  blush(ctx, cx + 1, 29, 12, 3, 2, P.pinkHot, 0.4)
  return c
}

// =============================================================== CANDY CARNIVAL

const GUMMY = 0xff6f86

export const gummy: Painter = (frame) => {
  const c = makeCanvas(36)
  const { ctx } = c
  const cx = 18
  const step = frame === 0 ? 1 : -1
  groundShadow(ctx, cx, 33, 10, 2.6)
  // The classic gummy-bear silhouette: round ears, a big head, stubby arms
  // held out to the sides and two little feet.
  paintParts(ctx, [
    ell(cx - 5, 30 - (step > 0 ? 1 : 0), 3.6, 2.8, GUMMY),
    ell(cx + 5, 30 - (step < 0 ? 1 : 0), 3.6, 2.8, GUMMY),
    ell(cx - 10.5, 20 + step, 3.4, 2.4, GUMMY, { rot: -0.5 }),
    ell(cx + 10.5, 20 - step, 3.4, 2.4, GUMMY, { rot: 0.5 }),
    ell(cx, 23.5, 8, 7.5, GUMMY, { gloss: 0.5 }),
    ell(cx - 7.5, 6.5, 3, 3, GUMMY),
    ell(cx + 7.5, 6.5, 3, 3, GUMMY),
    ell(cx, 12.5, 9, 7.5, GUMMY, { gloss: 0.8 }),
  ], 1.6, 0x7a1a3a)
  // Gummy translucency: a bright glow inside the tummy.
  ctx.save()
  ctx.globalAlpha = 0.4
  ctx.beginPath()
  ellPath(cx + 1, 24.5, 4.5, 4.5)(ctx)
  ctx.fillStyle = 'rgb(255,220,230)'
  ctx.fill()
  ctx.restore()
  eyes(ctx, cx + 1, 11.5, 3.4, 2.2, { style: 'grumpy', lid: GUMMY, iris: 0x9a1a4a })
  ell2(ctx, cx + 1, 15.2, 2.6, 1.9, tint(GUMMY, 0.35))
  nose(ctx, cx + 1, 14.5, 1.1, 0x7a1a3a)
  mouth(ctx, cx + 1, 16.6, 1.4, 'pout')
  return c
}

function ell2(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: number): void {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = css(color)
  ctx.fill()
}

const JELLY = 0x9ae66a

export const jelly: Painter = (frame) => {
  const c = makeCanvas(36)
  const { ctx } = c
  const cx = 18
  const squish = frame === 1
  const w = squish ? 13 : 11
  const top = squish ? 11 : 8
  groundShadow(ctx, cx, 31, w + 1, 3)
  const body = shape(
    (g) => {
      g.moveTo(cx - w, 29)
      g.quadraticCurveTo(cx - w - 1, top, cx - w + 3, top)
      g.lineTo(cx + w - 3, top)
      g.quadraticCurveTo(cx + w + 1, top, cx + w, 29)
      g.quadraticCurveTo(cx, 31, cx - w, 29)
      g.closePath()
    },
    { cx, cy: (top + 29) / 2, rx: w, ry: (29 - top) / 2 },
    JELLY,
    { gloss: 0.7 },
  )
  paintParts(ctx, [body], 1.7, 0x2a6a2a)
  // Sugar crystals: it's a *sour* jelly.
  const rnd = seededRandom(5)
  for (let i = 0; i < 12; i++) {
    const x = cx - w + 2 + rnd() * (w * 2 - 4)
    const y = top + 2 + rnd() * (29 - top - 4)
    ctx.fillStyle = css(P.white, 0.85)
    ctx.fillRect(x, y, 1.1, 1.1)
  }
  const faceY = squish ? 20 : 19
  eyes(ctx, cx + 1, faceY, 4.2, 2.6, { style: 'grumpy', lid: JELLY, iris: 0x3a8a2a })
  mouth(ctx, cx + 1, faceY + 5, 2, 'wobble')
  return c
}

export const candyCorn: Painter = (frame) => {
  const c = makeCanvas(34, 1, 1.5)
  const { ctx } = c
  const cx = 17
  const hop = frame === 1 ? -2 : 0
  groundShadow(ctx, cx, 31, 8 + hop * 0.5, 2.4)
  const tri = (g: CanvasRenderingContext2D): void => {
    g.moveTo(cx, 3 + hop)
    g.quadraticCurveTo(cx + 3, 3 + hop, cx + 11, 25 + hop)
    g.quadraticCurveTo(cx, 30 + hop, cx - 11, 25 + hop)
    g.quadraticCurveTo(cx - 3, 3 + hop, cx, 3 + hop)
    g.closePath()
  }
  paintParts(ctx, [
    ell(cx - 4, 30, 2.4, 1.6, 0xd08a3a),
    ell(cx + 4, 30, 2.4, 1.6, 0xd08a3a),
    shape(tri, { cx, cy: 17 + hop, rx: 11, ry: 13 }, 0xfff6e6),
  ], 1.6, 0x6a3a1a)
  // Bands: white tip, orange middle, yellow base.
  ctx.save()
  ctx.beginPath()
  tri(ctx)
  ctx.clip()
  ctx.fillStyle = css(0xffa040)
  ctx.fillRect(cx - 12, 11 + hop, 24, 9)
  ctx.fillStyle = css(0xffd84a)
  ctx.fillRect(cx - 12, 20 + hop, 24, 12)
  ctx.fillStyle = css(0xffffff, 0.35)
  ctx.beginPath()
  ctx.ellipse(cx - 4, 12 + hop, 2, 7, 0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  eyes(ctx, cx + 0.5, 17 + hop, 3.2, 2.1, { style: 'grumpy', lid: 0xffa040, iris: 0x8a4a1a })
  mouth(ctx, cx + 0.5, 22 + hop, 1.6, 'fang')
  return c
}

const COTTON = 0xffb8dc

export const cotton: Painter = (frame) => {
  const c = makeCanvas(40)
  const { ctx } = c
  const cx = 20
  const puff = frame === 1 ? 0.8 : 0
  groundShadow(ctx, cx, 37, 10, 2.4, 0.15)
  inkedStroke(ctx, (g) => {
    g.moveTo(cx, 26)
    g.lineTo(cx, 36)
  }, 0xf6e6d0, 1.6, 0x6a4a3a)
  const puffs: Part[] = []
  const rnd = seededRandom(21)
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2
    puffs.push(ell(cx + Math.cos(a) * 9, 16 + Math.sin(a) * 7.5, 6 + rnd() + puff, 5.5 + rnd(), i % 3 === 0 ? 0xc6b0ff : COTTON, { shadow: 0.5 }))
  }
  puffs.push(ell(cx, 16, 10, 8.5, COTTON))
  paintParts(ctx, puffs, 1.6, 0x7a3a6a)
  eyes(ctx, cx + 1, 15.5, 4, 2.5, { style: 'grumpy', lid: COTTON, iris: 0xb04a8a })
  mouth(ctx, cx + 1, 20.5, 2, 'pout')
  sparkle(ctx, cx - 9, 9, 1.8, P.white, 0.9)
  return c
}

export const peppermint: Painter = (frame) => {
  const c = makeCanvas(32)
  const { ctx } = c
  const m = 16
  groundShadow(ctx, m, 29, 10, 2.4)
  paintParts(ctx, [ell(m, 15, 11.5, 11.5, 0xfff8fa, { gloss: 0.5 })], 1.6, 0x7a1a2a)
  // Red swirls, rotated a step between frames so it reads as rolling.
  ctx.save()
  ctx.beginPath()
  ctx.arc(m, 15, 11.5, 0, Math.PI * 2)
  ctx.clip()
  ctx.translate(m, 15)
  ctx.rotate(frame * (Math.PI / 6))
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(6, -3, 12, -1)
    ctx.lineTo(12, 5)
    ctx.quadraticCurveTo(6, 2, 0, 0)
    ctx.fillStyle = css(0xff4a5e)
    ctx.fill()
  }
  ctx.restore()
  paintParts(ctx, [ell(m, 15, 4.5, 4.5, 0xfff8fa, { line: 'in' })], 1, 0x7a1a2a)
  eyes(ctx, m + 0.5, 14.5, 1.8, 1.5, { style: 'grumpy', lid: 0xfff8fa, iris: 0xa01a2a })
  return c
}

export const gumball: Painter = (frame) => {
  const c = makeCanvas(48, 1.8, 1)
  const { ctx } = c
  const cx = 24
  const rattle = frame === 1 ? 1 : 0
  groundShadow(ctx, cx, 45, 15, 3.4)
  paintParts(ctx, [
    // base
    shape(
      (g) => {
        g.moveTo(cx - 11, 30)
        g.lineTo(cx + 11, 30)
        g.lineTo(cx + 13, 44)
        g.lineTo(cx - 13, 44)
        g.closePath()
      },
      { cx, cy: 37, rx: 12, ry: 7 },
      0xff5a6e,
    ),
    ell(cx, 30, 13, 3.5, 0xe0485a),
    // glass dome
    ell(cx, 18 + rattle * 0.5, 14, 13.5, 0xe8f6ff, { gloss: 0.9, shadow: 0.3 }),
    ell(cx, 4 + rattle * 0.5, 4, 2.4, 0xff5a6e),
  ], 1.9, 0x6a1a2a)
  // Gumballs inside, jostling between frames.
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(cx, 18 + rattle * 0.5, 13, 12.5, 0, 0, Math.PI * 2)
  ctx.clip()
  const rnd = seededRandom(33 + frame)
  const cols = [0xff6a8a, 0x6ab8ff, 0xffd166, 0x7ae08a, 0xc9a0ff]
  for (let i = 0; i < 16; i++) {
    const x = cx - 11 + rnd() * 22
    const y = 16 + rnd() * 14
    ctx.beginPath()
    ctx.arc(x, y, 2.6, 0, Math.PI * 2)
    ctx.fillStyle = css(cols[i % cols.length])
    ctx.fill()
    ctx.fillStyle = css(P.white, 0.6)
    ctx.beginPath()
    ctx.arc(x - 0.8, y - 0.8, 0.8, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
  // Glass shine over the top.
  ctx.save()
  ctx.globalAlpha = 0.6
  ctx.fillStyle = css(P.white)
  ctx.beginPath()
  ctx.ellipse(cx - 6, 10, 3, 5, 0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  // The grumpy face lives on the base, like a coin slot with opinions.
  eyes(ctx, cx, 35, 4, 2.2, { style: 'grumpy', lid: 0xff5a6e, iris: 0x8a1a2a })
  mouth(ctx, cx, 40, 1.8, 'fang')
  return c
}

const GINGER = 0xd48a4e

export const gingerbread: Painter = (frame) => {
  const c = makeCanvas(76, 2.5)
  const { ctx } = c
  const cx = 38
  const swing = frame === 1 ? 1 : -1
  groundShadow(ctx, cx, 71, 22, 5)
  paintParts(ctx, [
    ell(cx - 11, 63, 7.5, 9, GINGER, { rot: 0.25 - swing * 0.08 }),
    ell(cx + 11, 63, 7.5, 9, GINGER, { rot: -0.25 - swing * 0.08 }),
    ell(cx - 23, 38 + swing * 3, 7, 12, GINGER, { rot: 0.9 }),
    ell(cx + 23, 38 - swing * 3, 7, 12, GINGER, { rot: -0.9 }),
    ell(cx, 44, 18, 20, GINGER),
    ell(cx, 20, 16, 15, GINGER),
  ], 2.1, 0x5a2a12)
  // Icing squiggles on the wrists and ankles.
  ctx.strokeStyle = css(0xfffaf6)
  ctx.lineWidth = 1.6
  ctx.lineCap = 'round'
  const squiggle = (x: number, y: number, len: number, rot: number): void => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.beginPath()
    for (let i = 0; i <= 8; i++) {
      const t = i / 8
      const px = (t - 0.5) * len
      const py = Math.sin(t * Math.PI * 4) * 1.4
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()
    ctx.restore()
  }
  squiggle(cx - 28, 45 + swing * 3, 9, 0.9 + Math.PI / 2)
  squiggle(cx + 28, 45 - swing * 3, 9, -0.9 + Math.PI / 2)
  squiggle(cx - 12, 69, 10, 0)
  squiggle(cx + 12, 69, 10, 0)
  // Gumdrop buttons.
  for (const [y, col] of [
    [36, 0xff6a8a],
    [44, 0x7ae08a],
    [52, 0x6ab8ff],
  ] as const) {
    paintParts(ctx, [ell(cx, y, 3.2, 3, col, { gloss: 0.8 })], 1, 0x5a2a12)
  }
  eyes(ctx, cx + 1, 18, 6.5, 3.8, { style: 'grumpy', lid: GINGER, iris: 0x3a1a0a })
  mouth(ctx, cx + 1, 26, 4, 'fang')
  blush(ctx, cx + 1, 23, 10, 3, 2, 0xff6a8a, 0.55)
  // A little icing crown of disapproval.
  ctx.strokeStyle = css(0xfffaf6)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx - 10, 8)
  ctx.lineTo(cx - 6, 4)
  ctx.lineTo(cx - 2, 8)
  ctx.lineTo(cx + 2, 4)
  ctx.lineTo(cx + 6, 8)
  ctx.lineTo(cx + 10, 4)
  ctx.stroke()
  return c
}

// ========================================================== STARLIGHT DREAMLAND

const STAR = 0xffe070

export const starFoe: Painter = (frame) => {
  const c = makeCanvas(36)
  const { ctx } = c
  const m = 18
  groundShadow(ctx, m, 33, 8, 2, 0.15)
  glow(ctx, m, 17, 16, STAR, frame === 0 ? 0.35 : 0.5)
  paintParts(ctx, [
    shape((g) => starPath(g, m, 17, 14, 5, 0.55, frame * 0.08), { cx: m, cy: 17, rx: 13, ry: 13 }, STAR, { gloss: 0.5 }),
  ], 1.7, 0x7a4a1a)
  eyes(ctx, m + 0.5, 17, 3.4, 2.3, { style: 'grumpy', lid: STAR, iris: 0xb07a1a })
  mouth(ctx, m + 0.5, 22, 1.7, 'pout')
  blush(ctx, m + 0.5, 20.5, 6, 1.8, 1.2, P.pinkHot, 0.45)
  if (frame === 1) sparkle(ctx, m + 11, 6, 2.2, P.white, 1)
  return c
}

const SHEEP_WOOL = 0xe6dcff

export const sheep: Painter = (frame) => {
  const c = makeCanvas(40, 1, 3)
  const { ctx } = c
  const cx = 20
  const bob = frame === 1 ? 1.2 : 0
  groundShadow(ctx, cx, 37, 10, 2.4, 0.15)
  const wool: Part[] = []
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    wool.push(ell(cx - 2 + Math.cos(a) * 10, 21 + bob + Math.sin(a) * 7.5, 5, 4.6, SHEEP_WOOL, { shadow: 0.5 }))
  }
  wool.push(ell(cx - 2, 21 + bob, 10, 7.5, SHEEP_WOOL))
  paintParts(ctx, [
    ell(cx - 7, 31 + bob, 1.8, 3, 0x5a4a7a),
    ell(cx + 3, 31 + bob, 1.8, 3, 0x5a4a7a),
    ...wool,
    ell(cx + 10, 16 + bob, 6, 6.5, 0x6a5a8e), // face
    ell(cx + 5, 12 + bob, 3, 1.8, 0x6a5a8e, { rot: -0.6 }), // ear
  ], 1.6, 0x3a2a5a)
  // A nightcap, obviously.
  paintParts(ctx, [
    shape(
      (g) => {
        g.moveTo(cx + 4, 12 + bob)
        g.quadraticCurveTo(cx + 12, 2 + bob, cx + 20, 6 + bob)
        g.quadraticCurveTo(cx + 15, 9 + bob, cx + 15.5, 12 + bob)
        g.closePath()
      },
      { cx: cx + 12, cy: 8 + bob, rx: 7, ry: 4 },
      0x7ab0ff,
    ),
  ], 1.2, 0x2a3a6a)
  circle(ctx, cx + 20, 6 + bob, 1.8, P.white, 0x2a3a6a, 0.8)
  eyes(ctx, cx + 11, 16 + bob, 2.2, 1.8, { style: 'sleepy', lid: 0x6a5a8e, iris: 0xc0a0ff })
  mouth(ctx, cx + 11, 19.5 + bob, 1.2, 'pout')
  return c
}

export const ufo: Painter = (frame) => {
  const c = makeCanvas(40)
  const { ctx } = c
  const cx = 20
  groundShadow(ctx, cx, 37, 11, 2.2, 0.15)
  // A cone of light underneath.
  ctx.save()
  ctx.globalAlpha = frame === 0 ? 0.25 : 0.4
  const beam = ctx.createLinearGradient(0, 24, 0, 37)
  beam.addColorStop(0, css(0xb0ff9a, 0.8))
  beam.addColorStop(1, css(0xb0ff9a, 0))
  ctx.fillStyle = beam
  ctx.beginPath()
  ctx.moveTo(cx - 5, 24)
  ctx.lineTo(cx + 5, 24)
  ctx.lineTo(cx + 10, 37)
  ctx.lineTo(cx - 10, 37)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  paintParts(ctx, [
    ell(cx, 13, 8, 8, 0xd8f4ff, { gloss: 0.9, shadow: 0.3 }), // dome
    ell(cx, 21, 16, 5.5, 0xb0a6d8, { gloss: 0.4 }), // saucer
  ], 1.6, 0x2a2a5a)
  // The pilot: a small green grump.
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(cx, 13, 7.5, 7.5, 0, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = css(0x9ae66a)
  ctx.beginPath()
  ctx.ellipse(cx + 0.5, 16, 5, 5.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  eyes(ctx, cx + 1, 14.5, 2, 1.5, { style: 'grumpy', lid: 0x9ae66a, iris: 0x3a8a2a })
  // Blinking lights.
  const cols = [0xff6a8a, 0xffd166, 0x6ab8ff, 0x7ae08a]
  for (let i = 0; i < 5; i++) {
    const on = (i + frame) % 2 === 0
    circle(ctx, cx - 11 + i * 5.5, 22, 1.3, on ? cols[i % cols.length] : 0x5a5080)
  }
  return c
}

const PUP = 0x9ab8ff

export const cometPup: Painter = (frame) => {
  const c = makeCanvas(40)
  const { ctx } = c
  const run = frame === 0 ? 1 : -1
  groundShadow(ctx, 22, 34, 11, 2.6)
  // Comet tail streaming behind.
  const tail = ctx.createLinearGradient(0, 20, 14, 20)
  tail.addColorStop(0, css(0xffd166, 0))
  tail.addColorStop(1, css(0xffd166, 0.9))
  ctx.fillStyle = tail
  ctx.beginPath()
  ctx.moveTo(15, 14)
  ctx.quadraticCurveTo(0, 18 + run, 2, 26)
  ctx.quadraticCurveTo(8, 23, 15, 26)
  ctx.closePath()
  ctx.fill()
  sparkle(ctx, 5, 21 + run, 2, P.white, 0.9)
  paintParts(ctx, [
    ell(16 + run, 31, 2.4, 3, 0x6a88d8),
    ell(27 - run, 31, 2.4, 3, 0x6a88d8),
    ell(21, 24, 9, 6.5, PUP),
    ell(29, 15, 7.5, 7, PUP), // head
    ell(24.5, 11, 2.8, 5, 0x6a88d8, { rot: -0.5 }), // floppy ear
    ell(33, 17.5, 3.5, 2.8, 0xd8e4ff, { line: 'in' }), // snout
  ], 1.6, 0x2a3a7a)
  eyes(ctx, 29.5, 14, 2.4, 1.9, { style: 'grumpy', lid: PUP, iris: 0x3a5ab0 })
  nose(ctx, 35.5, 16.5, 1.1)
  // A star-shaped patch on the flank.
  ctx.beginPath()
  starPath(ctx, 19, 23, 2.8, 5, 0.5)
  ctx.fillStyle = css(0xffe070)
  ctx.fill()
  return c
}

export const shootingStar: Painter = (frame) => {
  const c = makeCanvas(40)
  const { ctx } = c
  const trail = ctx.createLinearGradient(2, 20, 24, 20)
  trail.addColorStop(0, css(0xb9a6ff, 0))
  trail.addColorStop(1, css(0xffe8a0, 0.95))
  ctx.fillStyle = trail
  ctx.beginPath()
  ctx.moveTo(24, 13)
  ctx.quadraticCurveTo(4, 18 + frame * 2, 2, 20)
  ctx.quadraticCurveTo(4, 22 - frame * 2, 24, 27)
  ctx.closePath()
  ctx.fill()
  for (let i = 0; i < 3; i++) sparkle(ctx, 8 + i * 5, 20 + (i % 2 ? 3 : -3) * (frame ? 1 : -1), 1.6, P.white, 0.9)
  glow(ctx, 28, 20, 11, STAR, 0.45)
  paintParts(ctx, [
    shape((g) => starPath(g, 28, 20, 9.5, 5, 0.55, 0.3 + frame * 0.1), { cx: 28, cy: 20, rx: 9, ry: 9 }, STAR, { gloss: 0.5 }),
  ], 1.5, 0x7a4a1a)
  eyes(ctx, 28.5, 20, 2.3, 1.7, { style: 'grumpy', lid: STAR, iris: 0xb07a1a })
  return c
}

const URSA = 0x5c5ab0

export const ursa: Painter = (frame) => {
  const c = makeCanvas(50, 1.9)
  const { ctx } = c
  const cx = 25
  const twinkle = frame
  groundShadow(ctx, cx, 46, 15, 3.4, 0.2)
  glow(ctx, cx, 26, 24, 0x8a7aff, 0.3)
  paintParts(ctx, [
    ell(cx - 8, 42, 5, 3.5, URSA),
    ell(cx + 8, 42, 5, 3.5, URSA),
    ell(cx - 11, 10, 5, 5, URSA),
    ell(cx + 11, 10, 5, 5, URSA),
    ell(cx, 30, 15, 13, URSA),
    ell(cx, 17, 12.5, 11, URSA),
    ell(cx + 1, 21, 6, 4.5, 0x5a56a0, { line: 'none', shadow: 0.3 }), // snout
  ], 1.9, 0x14123a)
  // The constellation: stars on the body, joined by faint lines.
  const points: [number, number][] = [
    [cx - 9, 27],
    [cx - 3, 33],
    [cx + 5, 29],
    [cx + 10, 35],
    [cx - 6, 12],
    [cx + 8, 9],
  ]
  ctx.strokeStyle = css(0xc8c0ff, 0.6)
  ctx.lineWidth = 0.7
  ctx.beginPath()
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
  ctx.stroke()
  points.forEach(([x, y], i) => sparkle(ctx, x, y, (i + twinkle) % 2 === 0 ? 2.4 : 1.6, 0xfff6c8, 1))
  eyes(ctx, cx + 1, 16, 4.2, 2.6, { style: 'grumpy', lid: URSA, iris: 0xb0a0ff })
  nose(ctx, cx + 1, 20.5, 1.6, 0x14123a)
  mouth(ctx, cx + 1, 23.5, 1.8, 'fang')
  return c
}

const KING = 0x9b7ae0

export const king: Painter = (frame) => {
  const c = makeCanvas(80, 2.6, 2)
  const { ctx } = c
  const cx = 40
  const bob = frame === 1 ? 1.5 : 0
  groundShadow(ctx, cx, 75, 26, 5, 0.25)
  // Royal cape, sweeping out behind.
  paintParts(ctx, [
    shape(
      (g) => {
        g.moveTo(cx - 20, 30 + bob)
        g.quadraticCurveTo(cx - 40, 58, cx - 30, 74)
        g.quadraticCurveTo(cx, 68, cx + 30, 74)
        g.quadraticCurveTo(cx + 40, 58, cx + 20, 30 + bob)
        g.closePath()
      },
      { cx, cy: 55, rx: 34, ry: 22 },
      0xd6385e,
    ),
  ], 2.1, 0x4a0a1e)
  // Ermine trim.
  ctx.fillStyle = css(0xfffaf6)
  for (let i = 0; i < 9; i++) {
    const t = i / 8
    const x = cx - 30 + t * 60
    const y = 72 - Math.sin(t * Math.PI) * 4
    ctx.beginPath()
    ctx.arc(x, y, 3.2, 0, Math.PI * 2)
    ctx.fill()
  }
  paintParts(ctx, [
    ell(cx - 12, 70, 7, 4, 0x6a4ab0),
    ell(cx + 12, 70, 7, 4, 0x6a4ab0),
    ell(cx, 44 + bob, 26, 26, KING, { gloss: 0.3 }),
    ell(cx, 50 + bob, 15, 14, 0xc4b0ff, { line: 'none', shadow: 0.5 }), // tummy
    ell(cx - 26, 46 + bob, 6.5, 9, KING, { line: 'in', rot: 0.4 }),
  ], 2.2, 0x2a1a4a)
  // Sceptre in the right paw.
  inkedStroke(ctx, (g) => {
    g.moveTo(cx + 26, 58 + bob)
    g.lineTo(cx + 33, 26 + bob)
  }, 0xffd166, 2.4, 0x6a4a0a)
  glow(ctx, cx + 34, 22 + bob, 9, 0xff7eb6, 0.5)
  paintParts(ctx, [
    shape((g) => heartPath(g, cx + 34, 22 + bob, 5.5), { cx: cx + 34, cy: 22 + bob, rx: 5, ry: 5 }, 0xff7eb6, { gloss: 0.8 }),
    ell(cx + 26, 47 + bob, 6.5, 9, KING, { line: 'in', rot: -0.4 }),
  ], 1.6, 0x2a1a4a)
  eyes(ctx, cx + 1, 38 + bob, 8.5, 5, { style: 'grumpy', lid: KING, iris: 0xffd166 })
  mouth(ctx, cx + 1, 48 + bob, 5, 'fang')
  blush(ctx, cx + 1, 45 + bob, 14, 3.5, 2.2, P.pinkHot, 0.5)
  // The Crown of All Grumps.
  paintParts(ctx, [
    shape(
      (g) => {
        g.moveTo(cx - 16, 22 + bob)
        g.lineTo(cx - 18, 6 + bob)
        g.lineTo(cx - 9, 14 + bob)
        g.lineTo(cx, 2 + bob)
        g.lineTo(cx + 9, 14 + bob)
        g.lineTo(cx + 18, 6 + bob)
        g.lineTo(cx + 16, 22 + bob)
        g.quadraticCurveTo(cx, 19 + bob, cx - 16, 22 + bob)
        g.closePath()
      },
      { cx, cy: 14 + bob, rx: 17, ry: 10 },
      0xffd166,
      { gloss: 0.6 },
    ),
  ], 1.7, 0x6a4a0a)
  for (const [x, col] of [
    [-10, 0xff6a8a],
    [0, 0x6ab8ff],
    [10, 0x7ae08a],
  ] as const) {
    paintParts(ctx, [ell(cx + x, 17 + bob, 2.4, 2.4, col, { gloss: 0.8 })], 0.9, 0x6a4a0a)
  }
  sparkle(ctx, cx + 17, 4 + bob, 3, P.white, 1)
  sparkle(ctx, cx - 20, 30, frame === 0 ? 2 : 3, P.white, 0.8)
  return c
}

// ================================================================ enemy shots

/** Every enemy shot shares a dark outline and a warm glow, so kids learn "that's the dangerous stuff". */
function dangerGlow(ctx: CanvasRenderingContext2D, m: number, r: number): void {
  glow(ctx, m, m, r, 0xff5a7a, 0.3)
}

export const fluffShot: Painter = () => {
  const c = makeCanvas(18)
  const { ctx } = c
  dangerGlow(ctx, 9, 9)
  const parts: Part[] = []
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    parts.push(ell(9 + Math.cos(a) * 3.2, 9 + Math.sin(a) * 3.2, 3, 3, 0xc7c2d8, { shadow: 0.4 }))
  }
  parts.push(ell(9, 9, 4, 4, 0xd8d4e6))
  paintParts(ctx, parts, 1.2, 0x3a3456)
  eyes(ctx, 9, 9, 1.6, 1, { style: 'dot' })
  return c
}

export const bananaShot: Painter = () => {
  const c = makeCanvas(20)
  const { ctx } = c
  dangerGlow(ctx, 10, 10)
  paintParts(ctx, [
    shape(
      (g) => {
        g.moveTo(3, 12)
        g.quadraticCurveTo(10, 2, 17, 8)
        g.quadraticCurveTo(10, 8, 3, 12)
        g.closePath()
      },
      { cx: 10, cy: 8, rx: 7, ry: 3 },
      0xffe066,
    ),
  ], 1.4, 0x6a4a0a)
  circle(ctx, 16.8, 7.8, 1, 0x5a3a1a)
  return c
}

export const snowflakeShot: Painter = () => {
  const c = makeCanvas(18)
  const { ctx } = c
  glow(ctx, 9, 9, 9, 0x6ab8ff, 0.4)
  ctx.lineCap = 'round'
  const arms = (width: number, color: string): void => {
    ctx.strokeStyle = color
    ctx.lineWidth = width
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      const ex = 9 + Math.cos(a) * 6.5
      const ey = 9 + Math.sin(a) * 6.5
      ctx.beginPath()
      ctx.moveTo(9, 9)
      ctx.lineTo(ex, ey)
      const bx = 9 + Math.cos(a) * 4
      const by = 9 + Math.sin(a) * 4
      ctx.moveTo(bx, by)
      ctx.lineTo(bx + Math.cos(a + 0.9) * 2, by + Math.sin(a + 0.9) * 2)
      ctx.moveTo(bx, by)
      ctx.lineTo(bx + Math.cos(a - 0.9) * 2, by + Math.sin(a - 0.9) * 2)
      ctx.stroke()
    }
  }
  arms(3.4, css(0x1f3a7a))
  arms(1.6, css(0xd8f0ff))
  circle(ctx, 9, 9, 1.8, 0xffffff, 0x1f3a7a, 0.8)
  return c
}

export const gumballShot: Painter = () => {
  const c = makeCanvas(18)
  const { ctx } = c
  dangerGlow(ctx, 9, 9)
  paintParts(ctx, [ell(9, 9, 5.5, 5.5, 0xff4a7a, { gloss: 0.9 })], 1.3, 0x5a0a2a)
  return c
}

export const sprinkleShot: Painter = () => {
  const c = makeCanvas(18)
  const { ctx } = c
  dangerGlow(ctx, 9, 9)
  ctx.save()
  ctx.translate(9, 9)
  ctx.rotate(0.6)
  paintParts(ctx, [shape((g) => g.roundRect(-6, -2.2, 12, 4.4, 2.2), { cx: 0, cy: 0, rx: 6, ry: 2.2 }, 0xff5aa8, { gloss: 0.8 })], 1.2, 0x5a0a3a)
  ctx.restore()
  return c
}

export const starShot: Painter = () => {
  const c = makeCanvas(18)
  const { ctx } = c
  glow(ctx, 9, 9, 9, 0xb07aff, 0.45)
  paintParts(ctx, [
    shape((g) => starPath(g, 9, 9, 6.5, 4, 0.42), { cx: 9, cy: 9, rx: 6, ry: 6 }, 0xd6b0ff, { gloss: 0.6 }),
  ], 1.3, 0x2a1a5a)
  return c
}

