/**
 * What the weapons throw, plus the two props that weapons leave behind.
 *
 * Friendly shots are bright, saturated and carry a faint glow so they separate
 * from the floor in a crowd; the one enemy shot (the raindrop) is a solid deep
 * blue with a hard outline so it never reads as one of yours.
 */
import {
  blush,
  circle,
  css,
  ell,
  eyes,
  glow,
  heartPath,
  inkedStroke,
  makeCanvas,
  makeRect,
  mouth,
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

// -------------------------------------------------------------------- bubbles

/** A soap bubble: clear in the middle, rainbow round the rim, one big gleam. */
export function paintBubble(size: number, hue: 'pastel' | 'rainbow'): Canvas2D {
  const c = makeCanvas(size)
  const { ctx } = c
  const m = size / 2
  const r = size * 0.4
  glow(ctx, m, m, r * 1.25, hue === 'rainbow' ? P.pink : P.sky, 0.35)
  const body = ctx.createRadialGradient(m - r * 0.2, m - r * 0.25, r * 0.1, m, m, r)
  body.addColorStop(0, css(P.white, 0.15))
  body.addColorStop(0.7, css(0xd8f0ff, 0.35))
  body.addColorStop(1, css(0xbfe4ff, 0.8))
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(m, m, r, 0, Math.PI * 2)
  ctx.fill()
  // Iridescent rim.
  const rim = ctx.createLinearGradient(m - r, m - r, m + r, m + r)
  const stops = hue === 'rainbow' ? [P.pinkHot, P.gold, P.mint, P.blue, P.purple] : [0xff9ecf, 0xa9dcff, 0xb8f5e0, 0xd6c6ff]
  stops.forEach((s, i) => rim.addColorStop(i / (stops.length - 1), css(s)))
  ctx.strokeStyle = rim
  ctx.lineWidth = size * 0.075
  ctx.beginPath()
  ctx.arc(m, m, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = size * 0.03
  ctx.strokeStyle = css(0x5a7ab0, 0.55)
  ctx.beginPath()
  ctx.arc(m, m, r + size * 0.05, 0, Math.PI * 2)
  ctx.stroke()
  // The window reflection that makes it a bubble rather than a ring.
  ctx.save()
  ctx.translate(m - r * 0.38, m - r * 0.4)
  ctx.rotate(-0.6)
  ctx.fillStyle = css(P.white, 0.95)
  ctx.beginPath()
  ctx.ellipse(0, 0, r * 0.34, r * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  circle(ctx, m + r * 0.45, m + r * 0.42, r * 0.1, P.white)
  return c
}

export const bubble: Painter = () => paintBubble(22, 'pastel')

// ---------------------------------------------------------------- spike burrs

/** A chestnut burr: a ring of soft spines round a glossy nut. */
export function paintBurr(size: number, spine: number, nut: number, rings = 1): Canvas2D {
  const c = makeCanvas(size, 1, Math.max(1, size * 0.06))
  const { ctx } = c
  const m = size / 2
  const outer = size * 0.46
  const inner = size * 0.24
  const spikes = 12
  const burr = shape(
    (g) => {
      for (let i = 0; i < spikes; i++) {
        const a0 = (i / spikes) * Math.PI * 2
        const a1 = ((i + 0.5) / spikes) * Math.PI * 2
        const a2 = ((i + 1) / spikes) * Math.PI * 2
        if (i === 0) g.moveTo(m + Math.cos(a0) * inner * 1.3, m + Math.sin(a0) * inner * 1.3)
        g.quadraticCurveTo(m + Math.cos(a1 - 0.08) * outer * 0.8, m + Math.sin(a1 - 0.08) * outer * 0.8, m + Math.cos(a1) * outer, m + Math.sin(a1) * outer)
        g.quadraticCurveTo(m + Math.cos(a1 + 0.08) * outer * 0.8, m + Math.sin(a1 + 0.08) * outer * 0.8, m + Math.cos(a2) * inner * 1.3, m + Math.sin(a2) * inner * 1.3)
      }
      g.closePath()
    },
    { cx: m, cy: m, rx: outer, ry: outer },
    spine,
  )
  paintParts(ctx, [burr, ell(m, m, inner * 1.15, inner * 1.15, nut, { line: 'in', gloss: 0.6 })], size * 0.07)
  if (rings > 1) sparkle(ctx, m - inner * 0.4, m - inner * 0.5, size * 0.12, P.white, 0.9)
  return c
}

export const spike: Painter = () => paintBurr(22, 0xd9a86a, 0x8a5a3a)

// -------------------------------------------------------------------- carrots

export function paintCarrot(size: number, body: number, leaf: number, shiny: boolean): Canvas2D {
  const c = makeCanvas(size, 1, size * 0.13)
  const { ctx } = c
  const s = size / 26
  const cx = size / 2
  if (shiny) glow(ctx, cx, size * 0.55, size * 0.5, P.gold, 0.5)
  const root = shape(
    (g) => {
      g.moveTo(cx - 5.5 * s, 7 * s)
      g.quadraticCurveTo(cx, 5 * s, cx + 5.5 * s, 7 * s)
      g.quadraticCurveTo(cx + 4 * s, 16 * s, cx + 0.6 * s, 23.5 * s)
      g.quadraticCurveTo(cx, 24.5 * s, cx - 0.6 * s, 23.5 * s)
      g.quadraticCurveTo(cx - 4 * s, 16 * s, cx - 5.5 * s, 7 * s)
      g.closePath()
    },
    { cx, cy: 14 * s, rx: 5 * s, ry: 9 * s },
    body,
  )
  paintParts(ctx, [
    ell(cx - 3.2 * s, 4 * s, 2.2 * s, 3.8 * s, leaf, { rot: -0.4 }),
    ell(cx + 3.2 * s, 4 * s, 2.2 * s, 3.8 * s, leaf, { rot: 0.4 }),
    ell(cx, 3 * s, 2.2 * s, 4 * s, leaf),
    root,
  ], 1.5 * s)
  ctx.save()
  ctx.strokeStyle = css(0x000000, 0.18)
  ctx.lineWidth = 0.9 * s
  for (const [y, w] of [
    [11, 3],
    [15, 2.4],
    [19, 1.6],
  ] as const) {
    ctx.beginPath()
    ctx.moveTo(cx - w * s, y * s)
    ctx.lineTo(cx + w * 0.3 * s, y * s + 0.6 * s)
    ctx.stroke()
  }
  ctx.restore()
  eyes(ctx, cx, 11 * s, 1.8 * s, 1.3 * s, { style: 'happy', weight: 0.5 })
  if (shiny) {
    sparkle(ctx, cx + 5 * s, 9 * s, 2.4 * s, P.white, 1)
    sparkle(ctx, cx - 4 * s, 18 * s, 1.6 * s, P.white, 0.9)
  }
  return c
}

export const carrot: Painter = () => paintCarrot(26, 0xff9447, 0x5fcf7a, false)

// ------------------------------------------------------------ rocket kittens

export function paintKittenRocket(size: number, fur: number, flame: number, comet: boolean): Canvas2D {
  const c = makeCanvas(size, 1, 1)
  const { ctx } = c
  const s = size / 30
  const cy = size / 2 + 2 * s
  // The rocket points along +x; the sprite is rotated to face travel.
  const trail = ctx.createLinearGradient(0, cy, 9 * s, cy)
  trail.addColorStop(0, css(flame, 0))
  trail.addColorStop(0.6, css(flame, 0.95))
  trail.addColorStop(1, css(P.white, 1))
  ctx.fillStyle = trail
  ctx.beginPath()
  ctx.moveTo(9 * s, cy - (comet ? 5 : 3.5) * s)
  ctx.quadraticCurveTo(-1 * s, cy, 9 * s, cy + (comet ? 5 : 3.5) * s)
  ctx.closePath()
  ctx.fill()
  if (comet) {
    for (let i = 0; i < 3; i++) sparkle(ctx, (6 - i * 2.5) * s, cy + (i - 1) * 4 * s, (2 - i * 0.4) * s, P.white, 0.95)
  }
  const hull = comet ? 0x9ab8ff : 0xff6a7a
  const body = shape(
    (g) => {
      g.moveTo(8 * s, cy - 4 * s)
      g.lineTo(21 * s, cy - 4 * s)
      g.quadraticCurveTo(28.5 * s, cy, 21 * s, cy + 4 * s)
      g.lineTo(8 * s, cy + 4 * s)
      g.quadraticCurveTo(6.5 * s, cy, 8 * s, cy - 4 * s)
      g.closePath()
    },
    { cx: 17 * s, cy, rx: 10 * s, ry: 4 * s },
    0xfaf6ff,
  )
  const fin = (side: number): Part =>
    shape(
      (g) => {
        g.moveTo(9 * s, cy + side * 3 * s)
        g.lineTo(6 * s, cy + side * 7.5 * s)
        g.lineTo(13 * s, cy + side * 3.5 * s)
        g.closePath()
      },
      { cx: 9 * s, cy: cy + side * 5 * s, rx: 3 * s, ry: 2.5 * s },
      hull,
    )
  const nose = shape(
    (g) => {
      g.moveTo(21 * s, cy - 4 * s)
      g.quadraticCurveTo(28.5 * s, cy, 21 * s, cy + 4 * s)
      g.closePath()
    },
    { cx: 23 * s, cy, rx: 3 * s, ry: 4 * s },
    hull,
    { line: 'none' },
  )
  // The kitten, poking her head out of the hatch with her ears flat back.
  const ear = (dx: number): Part =>
    shape(
      (g) => {
        g.moveTo(dx - 2.4 * s, cy - 8 * s)
        g.lineTo(dx - 1.2 * s, cy - 14 * s)
        g.lineTo(dx + 2.4 * s, cy - 9 * s)
        g.closePath()
      },
      { cx: dx, cy: cy - 10 * s, rx: 2.4 * s, ry: 3 * s },
      fur,
    )
  paintParts(ctx, [fin(-1), fin(1), ear(12.5 * s), ear(18.5 * s), ell(15.5 * s, cy - 6.5 * s, 5.4 * s, 4.6 * s, fur), body, nose], 1.4 * s, 0x5a2a3a)
  // porthole stripe
  ctx.fillStyle = css(hull)
  ctx.fillRect(12.5 * s, cy - 0.6 * s, 5 * s, 3 * s)
  eyes(ctx, 16.2 * s, cy - 7 * s, 2.3 * s, 1.5 * s, { style: comet ? 'sparkly' : 'happy', iris: 0xe0a030 })
  mouth(ctx, 16.2 * s, cy - 4.8 * s, 1.1 * s, 'cat')
  blush(ctx, 16.2 * s, cy - 5.4 * s, 4 * s, 1.3 * s, 0.9 * s)
  return c
}

export const kittenMissile: Painter = () => paintKittenRocket(30, 0xffd8b8, P.gold, false)

// ------------------------------------------------------------------ frosting

export function paintFrosting(size: number, color: number): Canvas2D {
  const c = makeCanvas(size, 1, 1)
  const { ctx } = c
  const m = size / 2
  const r = size * 0.36
  const blob = shape(
    (g) => {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2
        const x = m + Math.cos(a) * r * 0.7
        const y = m + Math.sin(a) * r * 0.7
        g.moveTo(x + r * 0.5, y)
        g.arc(x, y, r * 0.5, 0, Math.PI * 2)
      }
      g.moveTo(m + r * 0.8, m)
      g.arc(m, m, r * 0.8, 0, Math.PI * 2)
    },
    { cx: m, cy: m, rx: r, ry: r },
    color,
    { gloss: 0.7 },
  )
  paintParts(ctx, [blob], size * 0.07)
  const rnd = seededRandom(size * 13 + color)
  const sprinkles = [P.lemon, P.mint, P.sky, P.white]
  for (let i = 0; i < 5; i++) {
    const a = rnd() * Math.PI * 2
    const d = rnd() * r * 0.7
    ctx.save()
    ctx.translate(m + Math.cos(a) * d, m + Math.sin(a) * d)
    ctx.rotate(rnd() * Math.PI)
    ctx.fillStyle = css(sprinkles[i % sprinkles.length])
    ctx.beginPath()
    ctx.roundRect(-size * 0.07, -size * 0.025, size * 0.14, size * 0.05, size * 0.025)
    ctx.fill()
    ctx.restore()
  }
  return c
}

export const frosting: Painter = () => paintFrosting(18, 0xffa6d0)

// ---------------------------------------------------------------------- boba

export function paintBoba(size: number, pearl: number, sugary: boolean): Canvas2D {
  const c = makeCanvas(size)
  const { ctx } = c
  const m = size / 2
  const r = size * 0.36
  if (sugary) glow(ctx, m, m, r * 1.6, P.gold, 0.4)
  paintParts(ctx, [ell(m, m, r, r, pearl, { gloss: 0.85, shadow: 0.6 })], size * 0.07)
  // A second, sharper gleam: tapioca is very shiny.
  circle(ctx, m + r * 0.35, m + r * 0.35, r * 0.12, P.white)
  if (sugary) {
    const rnd = seededRandom(7)
    for (let i = 0; i < 6; i++) {
      const a = rnd() * Math.PI * 2
      circle(ctx, m + Math.cos(a) * r * 0.7, m + Math.sin(a) * r * 0.7, size * 0.03, 0xfff2c8)
    }
  }
  return c
}

export const boba: Painter = () => paintBoba(20, 0x5a3a36, false)

// ------------------------------------------------------------------ stickers

/**
 * A die-cut sticker: the design, a fat white border following its outline, and
 * a soft drop shadow — so Sticker Storm literally rains stickers.
 */
export function paintStarSticker(size: number, fill: number, points = 5, face = true): Canvas2D {
  const c = makeCanvas(size, 1, 1)
  const { ctx } = c
  const m = size / 2
  const r = size * 0.4
  ctx.save()
  ctx.translate(size * 0.04, size * 0.07)
  ctx.beginPath()
  starPath(ctx, m, m, r, points, 0.52)
  ctx.lineJoin = 'round'
  ctx.lineWidth = size * 0.2
  ctx.strokeStyle = css(P.shadow, 0.3)
  ctx.stroke()
  ctx.restore()
  ctx.beginPath()
  starPath(ctx, m, m, r, points, 0.52)
  ctx.lineJoin = 'round'
  ctx.lineWidth = size * 0.2
  ctx.strokeStyle = css(P.white)
  ctx.stroke()
  paintParts(ctx, [shape((g) => starPath(g, m, m, r, points, 0.52), { cx: m, cy: m, rx: r, ry: r }, fill, { line: 'none', gloss: 0.4 })])
  ctx.beginPath()
  starPath(ctx, m, m, r, points, 0.52)
  ctx.lineWidth = size * 0.035
  ctx.strokeStyle = css(0xd9a030, 0.7)
  ctx.stroke()
  if (face) {
    eyes(ctx, m, m, size * 0.09, size * 0.055, { style: 'happy', weight: 0.6 })
    blush(ctx, m, m + size * 0.06, size * 0.15, size * 0.05, size * 0.035)
    mouth(ctx, m, m + size * 0.08, size * 0.05, 'smile')
  }
  return c
}

export const sticker: Painter = () => paintStarSticker(26, 0xffe070)

// ---------------------------------------------------------------------- geese

const GOOSE = 0xfafaff

export function paintGoose(size: number, furious: boolean): Canvas2D {
  const c = makeCanvas(size, 1, size * 0.08)
  const { ctx } = c
  const s = size / 32
  const cx = size / 2
  const cy = size / 2 + 1 * s
  const body = ell(cx - 3 * s, cy + 4 * s, 10 * s, 7.5 * s, GOOSE)
  const neck = shape(
    (g) => {
      g.moveTo(cx + 1 * s, cy + 2 * s)
      g.quadraticCurveTo(cx + 2 * s, cy - 6 * s, cx + 4 * s, cy - 8 * s)
      g.lineTo(cx + 9 * s, cy - 6 * s)
      g.quadraticCurveTo(cx + 7 * s, cy - 2 * s, cx + 7 * s, cy + 3 * s)
      g.closePath()
    },
    { cx: cx + 5 * s, cy: cy - 2 * s, rx: 4 * s, ry: 6 * s },
    GOOSE,
  )
  const head = ell(cx + 5 * s, cy - 8 * s, 5.5 * s, 5 * s, GOOSE)
  const beak = shape(
    (g) => {
      g.moveTo(cx + 9 * s, cy - 10 * s)
      g.quadraticCurveTo(cx + 16 * s, cy - 9 * s, cx + 15.5 * s, cy - 6.5 * s)
      g.quadraticCurveTo(cx + 12 * s, cy - 5 * s, cx + 9 * s, cy - 6 * s)
      g.closePath()
    },
    { cx: cx + 12 * s, cy: cy - 8 * s, rx: 3.5 * s, ry: 2 * s },
    0xffa33a,
    { line: 'in' },
  )
  const wing = ell(cx - 5 * s, cy + 3 * s, 6.5 * s, 4.2 * s, 0xe8e6f2, { line: 'in', rot: 0.2 })
  const tail = shape(
    (g) => {
      g.moveTo(cx - 11 * s, cy + 1 * s)
      g.lineTo(cx - 16 * s, cy - 2 * s)
      g.lineTo(cx - 12 * s, cy + 5 * s)
      g.closePath()
    },
    { cx: cx - 13 * s, cy: cy + 1 * s, rx: 3 * s, ry: 3 * s },
    GOOSE,
  )
  if (furious) glow(ctx, cx, cy, size * 0.48, 0xff7a5a, 0.45)
  paintParts(ctx, [tail, body, neck, head, wing, beak], 1.6 * s, 0x4a4466)
  eyes(ctx, cx + 5.5 * s, cy - 8.5 * s, 0.01, 2 * s, { style: 'grumpy', lid: GOOSE, iris: 0x5a5a8a })
  // A cross little vein, for emphasis. It is furious.
  if (furious) {
    ctx.save()
    ctx.strokeStyle = css(0xff4a5a)
    ctx.lineWidth = 1 * s
    const vx = cx + 1 * s
    const vy = cy - 13 * s
    for (const [dx, dy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ] as const) {
      ctx.beginPath()
      ctx.moveTo(vx + dx * 0.6 * s, vy + dy * 0.6 * s)
      ctx.quadraticCurveTo(vx + dx * 1.8 * s, vy, vx + dx * 2 * s, vy + dy * 2 * s)
      ctx.stroke()
    }
    ctx.restore()
  }
  return c
}

export const goose: Painter = () => paintGoose(32, false)

// ---------------------------------------------------------------------- cones

export function paintCone(size: number, scoops: readonly number[], cherry: boolean): Canvas2D {
  const c = makeCanvas(size, 1, size * 0.08)
  const { ctx } = c
  const s = size / 26
  const cx = size / 2
  const wafer = shape(
    (g) => {
      g.moveTo(cx - 6.5 * s, 12 * s)
      g.lineTo(cx + 6.5 * s, 12 * s)
      g.quadraticCurveTo(cx + 1 * s, 24 * s, cx, 24.5 * s)
      g.quadraticCurveTo(cx - 1 * s, 24 * s, cx - 6.5 * s, 12 * s)
      g.closePath()
    },
    { cx, cy: 17 * s, rx: 6 * s, ry: 7 * s },
    0xf2b872,
  )
  const parts: Part[] = [wafer]
  const spots = [
    [cx - 3 * s, 9 * s, 5 * s],
    [cx + 3.2 * s, 8.5 * s, 4.8 * s],
    [cx, 4.5 * s, 4.6 * s],
  ] as const
  scoops.forEach((col, i) => {
    const [x, y, r] = spots[i % spots.length]
    parts.push(ell(x, y, r, r * 0.92, col, { gloss: 0.45 }))
  })
  paintParts(ctx, parts, 1.4 * s)
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(cx - 6.5 * s, 12 * s)
  ctx.lineTo(cx + 6.5 * s, 12 * s)
  ctx.lineTo(cx, 24.5 * s)
  ctx.closePath()
  ctx.clip()
  ctx.strokeStyle = css(0xb0763a, 0.7)
  ctx.lineWidth = 0.8 * s
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath()
    ctx.moveTo(cx + i * 3 * s - 6 * s, 12 * s)
    ctx.lineTo(cx + i * 3 * s + 6 * s, 25 * s)
    ctx.moveTo(cx + i * 3 * s + 6 * s, 12 * s)
    ctx.lineTo(cx + i * 3 * s - 6 * s, 25 * s)
    ctx.stroke()
  }
  ctx.restore()
  if (cherry) {
    paintParts(ctx, [ell(cx + 1 * s, 0.5 * s + 1.8 * s, 2.3 * s, 2.3 * s, 0xff4a6a, { gloss: 0.8 })], 1 * s)
  }
  return c
}

export const cone: Painter = () => paintCone(26, [0xffb3d9, 0xa8f0d8, 0xfff0a0], false)

// ----------------------------------------------------------------- raindrops

/** The only enemy projectile. Deep blue, hard-edged, faintly glowing. */
export const raindrop: Painter = () => {
  const c = makeCanvas(18)
  const { ctx } = c
  const cx = 9
  glow(ctx, cx, 10, 8.5, 0x5b8cff, 0.35)
  paintParts(ctx, [
    shape(
      (g) => {
        g.moveTo(cx, 2)
        g.bezierCurveTo(cx + 6.5, 8.5, cx + 5.5, 15, cx, 15)
        g.bezierCurveTo(cx - 5.5, 15, cx - 6.5, 8.5, cx, 2)
        g.closePath()
      },
      { cx, cy: 10, rx: 5.5, ry: 6.5 },
      0x4f8ff0,
      { gloss: 0.8 },
    ),
  ], 1.5, 0x1f2a6a)
  return c
}

// ----------------------------------------------------------------- cupcakes

export function paintCupcake(size: number, icing: number, castle: boolean): Canvas2D {
  const c = makeCanvas(size)
  const { ctx } = c
  const s = size / 32
  const cx = size / 2
  const cy = size / 2 + 2 * s
  const wrapper = shape(
    (g) => {
      g.moveTo(cx - 9.5 * s, cy)
      g.lineTo(cx + 9.5 * s, cy)
      g.lineTo(cx + 7 * s, cy + 11 * s)
      g.quadraticCurveTo(cx, cy + 12.5 * s, cx - 7 * s, cy + 11 * s)
      g.closePath()
    },
    { cx, cy: cy + 5 * s, rx: 9 * s, ry: 6 * s },
    castle ? 0x9ad8ff : 0xffc98a,
  )
  const parts: Part[] = [
    wrapper,
    ell(cx - 5 * s, cy - 2.5 * s, 6 * s, 5 * s, icing),
    ell(cx + 5 * s, cy - 2.5 * s, 6 * s, 5 * s, icing),
    ell(cx, cy - 7.5 * s, 6.5 * s, 5.5 * s, tint(icing, 0.15), { gloss: 0.5 }),
  ]
  if (castle) {
    // Turret towers either side: it's a fortress now.
    for (const side of [-1, 1]) {
      parts.unshift(
        shape(
          (g) => {
            g.rect(cx + side * 10 * s - 3 * s, cy - 4 * s, 6 * s, 14 * s)
          },
          { cx: cx + side * 10 * s, cy: cy + 3 * s, rx: 3 * s, ry: 7 * s },
          0xffe0ec,
        ),
      )
    }
  }
  paintParts(ctx, parts, 1.5 * s)
  ctx.save()
  ctx.strokeStyle = css(0x000000, 0.13)
  ctx.lineWidth = 1 * s
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath()
    ctx.moveTo(cx + i * 3.4 * s, cy + 0.8 * s)
    ctx.lineTo(cx + i * 2.6 * s, cy + 10.5 * s)
    ctx.stroke()
  }
  ctx.restore()
  if (castle) {
    for (const side of [-1, 1]) {
      paintParts(ctx, [
        shape(
          (g) => {
            g.moveTo(cx + side * 10 * s - 4 * s, cy - 4 * s)
            g.lineTo(cx + side * 10 * s, cy - 10 * s)
            g.lineTo(cx + side * 10 * s + 4 * s, cy - 4 * s)
            g.closePath()
          },
          { cx: cx + side * 10 * s, cy: cy - 7 * s, rx: 4 * s, ry: 3 * s },
          0xff7eb6,
        ),
      ], 1.2 * s)
    }
  }
  // A cherry heart on top.
  ctx.beginPath()
  heartPath(ctx, cx, cy - 13 * s, 3.2 * s)
  ctx.fillStyle = css(0xff5a8a)
  ctx.fill()
  ctx.lineWidth = 1 * s
  ctx.strokeStyle = css(0x8a2a4a)
  ctx.stroke()
  eyes(ctx, cx, cy + 4 * s, 3.4 * s, 2.1 * s, { style: 'happy', weight: 0.55 })
  blush(ctx, cx, cy + 6.5 * s, 6 * s, 2 * s, 1.4 * s)
  mouth(ctx, cx, cy + 6.5 * s, 1.4 * s, 'cat')
  return c
}

export const cupcake: Painter = () => paintCupcake(32, 0xffb3d9, false)

// ---------------------------------------------------------------- umbrellas

/**
 * The Brave Brolly.
 *
 * Drawn with the canopy bulging towards +x and the handle trailing at -x, so
 * rotating the sprite to the angle the umbrella should *face* puts the canopy on
 * the far side of the player and the handle in their paw.
 */
export function paintUmbrella(size: number, colours: readonly number[]): Canvas2D {
  const c = makeCanvas(size, 1, size * 0.04)
  const { ctx } = c
  const s = size / 56
  const cx = 22 * s
  const cy = 28 * s
  const span = 24 * s
  inkedStroke(ctx, (g) => {
    g.moveTo(cx - 2 * s, cy)
    g.lineTo(cx - 15 * s, cy)
    g.quadraticCurveTo(cx - 21 * s, cy, cx - 20 * s, cy + 6 * s)
  }, 0xc98a5a, 2.6 * s, 0x5a3a2a)
  const panels = colours.length
  const canopy: Part[] = []
  for (let i = 0; i < panels; i++) {
    const a0 = -Math.PI / 2 + (i / panels) * Math.PI
    const a1 = -Math.PI / 2 + ((i + 1) / panels) * Math.PI
    const mid = (a0 + a1) / 2
    canopy.push(
      shape(
        (g) => {
          g.moveTo(cx, cy)
          g.arc(cx, cy, span, a0, a1)
          // Scalloped edge: each panel bows out between its ribs.
          g.closePath()
        },
        { cx: cx + Math.cos(mid) * span * 0.6, cy: cy + Math.sin(mid) * span * 0.6, rx: span * 0.45, ry: span * 0.45 },
        colours[i],
        { line: 'in' },
      ),
    )
  }
  const dome = shape(
    (g) => {
      g.moveTo(cx, cy - span)
      g.arc(cx, cy, span, -Math.PI / 2, Math.PI / 2)
      g.closePath()
    },
    { cx: cx + span * 0.5, cy, rx: span * 0.5, ry: span },
    colours[0],
  )
  paintParts(ctx, [dome, ...canopy], 1.8 * s, 0x6a2a4a)
  for (let i = 0; i < panels; i++) {
    const a = -Math.PI / 2 + ((i + 0.5) / panels) * Math.PI
    paintParts(ctx, [ell(cx + Math.cos(a) * span, cy + Math.sin(a) * span, 3.2 * s, 3.2 * s, colours[i], { shadow: 0.4 })], 1.2 * s, 0x6a2a4a)
  }
  paintParts(ctx, [ell(cx + 2 * s, cy, 3.4 * s, 3.4 * s, P.lemon, { gloss: 0.7 })], 1.3 * s, 0x8a5a1a)
  ctx.save()
  ctx.globalAlpha = 0.45
  ctx.fillStyle = css(P.white)
  ctx.beginPath()
  ctx.ellipse(cx + 10 * s, cy - 12 * s, 5 * s, 2.4 * s, 0.9, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  return c
}

export const umbrella: Painter = () => paintUmbrella(56, [P.cream, P.pinkHot, P.cream, P.pinkHot, P.cream])

// -------------------------------------------------------------- beams, fx

export function paintBeam(bands: readonly number[]): Canvas2D {
  const c = makeRect(240, 22)
  const { ctx } = c
  const grad = ctx.createLinearGradient(0, 0, 0, 22)
  bands.forEach((color, i) => grad.addColorStop(i / (bands.length - 1), css(color, 0.95)))
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.roundRect(0, 1, 240, 20, 10)
  ctx.fill()
  // A bright core so the beam feels like light rather than a stripy ribbon.
  const core = ctx.createLinearGradient(0, 6, 0, 16)
  core.addColorStop(0, css(P.white, 0))
  core.addColorStop(0.5, css(P.white, 0.85))
  core.addColorStop(1, css(P.white, 0))
  ctx.fillStyle = core
  ctx.fillRect(4, 6, 232, 10)
  const rnd = seededRandom(bands.length * 97)
  for (let i = 0; i < 14; i++) sparkle(ctx, 10 + rnd() * 220, 4 + rnd() * 14, 1.5 + rnd() * 2, P.white, 0.9)
  return c
}

export const beam: Painter = () => paintBeam([P.pinkHot, P.gold, P.lemon, P.mint, P.sky, P.purple])

