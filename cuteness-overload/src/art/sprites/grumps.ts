/**
 * The Grumps of the meadow and the forest.
 *
 * Every Grump has two frames that the game loops (a waddle, a wing-beat, a
 * squish), and faces right so the game can flip it to face where it's going.
 * They share a vocabulary so they read as one family of cranky creatures:
 * half-lidded glossy eyes under a cross brow, a pout or a single fang, and
 * slightly muddier pastels than the friends.
 */
import {
  blush,
  ell,
  ellPath,
  eyes,
  groundShadow,
  inkedStroke,
  makeCanvas,
  mouth,
  nose,
  P,
  paintParts,
  seededRandom,
  shade,
  shape,
  sparkle,
  tint,
  tufts,
  type Canvas2D,
  type Part,
} from '../draw'

export type Painter = (frame: number) => Canvas2D

const GRUMP_INK = 0x3f2a4c

// --------------------------------------------------------------- Grumpy Snail

const SNAIL = 0x9fcf8e
const SHELL = 0xd9925a

export const snail: Painter = (frame) => {
  const c = makeCanvas(38)
  const { ctx } = c
  const stretch = frame === 0 ? 1 : 0
  const cy = 26
  groundShadow(ctx, 19, cy + 4.5, 15, 3.2)
  const headX = 27 + stretch * 1.5
  paintParts(ctx, [
    // the foot, longer on the stretched frame
    shape(
      (g) => {
        g.moveTo(5 - stretch * 1.5, cy + 3)
        g.quadraticCurveTo(4 - stretch, cy - 1.5, 10, cy - 2)
        g.lineTo(headX, cy - 3)
        g.quadraticCurveTo(headX + 7, cy + 1, headX + 3, cy + 3.8)
        g.closePath()
      },
      { cx: 18, cy: cy + 0.5, rx: 14, ry: 4 },
      SNAIL,
    ),
    ell(headX, cy - 8.5, 6, 7.5, SNAIL), // head and neck
  ], 1.8, GRUMP_INK)
  // Antennae with little bobbles.
  for (const [dx, lean] of [
    [-2.2, -1.6],
    [2.2, 1.2],
  ] as const) {
    inkedStroke(ctx, (g) => {
      g.moveTo(headX + dx, cy - 14)
      g.quadraticCurveTo(headX + dx + lean, cy - 18, headX + dx + lean * 1.6, cy - 20 + stretch)
    }, SNAIL, 1.2, GRUMP_INK)
    paintParts(ctx, [ell(headX + dx + lean * 1.6, cy - 20.5 + stretch, 1.6, 1.6, SNAIL)], 1, GRUMP_INK)
  }
  // The shell sits on the back, bobbing a little between frames.
  const sx = 14 - stretch * 0.5
  const sy = cy - 10 + stretch * 0.6
  paintParts(ctx, [ell(sx, sy, 9.5, 9, SHELL, { gloss: 0.35 })], 1.8, GRUMP_INK)
  ctx.save()
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let t = 0; t <= 1; t += 0.02) {
    const a = t * Math.PI * 4.2 + 0.4
    const r = 1.2 + t * 7
    const x = sx + Math.cos(a) * r
    const y = sy + Math.sin(a) * r * 0.95
    if (t === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.lineWidth = 1.5
  ctx.strokeStyle = `rgba(120,60,40,0.85)`
  ctx.stroke()
  ctx.restore()
  eyes(ctx, headX + 0.8, cy - 9.5, 2.5, 2.2, { style: 'grumpy', lid: SNAIL, iris: 0x4a8a5a })
  mouth(ctx, headX + 1, cy - 5, 1.7, 'fang')
  return c
}

// -------------------------------------------------------------- Bumbling Bee

const BEE = 0xffd65c
const STRIPE = 0x5a3a48

export const bee: Painter = (frame) => {
  const c = makeCanvas(32, 1, 3.5)
  const { ctx } = c
  const cx = 16
  const cy = 15
  groundShadow(ctx, cx, 29, 7, 2, 0.16)
  const up = frame === 0
  // Wings are translucent, so they go down first and get outlined thinly.
  ctx.save()
  ctx.globalAlpha = 0.8
  paintParts(ctx, [
    ell(cx - 3, cy - 8 + (up ? -2 : 3), 4.2, 6.5, 0xeaf6ff, { rot: up ? -0.5 : -1.2, shadow: 0.3 }),
    ell(cx + 3.5, cy - 8 + (up ? -2 : 3), 4.2, 6.5, 0xeaf6ff, { rot: up ? 0.4 : 1.1, shadow: 0.3 }),
  ], 1.1, 0x6a8ab0)
  ctx.restore()
  const body = ell(cx, cy, 9.5, 8.2, BEE)
  paintParts(ctx, [
    shape(
      (g) => {
        g.moveTo(cx - 8, cy - 1.5)
        g.lineTo(cx - 13.5, cy + 1)
        g.lineTo(cx - 8, cy + 3)
        g.closePath()
      },
      { cx: cx - 10, cy: cy + 1, rx: 3, ry: 2 },
      STRIPE,
    ),
    body,
  ], 1.7, GRUMP_INK)
  // Stripes, clipped to the body so they wrap its curve.
  ctx.save()
  ctx.beginPath()
  ellPath(cx, cy, 9.5, 8.2)(ctx)
  ctx.clip()
  ctx.fillStyle = `rgb(90,58,72)`
  for (const x of [cx - 5, cx - 0.5]) {
    ctx.beginPath()
    ctx.ellipse(x, cy, 1.9, 10, 0.12, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
  // Antennae.
  for (const dx of [2, 6]) {
    inkedStroke(ctx, (g) => {
      g.moveTo(cx + dx, cy - 6.5)
      g.quadraticCurveTo(cx + dx + 1, cy - 11, cx + dx + 2.5, cy - 11.5)
    }, STRIPE, 0.9, GRUMP_INK)
  }
  eyes(ctx, cx + 3.5, cy - 0.5, 2.8, 2.3, { style: 'grumpy', lid: BEE, iris: 0x9a6a2a })
  mouth(ctx, cx + 3.5, cy + 4, 1.5, 'pout')
  return c
}

// --------------------------------------------------------------- Pouty Slime

const SLIME = 0xb49be0

export const slime: Painter = (frame) => {
  const c = makeCanvas(36)
  const { ctx } = c
  const cx = 18
  const base = 29
  const squish = frame === 1
  const w = squish ? 14 : 12
  const top = squish ? 10 : 7
  groundShadow(ctx, cx, base + 0.5, w + 1, 3.4)
  const body = shape(
    (g) => {
      g.moveTo(cx - w, base)
      g.bezierCurveTo(cx - w - 1, base - 12, cx - 6, top, cx, top)
      g.bezierCurveTo(cx + 6, top, cx + w + 1, base - 12, cx + w, base)
      g.quadraticCurveTo(cx, base + 2.5, cx - w, base)
      g.closePath()
    },
    { cx, cy: (top + base) / 2, rx: w, ry: (base - top) / 2 },
    SLIME,
    { gloss: 0.7 },
  )
  paintParts(ctx, [body], 1.8, GRUMP_INK)
  const faceY = squish ? base - 9 : base - 10.5
  eyes(ctx, cx + 1, faceY, 4.3, 2.8, { style: 'grumpy', lid: SLIME, iris: 0x7a4ac0 })
  blush(ctx, cx + 1, faceY + 3.6, 7.5, 2.2, 1.4, P.pinkHot, 0.4)
  mouth(ctx, cx + 1, faceY + 4.5, 2, 'pout')
  return c
}

// -------------------------------------------------------------- Cranky Acorn

const NUT = 0xe8b27a
const CAP = 0x9a6a44

export const acorn: Painter = (frame) => {
  const c = makeCanvas(32, 1, 2)
  const { ctx } = c
  const cx = 16
  const hop = frame === 1 ? -1.5 : 0
  groundShadow(ctx, cx, 29, 8.5 + hop, 2.6)
  const cy = 17 + hop
  // Stubby feet that swap between frames.
  const footL = frame === 0 ? 0 : -1
  const footR = frame === 0 ? -1 : 0
  paintParts(ctx, [
    ell(cx - 4, 27 + footL, 2.6, 1.9, shade(NUT, 0.15)),
    ell(cx + 4, 27 + footR, 2.6, 1.9, shade(NUT, 0.15)),
    shape(
      (g) => {
        g.moveTo(cx - 9.5, cy - 2)
        g.bezierCurveTo(cx - 10, cy + 8, cx - 3, cy + 11.5, cx, cy + 12)
        g.bezierCurveTo(cx + 3, cy + 11.5, cx + 10, cy + 8, cx + 9.5, cy - 2)
        g.closePath()
      },
      { cx, cy: cy + 4, rx: 9.5, ry: 8 },
      NUT,
    ),
    shape(
      (g) => {
        g.moveTo(cx - 11, cy - 1)
        g.bezierCurveTo(cx - 11, cy - 10, cx - 4, cy - 11.5, cx, cy - 11.5)
        g.bezierCurveTo(cx + 4, cy - 11.5, cx + 11, cy - 10, cx + 11, cy - 1)
        g.quadraticCurveTo(cx, cy + 1.5, cx - 11, cy - 1)
        g.closePath()
      },
      { cx, cy: cy - 5, rx: 11, ry: 6 },
      CAP,
    ),
  ], 1.7, GRUMP_INK)
  // Cross-hatched cap scales.
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(cx - 11, cy - 1)
  ctx.bezierCurveTo(cx - 11, cy - 10, cx - 4, cy - 11.5, cx, cy - 11.5)
  ctx.bezierCurveTo(cx + 4, cy - 11.5, cx + 11, cy - 10, cx + 11, cy - 1)
  ctx.quadraticCurveTo(cx, cy + 1.5, cx - 11, cy - 1)
  ctx.clip()
  ctx.strokeStyle = 'rgba(90,50,30,0.45)'
  ctx.lineWidth = 0.8
  for (let i = -14; i < 14; i += 3.2) {
    ctx.beginPath()
    ctx.moveTo(cx + i, cy - 13)
    ctx.lineTo(cx + i + 8, cy + 1)
    ctx.moveTo(cx + i + 8, cy - 13)
    ctx.lineTo(cx + i, cy + 1)
    ctx.stroke()
  }
  ctx.restore()
  inkedStroke(ctx, (g) => {
    g.moveTo(cx, cy - 11)
    g.quadraticCurveTo(cx + 1, cy - 14, cx + 3, cy - 14.5)
  }, CAP, 1.6, GRUMP_INK)
  eyes(ctx, cx + 1, cy + 3, 3.3, 2.3, { style: 'grumpy', lid: NUT, iris: 0x8a5a2a })
  mouth(ctx, cx + 1, cy + 8, 1.7, 'fang')
  return c
}

// ----------------------------------------------------------------- Sad Cloud

const CLOUD = 0xc9c5da

export const cloudFoe: Painter = (frame) => {
  const c = makeCanvas(40, 1, 1.5)
  const { ctx } = c
  const cx = 20
  const cy = 16
  groundShadow(ctx, cx, 36, 11, 2.6, 0.14)
  // Raindrops falling out of the bottom, a step further down on frame 1.
  const drop = frame * 3.5
  ctx.save()
  ctx.globalAlpha = 0.9
  for (const [dx, off] of [
    [-6, 0],
    [1, 2.2],
    [7, 1],
  ] as const) {
    const y = cy + 12 + ((off + drop) % 7)
    ctx.beginPath()
    ctx.moveTo(cx + dx, y - 2)
    ctx.quadraticCurveTo(cx + dx + 1.6, y + 1.2, cx + dx, y + 1.8)
    ctx.quadraticCurveTo(cx + dx - 1.6, y + 1.2, cx + dx, y - 2)
    ctx.fillStyle = 'rgb(110,180,240)'
    ctx.fill()
  }
  ctx.restore()
  const puff = frame === 1 ? 0.5 : 0
  paintParts(ctx, [
    ell(cx - 10, cy + 3, 7.5 + puff, 6.2, CLOUD),
    ell(cx + 10, cy + 3, 7.5 + puff, 6.2, CLOUD),
    ell(cx - 4, cy - 4, 8, 7.5, CLOUD),
    ell(cx + 4.5, cy - 5.5 - puff, 8.5, 8, CLOUD),
    ell(cx, cy + 4, 12, 6.2, CLOUD),
  ], 1.8, 0x4a4466)
  eyes(ctx, cx + 1, cy + 0.5, 4.8, 2.9, { style: 'sleepy', lid: CLOUD, iris: 0x5a7ab0 })
  mouth(ctx, cx + 1, cy + 5.5, 2.4, 'wobble')
  // One sad tear.
  ctx.beginPath()
  ctx.moveTo(cx + 6.5, cy + 2)
  ctx.quadraticCurveTo(cx + 8.5, cy + 5.5, cx + 6.5, cy + 6.5)
  ctx.quadraticCurveTo(cx + 4.5, cy + 5.5, cx + 6.5, cy + 2)
  ctx.fillStyle = 'rgb(150,210,255)'
  ctx.fill()
  return c
}

// ---------------------------------------------------------------- Moody Moth

const MOTH_WING = 0xc2b0f0
const MOTH_FUZZ = 0xf2e6d4

export const moth: Painter = (frame) => {
  const c = makeCanvas(36)
  const { ctx } = c
  const cx = 18
  const cy = 17
  groundShadow(ctx, cx, 33, 8, 2.2, 0.15)
  const open = frame === 0
  const spread = open ? 1 : 0.62
  const wing = (side: number, upper: boolean): Part => {
    const rx = (upper ? 7.5 : 5.2) * spread
    const x = cx + side * (upper ? 7 : 5.5) * spread + side * 1.5
    const y = upper ? cy - 3 : cy + 5.5
    return ell(x, y, rx, upper ? 8 : 5, upper ? MOTH_WING : tint(MOTH_WING, 0.25), {
      rot: side * (upper ? -0.35 : 0.3),
    })
  }
  paintParts(ctx, [wing(-1, false), wing(1, false), wing(-1, true), wing(1, true)], 1.5, 0x4a3a70)
  // Eye-spots on the upper wings.
  for (const side of [-1, 1]) {
    const x = cx + side * (7 * spread + 1.5)
    ctx.beginPath()
    ellPath(x, cy - 4, 2.6 * spread + 0.4, 2.8)(ctx)
    ctx.fillStyle = 'rgb(255,247,240)'
    ctx.fill()
    ctx.beginPath()
    ellPath(x, cy - 4, 1.3 * spread + 0.2, 1.4)(ctx)
    ctx.fillStyle = 'rgb(155,123,255)'
    ctx.fill()
  }
  paintParts(ctx, [
    ell(cx, cy + 3, 3.6, 6.5, 0xb89a7a),
    ell(cx, cy - 3.5, 6, 5, MOTH_FUZZ), // fluffy head/collar
  ], 1.5, 0x4a3a50)
  tufts(ctx, [
    [cx - 4, cy - 1, 1.8],
    [cx + 4, cy - 1, 1.2],
  ], 0xd6c4ae, 0.8)
  for (const side of [-1, 1]) {
    inkedStroke(ctx, (g) => {
      g.moveTo(cx + side * 1.8, cy - 7.5)
      g.quadraticCurveTo(cx + side * 5, cy - 12, cx + side * 3.5, cy - 14)
    }, 0x8a6a5a, 0.8, 0x3a2a3a)
  }
  eyes(ctx, cx + 0.5, cy - 3.5, 2.3, 1.9, { style: 'sleepy', lid: MOTH_FUZZ, iris: 0x6a5aa0 })
  mouth(ctx, cx + 0.5, cy + 0, 1.3, 'pout')
  return c
}

// -------------------------------------------------------------- Grumpy Gnome

const COAT = 0xe0736f
const HAT = 0xff7aa8
const BEARD = 0xfaf6f4
const SKIN = 0xffd0b0

export const gnome: Painter = (frame) => {
  const c = makeCanvas(48, 1.7, 4.5)
  const { ctx } = c
  const cx = 24
  const cy = 29
  groundShadow(ctx, cx, cy + 15.5, 14, 3.4)
  const step = frame === 0 ? 1 : -1
  const sway = frame === 0 ? 0 : 1.5
  paintParts(ctx, [
    ell(cx - 5, cy + 15 - (step > 0 ? 1 : 0), 4, 2.6, 0x7a4a3a), // boots
    ell(cx + 5, cy + 15 - (step < 0 ? 1 : 0), 4, 2.6, 0x7a4a3a),
    ell(cx, cy + 5, 13.5, 11.5, COAT),
    ell(cx - 12, cy + 6 - step, 3.8, 5, COAT, { rot: 0.3 }),
    ell(cx + 12, cy + 6 + step, 3.8, 5, COAT, { rot: -0.3 }),
    ell(cx - 12.5, cy + 10 - step, 2.8, 2.6, SKIN),
    ell(cx + 12.5, cy + 10 + step, 2.8, 2.6, SKIN),
    ell(cx, cy - 5, 10.5, 9, SKIN),
    // the beard, an enormous fluffy cloud of disapproval
    shape(
      (g) => {
        g.moveTo(cx - 10, cy - 4)
        g.quadraticCurveTo(cx - 12, cy + 8, cx - 4, cy + 13)
        g.quadraticCurveTo(cx, cy + 16, cx + 4, cy + 13)
        g.quadraticCurveTo(cx + 12, cy + 8, cx + 10, cy - 4)
        g.quadraticCurveTo(cx, cy + 2, cx - 10, cy - 4)
        g.closePath()
      },
      { cx, cy: cy + 5, rx: 10, ry: 9 },
      BEARD,
      { line: 'in' },
    ),
    // the hat, tip swaying between frames
    shape(
      (g) => {
        g.moveTo(cx - 12.5, cy - 8)
        g.quadraticCurveTo(cx - 8, cy - 26, cx + 3 + sway, cy - 31)
        g.quadraticCurveTo(cx + 9 + sway, cy - 33, cx + 11 + sway, cy - 29)
        g.quadraticCurveTo(cx + 6, cy - 22, cx + 12.5, cy - 8)
        g.closePath()
      },
      { cx, cy: cy - 18, rx: 12, ry: 12 },
      HAT,
      { line: 'in' },
    ),
    ell(cx, cy - 8, 13.5, 3.5, tint(HAT, 0.2), { line: 'in' }),
  ], 1.8, GRUMP_INK)
  tufts(ctx, [
    [cx - 5, cy + 4, 1.6],
    [cx + 4, cy + 6, 1.2],
    [cx - 1, cy + 9, 1.4],
  ], 0xd8d0d8, 0.8)
  eyes(ctx, cx, cy - 4.5, 4.6, 2.4, { style: 'grumpy', lid: SKIN, iris: 0x5a7ab0 })
  nose(ctx, cx, cy - 0.5, 2.6, 0xff8f9a)
  sparkle(ctx, cx + 11 + sway, cy - 29, 1.8, P.white, 0.9)
  return c
}

// ----------------------------------------------------------- Sir Fluffington

const FLUFF = 0xc7c2d8

export const fluffington: Painter = (frame) => {
  const c = makeCanvas(76, 2.4, 1.5)
  const { ctx } = c
  const cx = 38
  const cy = 43
  groundShadow(ctx, cx, cy + 27, 27, 5.5)
  const breathe = frame === 1 ? 1 : 0
  // Tail, swishing out from behind.
  inkedStroke(ctx, (g) => {
    g.moveTo(cx - 20, cy + 14)
    g.bezierCurveTo(cx - 34, cy + 12, cx - 36 + breathe * 2, cy - 4, cx - 30 + breathe * 3, cy - 12)
  }, FLUFF, 7, 0x4a4466)
  // A ring of puffs gives him the silhouette of an extremely offended pompom.
  const rnd = seededRandom(7)
  const puffs: Part[] = []
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2
    const r = 24 + rnd() * 3 + breathe
    puffs.push(ell(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9, 7.5, 7, FLUFF, { shadow: 0.5 }))
  }
  const ear = (side: number): Part =>
    shape(
      (g) => {
        g.moveTo(cx + side * 9, cy - 20)
        g.quadraticCurveTo(cx + side * 17, cy - 38, cx + side * 22, cy - 34)
        g.quadraticCurveTo(cx + side * 25, cy - 24, cx + side * 23, cy - 15)
        g.closePath()
      },
      { cx: cx + side * 17, cy: cy - 25, rx: 7, ry: 10 },
      FLUFF,
    )
  paintParts(ctx, [ear(-1), ear(1), ...puffs, ell(cx, cy, 26 + breathe, 24, FLUFF)], 2, 0x4a4466)
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(cx + side * 12, cy - 21)
    ctx.quadraticCurveTo(cx + side * 17.5, cy - 33, cx + side * 20.5, cy - 30)
    ctx.quadraticCurveTo(cx + side * 22, cy - 24, cx + side * 21, cy - 18)
    ctx.closePath()
    ctx.fillStyle = 'rgb(255,178,208)'
    ctx.fill()
  }
  // Paws poking out at the bottom.
  paintParts(ctx, [
    ell(cx - 11, cy + 23, 6.5, 4.5, tint(FLUFF, 0.4), { line: 'in' }),
    ell(cx + 11, cy + 23, 6.5, 4.5, tint(FLUFF, 0.4), { line: 'in' }),
  ], 1.8, 0x4a4466)
  // The muzzle: flat, squashed, and deeply unimpressed.
  paintParts(ctx, [ell(cx, cy + 6, 15, 11, 0xf5f0f8, { line: 'none', shadow: 0.5 })], 2)
  tufts(ctx, [
    [cx - 18, cy - 10, 2.2],
    [cx + 18, cy - 10, 1],
    [cx - 20, cy + 6, 2.8],
    [cx + 19, cy + 8, 0.4],
  ], shade(FLUFF, 0.25), 1)
  eyes(ctx, cx, cy - 4, 9.5, 5.2, { style: 'grumpy', lid: FLUFF, iris: 0xe0a030 })
  nose(ctx, cx, cy + 3, 3, 0xff7eb6)
  mouth(ctx, cx, cy + 9, 4, 'frown')
  for (const side of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath()
      ctx.moveTo(cx + side * 9, cy + 6 + i * 2.2)
      ctx.lineTo(cx + side * 25, cy + 4 + i * 5.5)
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(90,80,110,0.7)'
      ctx.stroke()
    }
  }
  // The crown, because he is in charge. Jewelled, obviously.
  const crown = shape(
    (g) => {
      g.moveTo(cx - 12, cy - 25)
      g.lineTo(cx - 13, cy - 37)
      g.lineTo(cx - 6, cy - 30.5)
      g.lineTo(cx, cy - 40)
      g.lineTo(cx + 6, cy - 30.5)
      g.lineTo(cx + 13, cy - 37)
      g.lineTo(cx + 12, cy - 25)
      g.quadraticCurveTo(cx, cy - 22.5, cx - 12, cy - 25)
      g.closePath()
    },
    { cx, cy: cy - 31, rx: 13, ry: 8 },
    P.gold,
    { gloss: 0.5 },
  )
  paintParts(ctx, [crown], 1.6, 0x8a5a1a)
  for (const [x, col] of [
    [-7.5, 0xff7eb6],
    [0, 0x5bb8ff],
    [7.5, 0x3fd1b0],
  ] as const) {
    paintParts(ctx, [ell(cx + x, cy - 27.5, 1.9, 1.9, col, { gloss: 0.8 })], 0.8, 0x8a5a1a)
  }
  sparkle(ctx, cx + 11, cy - 39, 2.4, P.white, 0.95)
  return c
}

// ------------------------------------------------------------- Grumpy Monkey

const MONKEY = 0xb5825a
const MONKEY_FACE = 0xf6caa0

/**
 * The forest's boss. Leaps rather than trudges, so the silhouette wants to read
 * as "about to spring": wide ears, hunched shoulders, and a very cross face.
 */
export const monkey: Painter = (frame) => {
  const c = makeCanvas(80, 2.3)
  const { ctx } = c
  const cx = 40
  const cy = 45
  groundShadow(ctx, cx, cy + 30, 28, 5.5)
  const arms = frame === 1 ? -4 : 0
  inkedStroke(ctx, (g) => {
    g.moveTo(cx - 20, cy + 16)
    g.bezierCurveTo(cx - 40, cy + 12, cx - 38, cy - 14, cx - 26, cy - 12 + arms * 0.5)
    g.quadraticCurveTo(cx - 20, cy - 10, cx - 23, cy - 5)
  }, MONKEY, 4.2, 0x4a2a24)
  paintParts(ctx, [
    ell(cx - 11, cy + 27, 7, 4, MONKEY_FACE), // feet
    ell(cx + 11, cy + 27, 7, 4, MONKEY_FACE),
    ell(cx, cy + 14, 21, 15.5, MONKEY),
    ell(cx, cy + 17, 12, 10, MONKEY_FACE, { line: 'none', shadow: 0.5 }),
    // ears
    ell(cx - 24, cy - 12, 9.5, 9.5, MONKEY),
    ell(cx + 24, cy - 12, 9.5, 9.5, MONKEY),
    ell(cx, cy - 12, 22, 20, MONKEY),
    ell(cx - 24, cy - 12, 5.5, 5.5, MONKEY_FACE, { line: 'none' }),
    ell(cx + 24, cy - 12, 5.5, 5.5, MONKEY_FACE, { line: 'none' }),
    // heart-shaped face patch
    shape(
      (g) => {
        g.moveTo(cx, cy - 13)
        g.bezierCurveTo(cx - 6, cy - 24, cx - 20, cy - 16, cx - 15, cy - 3)
        g.bezierCurveTo(cx - 12, cy + 7, cx - 4, cy + 8, cx, cy + 7.5)
        g.bezierCurveTo(cx + 4, cy + 8, cx + 12, cy + 7, cx + 15, cy - 3)
        g.bezierCurveTo(cx + 20, cy - 16, cx + 6, cy - 24, cx, cy - 13)
        g.closePath()
      },
      { cx, cy: cy - 5, rx: 16, ry: 13 },
      MONKEY_FACE,
      { line: 'none', shadow: 0.5 },
    ),
    // arms, raised on the wind-up frame
    ell(cx - 21, cy + 10 + arms, 7, 12, MONKEY, { line: 'in', rot: 0.25 }),
    ell(cx + 21, cy + 10 + arms, 7, 12, MONKEY, { line: 'in', rot: -0.25 }),
    ell(cx - 22, cy + 20 + arms, 5.5, 4.5, MONKEY_FACE, { line: 'in' }),
  ], 2, 0x4a2a24)
  // A banana, obviously.
  ctx.save()
  ctx.translate(cx + 27, cy + 13 + arms)
  ctx.rotate(-1.1)
  paintParts(ctx, [
    shape(
      (g) => {
        g.moveTo(-9, 3)
        g.quadraticCurveTo(0, -8, 10, 1)
        g.quadraticCurveTo(0, 0, -9, 3)
        g.closePath()
      },
      { cx: 0, cy: -1, rx: 10, ry: 4 },
      0xffe066,
    ),
  ], 1.4, 0x7a5a1a)
  ctx.restore()
  paintParts(ctx, [ell(cx + 22, cy + 20 + arms, 5.5, 4.5, MONKEY_FACE, { line: 'in' })], 2, 0x4a2a24)
  eyes(ctx, cx, cy - 11, 7.5, 4.4, { style: 'grumpy', lid: MONKEY_FACE, iris: 0x8a4a2a })
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ellPath(cx + side * 2.6, cy - 2, 1.3, 1)(ctx)
    ctx.fillStyle = 'rgb(106,58,42)'
    ctx.fill()
  }
  mouth(ctx, cx, cy + 3.5, 4, 'fang')
  blush(ctx, cx, cy - 1, 11, 3, 2, P.coral, 0.45)
  return c
}
