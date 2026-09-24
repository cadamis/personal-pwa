/**
 * The playable friends.
 *
 * Everyone faces a little to the right (face nudged right, tail on the left) so
 * that flipping the sprite when the player walks left actually reads as turning
 * round. All of them are "chibi": the head is most of the body, the eyes are
 * most of the head.
 */
import {
  blush,
  css,
  ell,
  ellPath,
  eye,
  eyes,
  groundShadow,
  heartPath,
  inkedStroke,
  makeCanvas,
  mouth,
  nose,
  P,
  paintParts,
  shape,
  sparkle,
  starPath,
  glow,
  tint,
  tufts,
  type Canvas2D,
  type Part,
} from '../draw'

export type Painter = (frame: number) => Canvas2D

const CORGI = 0xffb070
const CORGI_CREAM = 0xfff3e2

export const mochi: Painter = () => {
  const c = makeCanvas(44)
  const { ctx } = c
  const cx = 22
  const cy = 25
  groundShadow(ctx, cx, cy + 13.5, 13, 3.6)

  const ear = (side: number): Part =>
    shape(
      (g) => {
        g.moveTo(cx + side * 3.5, cy - 9)
        g.quadraticCurveTo(cx + side * 9, cy - 22, cx + side * 13, cy - 19)
        g.quadraticCurveTo(cx + side * 15, cy - 11, cx + side * 12.5, cy - 5)
        g.closePath()
      },
      { cx: cx + side * 9, cy: cy - 13, rx: 5, ry: 8 },
      CORGI,
    )
  const innerEar = (side: number): Part =>
    shape(
      (g) => {
        g.moveTo(cx + side * 6.5, cy - 9)
        g.quadraticCurveTo(cx + side * 9.5, cy - 18, cx + side * 12, cy - 16.5)
        g.quadraticCurveTo(cx + side * 12.8, cy - 11, cx + side * 11.5, cy - 7.5)
        g.closePath()
      },
      { cx: cx + side * 10, cy: cy - 12, rx: 3, ry: 5 },
      0xffa4be,
      { line: 'none', shadow: 0.5 },
    )

  paintParts(ctx, [
    ell(cx - 14.5, cy + 3, 5.2, 4.4, CORGI_CREAM, { rot: -0.4 }), // tail puff
    ear(-1),
    ear(1),
    ell(cx - 7.5, cy + 11.5, 3.6, 2.8, CORGI_CREAM), // back feet
    ell(cx + 8.5, cy + 11.5, 3.6, 2.8, CORGI_CREAM),
    ell(cx, cy + 1, 14.5, 12.6, CORGI),
    innerEar(-1),
    innerEar(1),
    // the corgi's white blaze and muzzle, as one soft marking
    shape(
      (g) => {
        g.moveTo(cx + 1, cy - 11)
        g.quadraticCurveTo(cx + 4.2, cy - 3, cx + 9.5, cy + 2)
        g.quadraticCurveTo(cx + 11, cy + 10, cx + 1, cy + 12.5)
        g.quadraticCurveTo(cx - 9, cy + 10, cx - 7.5, cy + 2)
        g.quadraticCurveTo(cx - 2.2, cy - 3, cx + 1, cy - 11)
        g.closePath()
      },
      { cx: cx + 1, cy: cy + 2, rx: 9, ry: 10 },
      CORGI_CREAM,
      { line: 'none', shadow: 0.6 },
    ),
    ell(cx - 4, cy + 12.3, 3.5, 2.6, CORGI_CREAM, { line: 'in' }), // front paws
    ell(cx + 5, cy + 12.3, 3.5, 2.6, CORGI_CREAM, { line: 'in' }),
  ], 1.9, 0x7a3526)
  tufts(ctx, [
    [cx - 12.5, cy - 4, 2.4],
    [cx + 12.5, cy - 4, 0.8],
  ], tint(CORGI, 0.45), 0.9)
  eyes(ctx, cx + 1.5, cy - 1.5, 5.6, 3.3, { style: 'shiny', iris: 0x9a5a36 })
  blush(ctx, cx + 1.5, cy + 3.8, 9.4, 3, 2)
  nose(ctx, cx + 1.5, cy + 2.6, 1.8)
  mouth(ctx, cx + 1.5, cy + 5.2, 2.3, 'grin')
  return c
}

export const nimbus: Painter = () => {
  const c = makeCanvas(46, 1, 1)
  const { ctx } = c
  const cx = 23
  const cy = 24
  groundShadow(ctx, cx, cy + 16, 12, 3, 0.18) // floats, so a fainter, lower shadow
  const fluff = 0xfbfbff
  const ear = (side: number): Part =>
    shape(
      (g) => {
        g.moveTo(cx + side * 4, cy - 9)
        g.quadraticCurveTo(cx + side * 9, cy - 21, cx + side * 12.5, cy - 19)
        g.quadraticCurveTo(cx + side * 13.5, cy - 12, cx + side * 12, cy - 6)
        g.closePath()
      },
      { cx: cx + side * 9, cy: cy - 13, rx: 5, ry: 7 },
      fluff,
    )
  // Lightning-bolt tail: she is half weather, after all.
  const bolt = shape(
    (g) => {
      g.moveTo(cx - 12, cy + 2)
      g.lineTo(cx - 19, cy - 3)
      g.lineTo(cx - 16, cy - 4)
      g.lineTo(cx - 21, cy - 11)
      g.lineTo(cx - 13.5, cy - 4.5)
      g.lineTo(cx - 16, cy - 3.5)
      g.lineTo(cx - 10.5, cy - 1)
      g.closePath()
    },
    { cx: cx - 16, cy: cy - 5, rx: 5, ry: 6 },
    P.gold,
  )
  const puffs: Part[] = [
    ell(cx - 10, cy + 4, 7.5, 6.5, fluff),
    ell(cx + 10, cy + 4, 7.5, 6.5, fluff),
    ell(cx - 5, cy + 8, 7, 5.5, fluff),
    ell(cx + 5, cy + 8, 7, 5.5, fluff),
    ell(cx, cy - 1, 13, 11.5, fluff),
  ]
  paintParts(ctx, [
    bolt,
    ear(-1),
    ear(1),
    ...puffs,
    shape(
      (g) => {
        g.moveTo(cx + 6.5, cy - 9)
        g.quadraticCurveTo(cx + 9.5, cy - 17, cx + 11.5, cy - 16)
        g.quadraticCurveTo(cx + 12, cy - 11.5, cx + 11, cy - 8)
        g.closePath()
        g.moveTo(cx - 6.5, cy - 9)
        g.quadraticCurveTo(cx - 9.5, cy - 17, cx - 11.5, cy - 16)
        g.quadraticCurveTo(cx - 12, cy - 11.5, cx - 11, cy - 8)
        g.closePath()
      },
      { cx, cy: cy - 12, rx: 11, ry: 5 },
      0xffb8d2,
      { line: 'none', shadow: 0 },
    ),
  ], 1.9, 0x5a6ea0)
  // A little raincloud-blue under the belly.
  ctx.save()
  ctx.globalAlpha = 0.5
  ctx.beginPath()
  ellPath(cx, cy + 10, 11, 3.2)(ctx)
  ctx.fillStyle = 'rgb(169,220,255)'
  ctx.fill()
  ctx.restore()
  eyes(ctx, cx + 1.5, cy - 1.5, 5.4, 3.4, { style: 'sparkly', iris: 0x4a8ad8 })
  blush(ctx, cx + 1.5, cy + 3.2, 9, 2.8, 1.9)
  mouth(ctx, cx + 1.5, cy + 4.2, 2.4, 'cat')
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(cx + 1.5 + side * 8, cy + 2)
    ctx.lineTo(cx + 1.5 + side * 13, cy + 1)
    ctx.moveTo(cx + 1.5 + side * 8, cy + 3.5)
    ctx.lineTo(cx + 1.5 + side * 13, cy + 4)
    ctx.lineWidth = 0.7
    ctx.strokeStyle = 'rgba(90,110,160,0.7)'
    ctx.stroke()
  }
  return c
}

const QUILL = 0xa8784e
const QUILL_TIP = 0xf2d7b0
const HEDGE_FACE = 0xffd8b4

export const waffles: Painter = () => {
  const c = makeCanvas(46)
  const { ctx } = c
  const cx = 23
  const cy = 26
  groundShadow(ctx, cx, cy + 13, 14, 3.6)
  // The quill mass: a fan of rounded spikes around the back and top.
  const quills = shape(
    (g) => {
      const n = 13
      for (let i = 0; i <= n; i++) {
        const a = Math.PI * (0.92 + (i / n) * 1.16)
        const long = 18.5 + (i % 2) * 2.5
        const inner = 12
        const a0 = a - 0.13
        const a1 = a + 0.13
        const px = (ang: number, r: number): number => cx - 1 + Math.cos(ang) * r
        const py = (ang: number, r: number): number => cy + 1 + Math.sin(ang) * r * 0.92
        if (i === 0) g.moveTo(px(a0, inner), py(a0, inner))
        else g.lineTo(px(a0, inner), py(a0, inner))
        g.quadraticCurveTo(px(a, long + 1.5), py(a, long + 1.5), px(a1, inner), py(a1, inner))
      }
      g.lineTo(cx + 8, cy + 10)
      g.lineTo(cx - 10, cy + 10)
      g.closePath()
    },
    { cx: cx - 1, cy: cy - 3, rx: 18, ry: 16 },
    QUILL,
  )
  paintParts(ctx, [
    quills,
    ell(cx - 6.5, cy + 12, 3.6, 2.6, HEDGE_FACE),
    ell(cx + 7.5, cy + 12, 3.6, 2.6, HEDGE_FACE),
    ell(cx + 1.5, cy + 2, 12, 10.5, HEDGE_FACE),
    ell(cx + 2, cy + 6, 7.5, 5.5, 0xfff0dc, { line: 'none', shadow: 0.4 }),
  ], 1.9, 0x5e3522)
  // Pale quill tips, so the spikes read as spikes and not as a brown blob.
  ctx.save()
  ctx.strokeStyle = css(QUILL_TIP, 0.9)
  ctx.lineWidth = 1.1
  for (let i = 1; i < 13; i += 1) {
    const a = Math.PI * (0.92 + (i / 13) * 1.16)
    const r0 = 14.5 + (i % 2) * 1.5
    const r1 = 17 + (i % 2) * 2.3
    ctx.beginPath()
    ctx.moveTo(cx - 1 + Math.cos(a) * r0, cy + 1 + Math.sin(a) * r0 * 0.92)
    ctx.lineTo(cx - 1 + Math.cos(a) * r1, cy + 1 + Math.sin(a) * r1 * 0.92)
    ctx.stroke()
  }
  ctx.restore()
  eyes(ctx, cx + 2, cy + 0.5, 4.8, 3, { style: 'happy', weight: 0.5 })
  blush(ctx, cx + 2, cy + 4.6, 8, 2.8, 1.9)
  nose(ctx, cx + 2, cy + 3.8, 2)
  mouth(ctx, cx + 2, cy + 6.8, 2.1, 'smile')
  return c
}

const BUNNY = 0xd6c6ff
const BUNNY_CREAM = 0xfffaf5

export const pip: Painter = () => {
  const c = makeCanvas(48, 1, 2)
  const { ctx } = c
  const cx = 24
  const cy = 29
  groundShadow(ctx, cx, cy + 12.5, 12.5, 3.4)
  // The right ear flops over at the tip; the left one stands up proud.
  const leftEar = shape(ellPath(cx - 5.5, cy - 17, 3.9, 11, -0.18), { cx: cx - 5.5, cy: cy - 17, rx: 4, ry: 11 }, BUNNY)
  const rightEar = shape(
    (g) => {
      g.moveTo(cx + 2.5, cy - 9)
      g.bezierCurveTo(cx + 1, cy - 20, cx + 5, cy - 26, cx + 11, cy - 24)
      g.quadraticCurveTo(cx + 17.5, cy - 22, cx + 16.5, cy - 16)
      g.quadraticCurveTo(cx + 13.5, cy - 18.5, cx + 10.5, cy - 17)
      g.quadraticCurveTo(cx + 9.5, cy - 12, cx + 9.5, cy - 8)
      g.closePath()
    },
    { cx: cx + 9, cy: cy - 17, rx: 7, ry: 8 },
    BUNNY,
  )
  const rightInner = shape(
    (g) => {
      g.moveTo(cx + 4.8, cy - 10)
      g.bezierCurveTo(cx + 3.8, cy - 19, cx + 6.5, cy - 22.5, cx + 10.5, cy - 21.5)
      g.quadraticCurveTo(cx + 8, cy - 18, cx + 7.6, cy - 10)
      g.closePath()
    },
    { cx: cx + 7, cy: cy - 16, rx: 3, ry: 6 },
    0xffb0cc,
    { line: 'none', shadow: 0.3 },
  )
  paintParts(ctx, [
    ell(cx - 13, cy + 5, 4.6, 4.2, BUNNY_CREAM), // pom tail
    leftEar,
    rightEar,
    shape(ellPath(cx - 5.5, cy - 16.5, 1.8, 7.5, -0.18), { cx: cx - 5.5, cy: cy - 16.5, rx: 2, ry: 7.5 }, 0xffb0cc, {
      line: 'none',
      shadow: 0.3,
    }),
    rightInner,
    ell(cx - 6, cy + 11, 3.8, 2.8, BUNNY_CREAM),
    ell(cx + 7, cy + 11, 3.8, 2.8, BUNNY_CREAM),
    ell(cx, cy, 12.8, 11.6, BUNNY),
    ell(cx + 1.5, cy + 4, 8.2, 6.4, BUNNY_CREAM, { line: 'none', shadow: 0.4 }),
  ], 1.9, 0x563c94)
  // Four-leaf clover tucked behind the upright ear.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    ctx.beginPath()
    heartPath(ctx, cx - 11 + Math.cos(a) * 2.2, cy - 10 + Math.sin(a) * 2.2, 1.9)
    ctx.fillStyle = 'rgb(82,196,120)'
    ctx.fill()
    ctx.lineWidth = 0.6
    ctx.strokeStyle = 'rgb(40,110,70)'
    ctx.stroke()
  }
  eyes(ctx, cx + 1.5, cy - 1.5, 5.2, 3.4, { style: 'sparkly', iris: 0xd0508a })
  blush(ctx, cx + 1.5, cy + 3.4, 8.6, 2.8, 1.9)
  nose(ctx, cx + 1.5, cy + 2.4, 1.5, 0xff6fa6)
  mouth(ctx, cx + 1.5, cy + 4.9, 2.3, 'cat')
  return c
}

const BLOB = 0x8ff0c8

export const blobbo: Painter = () => {
  const c = makeCanvas(46, 1, 1)
  const { ctx } = c
  const cx = 23
  const cy = 26
  groundShadow(ctx, cx, cy + 12, 15, 3.6)
  const body = shape(
    (g) => {
      g.moveTo(cx - 14.5, cy + 9)
      g.bezierCurveTo(cx - 16, cy - 8, cx - 7, cy - 15, cx, cy - 15)
      g.bezierCurveTo(cx + 7, cy - 15, cx + 16, cy - 8, cx + 14.5, cy + 9)
      g.quadraticCurveTo(cx + 15, cy + 12.5, cx + 10, cy + 12)
      g.quadraticCurveTo(cx + 7, cy + 15, cx + 3.5, cy + 12)
      g.quadraticCurveTo(cx, cy + 13.5, cx - 3.5, cy + 12)
      g.quadraticCurveTo(cx - 8, cy + 15.5, cx - 10.5, cy + 12)
      g.quadraticCurveTo(cx - 15, cy + 12.5, cx - 14.5, cy + 9)
      g.closePath()
    },
    { cx, cy: cy - 1, rx: 15, ry: 14 },
    BLOB,
    { gloss: 0.75 },
  )
  // A sprout, because nobody knows what Blobbo is and this doesn't help.
  inkedStroke(ctx, (g) => {
    g.moveTo(cx + 1, cy - 14)
    g.quadraticCurveTo(cx + 1.5, cy - 18, cx + 0.5, cy - 20)
  }, 0x5bc47a, 1.4)
  paintParts(ctx, [
    ell(cx - 3, cy - 21, 3.6, 2.2, 0x7fdc8c, { rot: 0.5 }),
    ell(cx + 4, cy - 21.5, 3.6, 2.2, 0x7fdc8c, { rot: -0.5 }),
    body,
  ])
  // A slightly lighter core, so Blobbo reads as jelly rather than plastic.
  ctx.save()
  ctx.globalAlpha = 0.35
  ctx.beginPath()
  ellPath(cx + 1, cy + 2, 8, 7)(ctx)
  ctx.fillStyle = 'rgb(220,255,240)'
  ctx.fill()
  ctx.restore()
  eyes(ctx, cx + 1.5, cy - 2, 5.4, 3.7, { style: 'sparkly', iris: 0x2aa88a })
  blush(ctx, cx + 1.5, cy + 3, 9, 3, 2, 0xff8fb0)
  mouth(ctx, cx + 1.5, cy + 4.6, 2.8, 'grin')
  return c
}

const DUCK = 0xffe36e
const BILL = 0xff9a52

/**
 * Puddles. Kept a warm yellow with happy eyes so she never reads as the Sassy
 * Goose, which is white with an angry face and turns up as a projectile.
 */
export const puddles: Painter = () => {
  const c = makeCanvas(44)
  const { ctx } = c
  const cx = 21
  const cy = 25
  groundShadow(ctx, cx + 1, cy + 13, 12.5, 3.4)
  const foot = (x: number): Part =>
    shape(
      (g) => {
        g.moveTo(x - 1, cy + 9)
        g.lineTo(x - 4.5, cy + 14)
        g.quadraticCurveTo(x, cy + 15.5, x + 4.5, cy + 14)
        g.lineTo(x + 1, cy + 9)
        g.closePath()
      },
      { cx: x, cy: cy + 12.5, rx: 4.5, ry: 3 },
      BILL,
    )
  paintParts(ctx, [
    foot(cx - 3),
    foot(cx + 5),
    ell(cx - 10.5, cy + 1, 5, 4, DUCK, { rot: -0.6 }), // tail flick, pointing back
    ell(cx, cy + 3.5, 13, 10.5, DUCK), // body
    ell(cx + 2, cy - 6.5, 10.5, 9.5, DUCK), // head
    // bill, pointing the way she's facing
    shape(
      (g) => {
        g.moveTo(cx + 9.5, cy - 7.5)
        g.quadraticCurveTo(cx + 19.5, cy - 7.5, cx + 18.5, cy - 3.5)
        g.quadraticCurveTo(cx + 15, cy - 1, cx + 9.5, cy - 2.5)
        g.closePath()
      },
      { cx: cx + 14, cy: cy - 5, rx: 5, ry: 3 },
      BILL,
      { line: 'in' },
    ),
    ell(cx - 2.5, cy + 4, 6.2, 4.8, tint(DUCK, 0.2), { line: 'in', rot: 0.35 }), // wing
    ell(cx + 1, cy + 7, 7, 3.5, tint(DUCK, 0.55), { line: 'none', shadow: 0 }),
  ], 1.9, 0x94521c)
  // Head tuft.
  inkedStroke(ctx, (g) => {
    g.moveTo(cx + 1, cy - 15)
    g.quadraticCurveTo(cx - 1, cy - 20, cx + 3, cy - 20.5)
  }, DUCK, 1.6, 0x94521c)
  ctx.save()
  ctx.strokeStyle = 'rgba(210,120,60,0.8)'
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(cx + 10.5, cy - 4.6)
  ctx.quadraticCurveTo(cx + 14.5, cy - 4, cx + 18, cy - 4.6)
  ctx.stroke()
  ctx.restore()
  // She's in profile, so one big eye, set forward towards the bill, with one
  // cheek under it (spread 0 stacks both of blush's cheeks on the visible one).
  eye(ctx, cx + 5.5, cy - 8, 3.5, 1, { style: 'sparkly', iris: 0x3a7ad0, look: { x: 1, y: 0 } })
  blush(ctx, cx + 4, cy - 2.8, 0, 2.8, 1.8, P.pinkHot, 0.32)
  sparkle(ctx, cx - 10, cy - 12, 1.6, P.white, 0.8)
  return c
}

const WOOL = 0xfffaf2
const LAMB_FACE = 0xffd9c4

/** Pillow: mostly wool. The face peeks out of a cloud of it. */
export const pillow: Painter = () => {
  const c = makeCanvas(46)
  const { ctx } = c
  const cx = 23
  const cy = 26
  groundShadow(ctx, cx, cy + 13, 13.5, 3.6)
  const wool: Part[] = []
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2
    wool.push(ell(cx + Math.cos(a) * 11, cy + 1 + Math.sin(a) * 10, 5.6, 5.2, WOOL, { shadow: 0.55 }))
  }
  paintParts(ctx, [
    ell(cx - 6, cy + 12, 2.6, 3, 0x8a6a7a), // hooves
    ell(cx + 7, cy + 12, 2.6, 3, 0x8a6a7a),
    ...wool,
    ell(cx, cy + 1, 12, 11, WOOL),
    ell(cx - 9.5, cy - 3, 4.5, 2.6, LAMB_FACE, { rot: 0.5 }), // floppy ears
    ell(cx + 12.5, cy - 3, 4.5, 2.6, LAMB_FACE, { rot: -0.5 }),
    ell(cx + 1.5, cy + 1.5, 8, 7.5, LAMB_FACE, { line: 'in' }),
    // woolly fringe on top of the head
    ell(cx - 2, cy - 6, 4, 3.4, WOOL, { line: 'in' }),
    ell(cx + 2.5, cy - 7, 4.2, 3.6, WOOL, { line: 'in' }),
    ell(cx + 6, cy - 5.5, 3.4, 3, WOOL, { line: 'in' }),
  ], 1.9, 0x7a5a6a)
  eyes(ctx, cx + 1.5, cy + 1, 3.8, 2.6, { style: 'happy', weight: 0.5 })
  blush(ctx, cx + 1.5, cy + 4.5, 6.4, 2.4, 1.6)
  nose(ctx, cx + 1.5, cy + 4, 1.3, 0xd87a8a)
  mouth(ctx, cx + 1.5, cy + 6.2, 1.8, 'cat')
  return c
}

const HAMSTER = 0xffc488
const HAMSTER_CREAM = 0xfff4e4

/** Twinkle: a round little hamster with fairy wings and a star wand. */
export const twinkle: Painter = () => {
  const c = makeCanvas(46)
  const { ctx } = c
  const cx = 22
  const cy = 26
  groundShadow(ctx, cx, cy + 13, 12, 3.4)
  // Fairy wings, translucent, behind everything.
  ctx.save()
  ctx.globalAlpha = 0.75
  paintParts(ctx, [
    ell(cx - 12, cy - 8, 6, 9, 0xe0f4ff, { rot: -0.6, shadow: 0.3 }),
    ell(cx - 14, cy + 2, 4.5, 6, 0xf4e0ff, { rot: -1.1, shadow: 0.3 }),
  ], 1.1, 0x7a8ad0)
  ctx.restore()
  paintParts(ctx, [
    ell(cx - 7, cy - 10, 3.6, 3.4, HAMSTER), // ears
    ell(cx + 9, cy - 10, 3.6, 3.4, HAMSTER),
    ell(cx - 5, cy + 12, 3.2, 2.2, 0xffb0b8),
    ell(cx + 6, cy + 12, 3.2, 2.2, 0xffb0b8),
    ell(cx + 1, cy + 1, 13, 12, HAMSTER),
    ell(cx - 7, cy - 10, 1.7, 1.6, 0xffa0b8, { line: 'none', shadow: 0 }),
    ell(cx + 9, cy - 10, 1.7, 1.6, 0xffa0b8, { line: 'none', shadow: 0 }),
    // big puffy cheeks and a cream tummy
    ell(cx - 5, cy + 4, 5.2, 4.5, HAMSTER_CREAM, { line: 'none', shadow: 0.4 }),
    ell(cx + 8, cy + 4, 5.2, 4.5, HAMSTER_CREAM, { line: 'none', shadow: 0.4 }),
    ell(cx + 1.5, cy + 7, 6.5, 4.5, HAMSTER_CREAM, { line: 'none', shadow: 0.4 }),
  ], 1.9, 0x7a4a2a)
  // The wand, held in front.
  inkedStroke(ctx, (g) => {
    g.moveTo(cx + 10, cy + 9)
    g.lineTo(cx + 16, cy - 3)
  }, 0xfff0f6, 1.3, 0x6a3a5a)
  glow(ctx, cx + 17, cy - 5, 5, 0xffe070, 0.6)
  paintParts(ctx, [
    shape((g) => starPath(g, cx + 17, cy - 5, 3.6, 5, 0.5), { cx: cx + 17, cy: cy - 5, rx: 3.5, ry: 3.5 }, 0xffe070, { gloss: 0.6 }),
    ell(cx + 10.5, cy + 9, 2.4, 2, HAMSTER, { line: 'in' }),
  ], 1, 0x7a4a1a)
  eyes(ctx, cx + 1.5, cy - 1, 4.8, 2.9, { style: 'sparkly', iris: 0x8a4a2a })
  blush(ctx, cx + 1.5, cy + 3, 8, 2.4, 1.6)
  nose(ctx, cx + 1.5, cy + 2, 1.1, 0xff7a9a)
  mouth(ctx, cx + 1.5, cy + 3.8, 1.6, 'cat')
  sparkle(ctx, cx - 14, cy - 13, 1.6, P.white, 0.9)
  return c
}

const AXOLOTL = 0xffb0cc
const GILL = 0xff6fa8

/** Jellybean: a pink axolotl with frilly gills and a permanent grin. */
export const jellybean: Painter = () => {
  const c = makeCanvas(46, 1, 1)
  const { ctx } = c
  const cx = 23
  const cy = 26
  groundShadow(ctx, cx, cy + 13, 13, 3.4)
  // Tail with a fin, curling out to the left.
  paintParts(ctx, [
    shape(
      (g) => {
        g.moveTo(cx - 8, cy + 6)
        g.quadraticCurveTo(cx - 20, cy + 10, cx - 21, cy + 1)
        g.quadraticCurveTo(cx - 16, cy + 4, cx - 9, cy + 1)
        g.closePath()
      },
      { cx: cx - 15, cy: cy + 4, rx: 6, ry: 4 },
      0xffc4d8,
    ),
  ], 1.7, 0x8a2a5a)
  // Gills: three frilly fronds each side.
  const gills: Part[] = []
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const a = side < 0 ? Math.PI + (i - 1) * 0.45 : (i - 1) * 0.45
      const rot = side < 0 ? -a : a
      gills.push(ell(cx + 1 + side * 12 + Math.cos(a) * 3, cy - 4 + (i - 1) * 3.6, 4.2, 1.9, GILL, { rot }))
    }
  }
  paintParts(ctx, [
    ...gills,
    ell(cx - 6, cy + 12, 3, 2, AXOLOTL),
    ell(cx + 7, cy + 12, 3, 2, AXOLOTL),
    ell(cx + 1, cy + 1, 13, 11.5, AXOLOTL, { gloss: 0.5 }),
    ell(cx + 1, cy + 6, 7.5, 4.5, 0xffe0ea, { line: 'none', shadow: 0.3 }),
  ], 1.9, 0x8a2a5a)
  // Spots.
  ctx.fillStyle = css(0xff8ab8, 0.8)
  for (const [x, y, r] of [
    [cx - 8, cy - 5, 1.3],
    [cx + 10, cy - 6, 1.1],
    [cx - 9, cy + 3, 1],
  ] as const) {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  eyes(ctx, cx + 1.5, cy - 1.5, 6.5, 2.6, { style: 'shiny', iris: 0x3a2a4a })
  blush(ctx, cx + 1.5, cy + 2.5, 9.5, 2.6, 1.7, 0xff5a9a, 0.6)
  // The grin: wide and gentle.
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineWidth = 1.2
  ctx.strokeStyle = css(P.eyeDark)
  ctx.beginPath()
  ctx.arc(cx + 1.5, cy - 0.5, 5.5, Math.PI * 0.3, Math.PI * 0.7)
  ctx.stroke()
  ctx.restore()
  return c
}

const FLUFFY = 0xc7c2d8

/** Sir Fluffington, reformed: same magnificent fluff, much nicer face, plus a cape. */
export const fluffy: Painter = () => {
  const c = makeCanvas(48)
  const { ctx } = c
  const cx = 24
  const cy = 27
  groundShadow(ctx, cx, cy + 14, 14, 3.6)
  // Cape, behind.
  paintParts(ctx, [
    shape(
      (g) => {
        g.moveTo(cx - 9, cy - 4)
        g.quadraticCurveTo(cx - 18, cy + 8, cx - 15, cy + 14)
        g.quadraticCurveTo(cx, cy + 12, cx + 15, cy + 14)
        g.quadraticCurveTo(cx + 18, cy + 8, cx + 9, cy - 4)
        g.closePath()
      },
      { cx, cy: cy + 6, rx: 15, ry: 10 },
      0xff6a8a,
    ),
  ], 1.8, 0x6a1a3a)
  const puffs: Part[] = []
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    puffs.push(ell(cx + Math.cos(a) * 11.5, cy + Math.sin(a) * 10.5, 4.4, 4, FLUFFY, { shadow: 0.5 }))
  }
  const ear = (side: number): Part =>
    shape(
      (g) => {
        g.moveTo(cx + side * 4, cy - 9)
        g.quadraticCurveTo(cx + side * 8, cy - 19, cx + side * 11.5, cy - 16)
        g.quadraticCurveTo(cx + side * 13, cy - 10, cx + side * 12, cy - 5)
        g.closePath()
      },
      { cx: cx + side * 8, cy: cy - 11, rx: 4, ry: 6 },
      FLUFFY,
    )
  paintParts(ctx, [
    ear(-1),
    ear(1),
    ...puffs,
    ell(cx, cy, 12, 11, FLUFFY),
    ell(cx + 1, cy + 4, 7.5, 5.5, 0xf5f0f8, { line: 'none', shadow: 0.4 }),
    ell(cx - 5, cy + 12, 3.4, 2.4, 0xf0ecf6),
    ell(cx + 6, cy + 12, 3.4, 2.4, 0xf0ecf6),
  ], 1.9, 0x4a4466)
  eyes(ctx, cx + 1, cy - 1, 4.8, 2.9, { style: 'happy', weight: 0.5 })
  nose(ctx, cx + 1, cy + 2.5, 1.4, 0xff7eb6)
  mouth(ctx, cx + 1, cy + 4.3, 1.8, 'cat')
  blush(ctx, cx + 1, cy + 3, 8, 2.4, 1.6)
  // A little crown, worn at a jaunty angle now.
  ctx.save()
  ctx.translate(cx + 3, cy - 12)
  ctx.rotate(0.25)
  paintParts(ctx, [
    shape(
      (g) => {
        g.moveTo(-6, 3)
        g.lineTo(-7, -4)
        g.lineTo(-3, -1)
        g.lineTo(0, -6)
        g.lineTo(3, -1)
        g.lineTo(7, -4)
        g.lineTo(6, 3)
        g.closePath()
      },
      { cx: 0, cy: -1, rx: 7, ry: 4.5 },
      0xffd166,
      { gloss: 0.6 },
    ),
  ], 1.1, 0x8a5a1a)
  ctx.restore()
  return c
}
