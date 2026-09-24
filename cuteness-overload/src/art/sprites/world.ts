/**
 * The world: floors, obstacles, ground decoration, pickups and presents.
 *
 * Readability rule for everything in here that lies on the floor: it has to be
 * *lower contrast* than any Grump, friend or shot. The floors are value-
 * compressed (nothing very dark, nothing very light) and the decorations are
 * drawn in colours close to their floor, so a busy fight still reads as
 * "sprites on a calm ground" rather than "sprites on a busy ground".
 */
import {
  circle,
  crescentPath,
  css,
  ell,
  ellPath,
  eyes,
  glow,
  groundShadow,
  heartPath,
  inkedStroke,
  makeCanvas,
  mix,
  P,
  paintParts,
  seededRandom,
  shade,
  shape,
  sparkle,
  tint,
  wrapped,
  type Canvas2D,
  type Part,
} from '../draw'

export type Painter = (frame: number) => Canvas2D

// ------------------------------------------------------------------- pickups

/** A faceted heart gem. Tier decides the colour: pink, then violet, then gold. */
export function paintHeartGem(tier: 0 | 1 | 2): Canvas2D {
  const size = [18, 21, 24][tier]
  const colour = [0xff6fae, 0xa98bff, 0xffc94a][tier]
  const c = makeCanvas(size)
  const { ctx } = c
  const m = size / 2
  const r = size * 0.38
  glow(ctx, m, m + 1, size * 0.5, colour, 0.4)
  paintParts(ctx, [
    shape((g) => heartPath(g, m, m + r * 0.15, r), { cx: m, cy: m, rx: r, ry: r }, colour, { gloss: 0.85 }),
  ], size * 0.065)
  // Facet lines: two soft strokes that make it a gem rather than a sweet.
  ctx.save()
  ctx.beginPath()
  heartPath(ctx, m, m + r * 0.15, r)
  ctx.clip()
  ctx.strokeStyle = css(P.white, 0.35)
  ctx.lineWidth = size * 0.04
  ctx.beginPath()
  ctx.moveTo(m, m - r * 0.2)
  ctx.lineTo(m, m + r)
  ctx.moveTo(m - r * 0.9, m - r * 0.1)
  ctx.lineTo(m, m + r * 0.4)
  ctx.lineTo(m + r * 0.9, m - r * 0.1)
  ctx.stroke()
  ctx.restore()
  if (tier === 2) sparkle(ctx, m + r * 0.7, m - r * 0.6, size * 0.14, P.white, 1)
  return c
}

export const sprinklePickup: Painter = () => {
  const c = makeCanvas(18)
  const { ctx } = c
  glow(ctx, 9, 9, 8.5, P.gold, 0.35)
  ctx.save()
  ctx.translate(9, 9)
  ctx.rotate(-0.55)
  paintParts(ctx, [
    shape((g) => g.roundRect(-6.5, -2.8, 13, 5.6, 2.8), { cx: 0, cy: 0, rx: 6.5, ry: 2.8 }, 0xffc94a, { gloss: 0.8 }),
  ], 1.3, 0x8a5a1a)
  ctx.fillStyle = css(0xff7eb6)
  ctx.fillRect(-2.6, -2.8, 1.4, 5.6)
  ctx.fillStyle = css(0x7ad8ff)
  ctx.fillRect(1.4, -2.8, 1.4, 5.6)
  ctx.restore()
  return c
}

export const snackPickup: Painter = () => {
  const c = makeCanvas(22)
  const { ctx } = c
  groundShadow(ctx, 11, 18, 8, 2.2, 0.2)
  paintParts(ctx, [ell(11, 10, 8.5, 8, 0xe0a25e)], 1.4, 0x6a3a1a)
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3
    const d = 2 + (i % 3) * 1.8
    ctx.moveTo(11 + Math.cos(a) * d + 1.5, 10 + Math.sin(a) * d)
    ctx.ellipse(11 + Math.cos(a) * d, 10 + Math.sin(a) * d, 1.5, 1.2, 0, 0, Math.PI * 2)
  }
  ctx.fillStyle = css(0x5a3222)
  ctx.fill()
  // One bite missing, obviously.
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  circle(ctx, 18, 5, 3.2, 0xffffff)
  circle(ctx, 19.5, 8.5, 2.4, 0xffffff)
  ctx.restore()
  return c
}

/** Treasure chest: pink lacquer, gold trim, a heart-shaped lock. */
export const chestPickup: Painter = (frame) => {
  const c = makeCanvas(34)
  const { ctx } = c
  const cx = 17
  const cy = 19
  glow(ctx, cx, cy, 16, P.gold, frame === 0 ? 0.45 : 0.7)
  groundShadow(ctx, cx, cy + 10, 12, 3, 0.3)
  const base: Part = shape((g) => g.roundRect(cx - 11, cy - 2, 22, 11, 3), { cx, cy: cy + 3.5, rx: 11, ry: 5.5 }, 0xff8fbf)
  const lid: Part = shape(
    (g) => {
      g.moveTo(cx - 11.5, cy - 1)
      g.quadraticCurveTo(cx - 11.5, cy - 11, cx, cy - 11)
      g.quadraticCurveTo(cx + 11.5, cy - 11, cx + 11.5, cy - 1)
      g.closePath()
    },
    { cx, cy: cy - 5, rx: 11.5, ry: 6 },
    0xffa6cc,
    { line: 'in', gloss: 0.4 },
  )
  paintParts(ctx, [base, lid], 1.6, 0x6a2a4a)
  // Gold bands.
  ctx.fillStyle = css(0xffc94a)
  ctx.strokeStyle = css(0x8a5a1a)
  ctx.lineWidth = 0.8
  for (const x of [cx - 7, cx + 5]) {
    ctx.beginPath()
    ctx.rect(x, cy - 10, 2.2, 19)
    ctx.fill()
    ctx.stroke()
  }
  paintParts(ctx, [shape((g) => heartPath(g, cx, cy - 0.5, 3.4), { cx, cy: cy - 1, rx: 3.4, ry: 3.4 }, 0xffd166, { gloss: 0.7 })], 1, 0x8a5a1a)
  sparkle(ctx, cx + 9, cy - 10, frame === 0 ? 2 : 3, P.white, 1)
  sparkle(ctx, cx - 10, cy - 6, frame === 0 ? 1.5 : 1, P.white, 0.8)
  return c
}

/** A horseshoe magnet that hoovers up every heart on the level. */
export const magnetPickup: Painter = () => {
  const c = makeCanvas(26)
  const { ctx } = c
  glow(ctx, 13, 13, 12, 0xff6a8a, 0.35)
  const shoe = shape(
    (g) => {
      g.moveTo(5, 6)
      g.lineTo(5, 13)
      g.arc(13, 13, 8, Math.PI, 0, true)
      g.lineTo(21, 6)
      g.lineTo(16.5, 6)
      g.lineTo(16.5, 13)
      g.arc(13, 13, 3.5, 0, Math.PI, false)
      g.lineTo(9.5, 6)
      g.closePath()
    },
    { cx: 13, cy: 13, rx: 8, ry: 8 },
    0xff5a7a,
    { gloss: 0.4 },
  )
  paintParts(ctx, [shoe], 1.5, 0x6a1a3a)
  paintParts(ctx, [
    shape((g) => g.rect(5, 4, 4.5, 4.5), { cx: 7.25, cy: 6.25, rx: 2.25, ry: 2.25 }, 0xeef2ff, { line: 'in' }),
    shape((g) => g.rect(16.5, 4, 4.5, 4.5), { cx: 18.75, cy: 6.25, rx: 2.25, ry: 2.25 }, 0xeef2ff, { line: 'in' }),
  ], 1.3, 0x4a4466)
  sparkle(ctx, 22, 3, 2.2, P.white, 1)
  return c
}

/** Cuddle Bomb: a heart-shaped bomb. Squishes every Grump on screen. */
export const bombPickup: Painter = () => {
  const c = makeCanvas(26)
  const { ctx } = c
  glow(ctx, 13, 14, 12, 0xff7eb6, 0.4)
  inkedStroke(ctx, (g) => {
    g.moveTo(15, 7)
    g.quadraticCurveTo(18, 2, 21, 3.5)
  }, 0xc98a5a, 1.3, 0x5a3a2a)
  paintParts(ctx, [
    ell(13, 15, 8.5, 8.5, 0x6a4a8a, { gloss: 0.7 }),
    shape((g) => g.roundRect(11, 5.5, 5, 3.5, 1), { cx: 13.5, cy: 7.25, rx: 2.5, ry: 1.75 }, 0x9a8ab0, { line: 'in' }),
  ], 1.5, 0x2a1a3a)
  ctx.beginPath()
  heartPath(ctx, 13, 15.5, 3.6)
  ctx.fillStyle = css(0xff7eb6)
  ctx.fill()
  sparkle(ctx, 21.5, 3.5, 3, P.gold, 1)
  sparkle(ctx, 21.5, 3.5, 1.4, P.white, 1)
  return c
}

/** Nap Time: a sleepy crescent moon. Every Grump dozes off for a few seconds. */
export const freezePickup: Painter = () => {
  const c = makeCanvas(26)
  const { ctx } = c
  glow(ctx, 13, 13, 12, 0x9ad8ff, 0.45)
  const moon = shape((g) => crescentPath(g, 12, 13.5, 9.5, 17, 9, 7.8), { cx: 11, cy: 13, rx: 9, ry: 9 }, 0xfff0a0)
  paintParts(ctx, [moon], 1.5, 0x6a5a2a)
  // A nightcap flopping off the top horn.
  paintParts(ctx, [
    shape(
      (g) => {
        g.moveTo(13, 5)
        g.quadraticCurveTo(18, -0.5, 23, 5.5)
        g.lineTo(17.5, 7.5)
        g.closePath()
      },
      { cx: 18, cy: 4, rx: 5, ry: 3 },
      0x7ab0ff,
      { line: 'in' },
    ),
  ], 1.2, 0x2a3a6a)
  circle(ctx, 23, 6, 1.6, P.white, 0x2a3a6a, 0.7)
  eyes(ctx, 7.5, 15.5, 0.01, 1.6, { style: 'closed', weight: 0.55 })
  ctx.fillStyle = css(0x5a7ab0)
  ctx.font = 'bold 5px sans-serif'
  ctx.fillText('z', 19, 16)
  ctx.font = 'bold 4px sans-serif'
  ctx.fillText('z', 22, 12)
  return c
}

/** A little drawstring bag of sprinkles. */
export const bagPickup: Painter = () => {
  const c = makeCanvas(24)
  const { ctx } = c
  glow(ctx, 12, 13, 11, P.gold, 0.35)
  groundShadow(ctx, 12, 20, 7.5, 2, 0.2)
  paintParts(ctx, [
    shape(
      (g) => {
        g.moveTo(8, 7)
        g.quadraticCurveTo(2.5, 12, 4, 17)
        g.quadraticCurveTo(12, 21.5, 20, 17)
        g.quadraticCurveTo(21.5, 12, 16, 7)
        g.closePath()
      },
      { cx: 12, cy: 14, rx: 8, ry: 6.5 },
      0xf2c68a,
    ),
    ell(12, 5.5, 4.5, 2.4, 0xf2c68a),
  ], 1.4, 0x6a4a2a)
  ctx.strokeStyle = css(0xff7eb6)
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(7.5, 7.5)
  ctx.lineTo(16.5, 7.5)
  ctx.stroke()
  const bits = [0xff7eb6, 0x7ad8ff, 0xfff0a0, 0xa8f0d8]
  for (let i = 0; i < 4; i++) {
    ctx.save()
    ctx.translate(8 + i * 2.8, 13 + (i % 2) * 2)
    ctx.rotate(i * 0.9)
    ctx.fillStyle = css(bits[i])
    ctx.fillRect(-1.6, -0.6, 3.2, 1.2)
    ctx.restore()
  }
  return c
}

/** A breakable present. Pop it with any weapon to see what's inside. */
export function paintPresent(wrap: number, ribbon: number): Canvas2D {
  const c = makeCanvas(30)
  const { ctx } = c
  const cx = 15
  const cy = 18
  groundShadow(ctx, cx, cy + 9, 11, 2.8, 0.28)
  paintParts(ctx, [
    shape((g) => g.roundRect(cx - 9.5, cy - 5, 19, 13, 2), { cx, cy: cy + 1.5, rx: 9.5, ry: 6.5 }, wrap),
    shape((g) => g.roundRect(cx - 11, cy - 9, 22, 5.5, 2), { cx, cy: cy - 6.25, rx: 11, ry: 2.75 }, tint(wrap, 0.15), { line: 'in' }),
  ], 1.6)
  ctx.fillStyle = css(ribbon)
  ctx.fillRect(cx - 2, cy - 9, 4, 17)
  // Polka dots.
  ctx.fillStyle = css(P.white, 0.55)
  for (const [x, y] of [
    [cx - 6, cy - 0.5],
    [cx + 6, cy + 3],
    [cx - 5.5, cy + 5],
    [cx + 5.5, cy - 1.5],
  ] as const) {
    ctx.beginPath()
    ctx.arc(x, y, 1.2, 0, Math.PI * 2)
    ctx.fill()
  }
  // The bow.
  paintParts(ctx, [
    ell(cx - 4.5, cy - 11, 4.5, 3, ribbon, { rot: 0.4 }),
    ell(cx + 4.5, cy - 11, 4.5, 3, ribbon, { rot: -0.4 }),
    ell(cx, cy - 10.5, 2.2, 2.2, tint(ribbon, 0.2), { line: 'in' }),
  ], 1.3)
  sparkle(ctx, cx + 10, cy - 12, 1.8, P.white, 0.9)
  return c
}

// ----------------------------------------------------------------- obstacles

/**
 * A bush. Solid enough to read as an obstacle at a glance, because in the forest
 * it stops the player, the Grumps and every projectile.
 */
export function paintBush(seed: number, leaf: number, berry: number | null): Canvas2D {
  const c = makeCanvas(50)
  const { ctx } = c
  const m = 25
  groundShadow(ctx, m, m + 13, 20, 5, 0.3)
  const rnd = seededRandom(seed)
  const lobes: Part[] = []
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rnd() * 0.3
    const r = 8.5 + rnd() * 2.5
    lobes.push(ell(m + Math.cos(a) * 11, m - 1 + Math.sin(a) * 9, r, r * 0.92, leaf, { shadow: 0.7 }))
  }
  lobes.push(ell(m, m - 1, 14, 12.5, leaf))
  paintParts(ctx, lobes, 2)
  // Leaf clusters catching the light on the top-left.
  for (const [dx, dy, r] of [
    [-6, -8, 5],
    [3, -10, 4],
    [-11, -1, 3.6],
    [7, -4, 3],
  ] as const) {
    ctx.beginPath()
    ellPath(m + dx, m + dy, r, r * 0.8)(ctx)
    ctx.fillStyle = css(tint(leaf, 0.25), 0.8)
    ctx.fill()
  }
  if (berry !== null) {
    for (const [dx, dy] of [
      [7, 4],
      [-4, 7],
      [11, -3],
      [-9, 5],
    ] as const) {
      paintParts(ctx, [ell(m + dx, m + dy, 2.2, 2.2, berry, { gloss: 0.9 })], 0.9)
    }
  }
  return c
}

export const bush: Painter = () => paintBush(404, 0x66a85c, 0xff7aa8)
export const bushPlain: Painter = () => paintBush(77, 0x5f9e5a, null)

/** A mossy tree stump with a little mushroom friend. */
export const stump: Painter = () => {
  const c = makeCanvas(50)
  const { ctx } = c
  const m = 25
  groundShadow(ctx, m, m + 12, 18, 4.5, 0.3)
  paintParts(ctx, [
    shape(
      (g) => {
        g.moveTo(m - 14, m - 4)
        g.lineTo(m - 13, m + 8)
        g.quadraticCurveTo(m - 16, m + 12, m - 10, m + 12)
        g.quadraticCurveTo(m, m + 15, m + 10, m + 12)
        g.quadraticCurveTo(m + 16, m + 12, m + 13, m + 8)
        g.lineTo(m + 14, m - 4)
        g.closePath()
      },
      { cx: m, cy: m + 4, rx: 14, ry: 9 },
      0xb08058,
    ),
    ell(m, m - 4, 14, 6.5, 0xe8c290, { line: 'in' }),
  ], 2, 0x4a2e22)
  ctx.strokeStyle = css(0xb08058, 0.8)
  ctx.lineWidth = 0.9
  for (const r of [3, 6, 9.5]) {
    ctx.beginPath()
    ctx.ellipse(m, m - 4, r, r * 0.46, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  // Moss.
  ctx.fillStyle = css(0x7ab85e, 0.9)
  ctx.beginPath()
  ctx.ellipse(m - 9, m - 5, 5, 2.5, -0.3, 0, Math.PI * 2)
  ctx.fill()
  paintParts(ctx, [
    shape((g) => g.rect(m + 9, m + 5, 2.6, 5), { cx: m + 10.3, cy: m + 7.5, rx: 1.3, ry: 2.5 }, 0xfff0e0),
    shape(
      (g) => {
        g.moveTo(m + 5.5, m + 6)
        g.quadraticCurveTo(m + 10.3, m - 1, m + 15, m + 6)
        g.closePath()
      },
      { cx: m + 10.3, cy: m + 3.5, rx: 4.8, ry: 3 },
      0xff6a7a,
    ),
  ], 1.2, 0x4a2e22)
  circle(ctx, m + 8.5, m + 3.8, 0.9, P.white)
  circle(ctx, m + 11.5, m + 2.8, 0.7, P.white)
  return c
}

// ------------------------------------------------------------------- decals

/**
 * Ground decoration: flowers, clover, pebbles, leaves. These are scattered by
 * the game (streamed and deterministic, like the forest's bushes) rather than
 * baked into the floor tile, so the floor never visibly repeats.
 *
 * Deliberately small, flat and close in value to the floor: they are there to
 * make the ground feel like a place, not to be noticed.
 */
function decal(size: number, draw: (ctx: CanvasRenderingContext2D, m: number) => void): Canvas2D {
  const c = makeCanvas(size)
  draw(c.ctx, size / 2)
  return c
}

const petals = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, n: number, petal: number, centre: number): void => {
  ctx.fillStyle = css(petal)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    ctx.beginPath()
    ctx.ellipse(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.5, r * 0.32, a, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = css(centre)
  ctx.beginPath()
  ctx.arc(x, y, r * 0.32, 0, Math.PI * 2)
  ctx.fill()
}

export const decalDaisies: Painter = () =>
  decal(26, (ctx, m) => {
    petals(ctx, m - 5, m + 2, 4.5, 6, 0xf4fbe8, 0xf6d86a)
    petals(ctx, m + 5, m - 3, 3.8, 6, 0xf4fbe8, 0xf6d86a)
    petals(ctx, m + 3, m + 6, 3, 5, 0xf4fbe8, 0xf6d86a)
  })

export const decalPinkFlowers: Painter = () =>
  decal(24, (ctx, m) => {
    petals(ctx, m - 3, m, 4, 5, 0xf7c4d8, 0xfff0b0)
    petals(ctx, m + 5, m + 4, 3.2, 5, 0xf7c4d8, 0xfff0b0)
  })

export const decalClover: Painter = () =>
  decal(26, (ctx, m) => {
    ctx.fillStyle = css(0x92cf7c)
    for (const [x, y, r] of [
      [m - 5, m, 2.6],
      [m + 3, m - 4, 2.3],
      [m + 5, m + 5, 2.5],
    ] as const) {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2
        ctx.beginPath()
        heartPath(ctx, x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, r * 0.75)
        ctx.fill()
      }
    }
  })

export const decalTuft: Painter = () =>
  decal(22, (ctx, m) => {
    ctx.strokeStyle = css(0x94cf80)
    ctx.lineCap = 'round'
    ctx.lineWidth = 1.5
    for (const [dx, lean, h] of [
      [-4, -2.5, 7],
      [-1, -0.5, 9],
      [2, 1.5, 8],
      [5, 3, 6],
    ] as const) {
      ctx.beginPath()
      ctx.moveTo(m + dx, m + 5)
      ctx.quadraticCurveTo(m + dx + lean * 0.3, m + 5 - h * 0.6, m + dx + lean, m + 5 - h)
      ctx.stroke()
    }
  })

export const decalPebbles: Painter = () =>
  decal(22, (ctx, m) => {
    for (const [x, y, rx, ry] of [
      [m - 4, m + 1, 3.4, 2.4],
      [m + 3, m - 2, 2.4, 1.8],
      [m + 4, m + 4, 1.8, 1.3],
    ] as const) {
      ctx.fillStyle = css(0xb9c7a4)
      ctx.beginPath()
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = css(0xd2dcc0)
      ctx.beginPath()
      ctx.ellipse(x - rx * 0.25, y - ry * 0.3, rx * 0.5, ry * 0.4, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  })

export const decalLeaves: Painter = () =>
  decal(26, (ctx, m) => {
    const cols = [0xc7b27a, 0xb89a6a, 0xa6b872]
    ;[
      [m - 5, m - 2, 0.6],
      [m + 4, m + 3, -0.9],
      [m + 2, m - 5, 2.1],
    ].forEach(([x, y, a], i) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(a)
      ctx.fillStyle = css(cols[i])
      ctx.beginPath()
      ctx.moveTo(-4, 0)
      ctx.quadraticCurveTo(0, -3, 4, 0)
      ctx.quadraticCurveTo(0, 3, -4, 0)
      ctx.fill()
      ctx.strokeStyle = css(shade(cols[i], 0.2))
      ctx.lineWidth = 0.6
      ctx.beginPath()
      ctx.moveTo(-3.5, 0)
      ctx.lineTo(3.5, 0)
      ctx.stroke()
      ctx.restore()
    })
  })

export const decalMushrooms: Painter = () =>
  decal(24, (ctx, m) => {
    for (const [x, y, r] of [
      [m - 3, m + 2, 3.6],
      [m + 4, m + 4, 2.6],
    ] as const) {
      ctx.fillStyle = css(0xe8dcc4)
      ctx.fillRect(x - r * 0.3, y - r * 0.2, r * 0.6, r * 1.1)
      ctx.fillStyle = css(0xd98a8a)
      ctx.beginPath()
      ctx.moveTo(x - r, y)
      ctx.quadraticCurveTo(x, y - r * 1.5, x + r, y)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = css(0xf2e6e0)
      ctx.beginPath()
      ctx.arc(x - r * 0.3, y - r * 0.55, r * 0.18, 0, Math.PI * 2)
      ctx.fill()
    }
  })

export const decalFern: Painter = () =>
  decal(28, (ctx, m) => {
    ctx.strokeStyle = css(0x6e9e62)
    ctx.fillStyle = css(0x6e9e62)
    ctx.lineWidth = 1.1
    for (const a of [-2.3, -1.6, -0.9]) {
      const len = 10
      const ex = m + Math.cos(a) * len
      const ey = m + 6 + Math.sin(a) * len
      ctx.beginPath()
      ctx.moveTo(m, m + 6)
      ctx.lineTo(ex, ey)
      ctx.stroke()
      for (let t = 0.3; t < 1; t += 0.2) {
        const px = m + Math.cos(a) * len * t
        const py = m + 6 + Math.sin(a) * len * t
        for (const side of [-1, 1]) {
          ctx.beginPath()
          ctx.ellipse(px + Math.cos(a + side * 1.2) * 1.8, py + Math.sin(a + side * 1.2) * 1.8, 1.8 * (1.1 - t), 0.8, a + side * 1.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  })

// ------------------------------------------------------------------ floors

/**
 * A floor tile, painted at world scale (one canvas pixel per world pixel, not
 * supersampled — it's soft by design) and big, so the repeat is hard to spot
 * even before the decals break it up.
 */
export function paintFloor(opts: {
  seed: number
  base: number
  dark: number
  light: number
  speckle: number
  /** Extra detail drawn after the patches, still wrapped for tiling. */
  extra?: (ctx: CanvasRenderingContext2D, size: number, rnd: () => number) => void
}): Canvas2D {
  const size = 640
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Cuteness Overload needs a 2D canvas to draw its sprites')
  const rnd = seededRandom(opts.seed)
  ctx.fillStyle = css(opts.base)
  ctx.fillRect(0, 0, size, size)

  const patch = (x: number, y: number, radius: number, color: number, alpha: number, squash: number): void => {
    wrapped(ctx, size, () => {
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(1, squash)
      const grad = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius)
      grad.addColorStop(0, css(color, alpha))
      grad.addColorStop(0.6, css(color, alpha * 0.65))
      grad.addColorStop(1, css(color, 0))
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(0, 0, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })
  }

  // Big soft hollows and rises: far bigger than any sprite.
  for (let i = 0; i < 5; i++) patch(rnd() * size, rnd() * size, size * (0.25 + rnd() * 0.18), opts.dark, 0.45, 0.75 + rnd() * 0.2)
  for (let i = 0; i < 4; i++) patch(rnd() * size, rnd() * size, size * (0.2 + rnd() * 0.15), opts.light, 0.4, 0.75 + rnd() * 0.2)
  // Mid-size mottling, very faint, so the ground has a painted texture.
  for (let i = 0; i < 40; i++) {
    patch(rnd() * size, rnd() * size, 20 + rnd() * 50, rnd() < 0.5 ? opts.dark : opts.light, 0.12 + rnd() * 0.1, 0.6 + rnd() * 0.3)
  }
  // Fine speckle: hundreds of tiny dabs just off the base colour.
  for (let i = 0; i < 900; i++) {
    const x = rnd() * size
    const y = rnd() * size
    const r = 0.8 + rnd() * 1.8
    ctx.fillStyle = css(rnd() < 0.5 ? opts.speckle : mix(opts.base, opts.light, 0.6), 0.25 + rnd() * 0.2)
    ctx.beginPath()
    ctx.ellipse(x, y, r * 1.4, r, rnd() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
  opts.extra?.(ctx, size, rnd)
  return { canvas, ctx, size, pad: 0 }
}

/** Soft grass strokes scattered over a floor, wrapped so the tile stays seamless. */
function grassStrokes(color: number, count: number, alpha: number) {
  return (ctx: CanvasRenderingContext2D, size: number, rnd: () => number): void => {
    ctx.strokeStyle = css(color, alpha)
    ctx.lineCap = 'round'
    ctx.lineWidth = 1.6
    for (let i = 0; i < count; i++) {
      const x = rnd() * size
      const y = rnd() * size
      const lean = (rnd() - 0.5) * 4
      const h = 4 + rnd() * 5
      wrapped(ctx, size, () => {
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.quadraticCurveTo(x + lean * 0.3, y - h * 0.6, x + lean, y - h)
        ctx.stroke()
      })
    }
  }
}

export const meadow: Painter = () =>
  paintFloor({
    seed: 12,
    base: P.grass,
    dark: P.grassDark,
    light: 0xcdf0b6,
    speckle: 0xa8dc90,
    extra: grassStrokes(0x9fd488, 160, 0.55),
  })

export const forest: Painter = () =>
  paintFloor({
    seed: 34,
    base: P.forestFloor,
    dark: P.forestDark,
    light: 0xaed09e,
    speckle: 0x86b478,
    extra: grassStrokes(0x80ad72, 110, 0.5),
  })

