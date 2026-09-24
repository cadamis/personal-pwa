/**
 * Floors, obstacles and ground decoration for Frosty Peaks, Candy Carnival and
 * Starlight Dreamland. Same rules as {@link ./world}: floors are
 * value-compressed and decorations sit close to their floor's colour, so the
 * Grumps and the shots are always the loudest things on screen.
 */
import {
  css,
  ell,
  glow,
  groundShadow,
  heartPath,
  inkedStroke,
  makeCanvas,
  mix,
  P,
  paintParts,
  seededRandom,
  shape,
  sparkle,
  starPath,
  wrapped,
  type Canvas2D,
  type Part,
} from '../draw'
import { paintFloor } from './world'

export type Painter = (frame: number) => Canvas2D

// ------------------------------------------------------------------ floors

export const peaks: Painter = () =>
  paintFloor({
    seed: 56,
    base: P.snow,
    dark: P.snowShade,
    light: 0xdae8f6,
    speckle: 0xbcd0e6,
    extra: (ctx, size, rnd) => {
      // Faint wind-swept drifts and a scatter of glints.
      ctx.strokeStyle = css(0xc8d8ee, 0.55)
      ctx.lineCap = 'round'
      ctx.lineWidth = 2
      for (let i = 0; i < 40; i++) {
        const x = rnd() * size
        const y = rnd() * size
        const len = 14 + rnd() * 20
        wrapped(ctx, size, () => {
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.quadraticCurveTo(x + len * 0.5, y - 3, x + len, y)
          ctx.stroke()
        })
      }
      for (let i = 0; i < 60; i++) {
        const x = rnd() * size
        const y = rnd() * size
        ctx.fillStyle = css(P.white, 0.8)
        ctx.fillRect(x, y, 1.5, 1.5)
      }
    },
  })

export const candy: Painter = () =>
  paintFloor({
    seed: 78,
    base: P.candyFloor,
    dark: P.candyShade,
    light: 0xffeef6,
    speckle: 0xf7c6dc,
    extra: (ctx, size, rnd) => {
      // Soft frosting swirls.
      ctx.strokeStyle = css(0xfff4fa, 0.32)
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      for (let i = 0; i < 14; i++) {
        const x = rnd() * size
        const y = rnd() * size
        const r = 10 + rnd() * 16
        wrapped(ctx, size, () => {
          ctx.beginPath()
          for (let t = 0; t < Math.PI * 3; t += 0.2) {
            const rr = (r * t) / (Math.PI * 3)
            const px = x + Math.cos(t) * rr
            const py = y + Math.sin(t) * rr * 0.8
            if (t === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          }
          ctx.stroke()
        })
      }
    },
  })

export const dream: Painter = () =>
  paintFloor({
    seed: 91,
    base: P.dusk,
    dark: P.duskDeep,
    light: P.duskLight,
    speckle: 0x5a4d8e,
    extra: (ctx, size, rnd) => {
      // Tiny faint stars, like a sky you're walking on.
      for (let i = 0; i < 140; i++) {
        const x = rnd() * size
        const y = rnd() * size
        const r = 0.6 + rnd() * 1.2
        ctx.fillStyle = css(0xfff6d8, 0.2 + rnd() * 0.35)
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
    },
  })

// --------------------------------------------------------------- obstacles

/** A grey-blue rock wearing a cap of snow. */
export const snowRock: Painter = () => {
  const c = makeCanvas(50)
  const { ctx } = c
  const m = 25
  groundShadow(ctx, m, m + 13, 19, 4.5, 0.3)
  const rnd = seededRandom(12)
  const rock = shape(
    (g) => {
      const n = 9
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2
        const r = 13 + rnd() * 3
        const x = m + Math.cos(a) * r * 1.1
        const y = m + 2 + Math.sin(a) * r * 0.85
        if (i === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.closePath()
    },
    { cx: m, cy: m + 2, rx: 15, ry: 12 },
    0x8a98c0,
  )
  paintParts(ctx, [
    rock,
    shape(
      (g) => {
        g.moveTo(m - 14, m - 1)
        g.quadraticCurveTo(m - 12, m - 13, m, m - 12)
        g.quadraticCurveTo(m + 12, m - 13, m + 15, m - 2)
        g.quadraticCurveTo(m + 9, m + 1, m + 5, m - 2)
        g.quadraticCurveTo(m, m + 3, m - 5, m - 1)
        g.quadraticCurveTo(m - 10, m + 2, m - 14, m - 1)
        g.closePath()
      },
      { cx: m, cy: m - 6, rx: 15, ry: 7 },
      0xf8fbff,
      { line: 'in' },
    ),
  ], 2, 0x2e3a60)
  sparkle(ctx, m + 8, m - 10, 2, P.white, 1)
  return c
}

/** A round little pine, heavy with snow. Compact, so it sits nicely in the crowd. */
export const snowPine: Painter = () => {
  const c = makeCanvas(50)
  const { ctx } = c
  const m = 25
  groundShadow(ctx, m, m + 16, 15, 4, 0.3)
  const layer = (y: number, w: number, h: number): Part =>
    shape(
      (g) => {
        g.moveTo(m, y - h)
        g.quadraticCurveTo(m + w * 0.4, y - h * 0.5, m + w, y)
        g.quadraticCurveTo(m, y + 3, m - w, y)
        g.quadraticCurveTo(m - w * 0.4, y - h * 0.5, m, y - h)
        g.closePath()
      },
      { cx: m, cy: y - h / 2, rx: w, ry: h / 2 },
      0x5a9a7a,
    )
  paintParts(ctx, [
    shape((g) => g.rect(m - 3, m + 10, 6, 7), { cx: m, cy: m + 13, rx: 3, ry: 3.5 }, 0x8a5a3a),
    layer(m + 12, 16, 14),
    layer(m + 3, 13, 13),
    layer(m - 6, 10, 12),
  ], 2, 0x1e3e3a)
  // Snow on each tier.
  ctx.fillStyle = css(0xf6faff)
  for (const [y, w] of [
    [m - 16, 5],
    [m - 7, 8],
    [m + 2, 11],
  ] as const) {
    ctx.beginPath()
    ctx.ellipse(m, y + 4, w, 2.6, 0, Math.PI, 0)
    ctx.fill()
  }
  sparkle(ctx, m - 6, m - 14, 1.8, P.white, 1)
  return c
}

/** A cluster of glowing ice crystals. */
export const iceCrystal: Painter = () => {
  const c = makeCanvas(50)
  const { ctx } = c
  const m = 25
  groundShadow(ctx, m, m + 13, 16, 4, 0.28)
  glow(ctx, m, m, 20, 0x9ad8ff, 0.3)
  const crystal = (x: number, h: number, lean: number, col: number): Part =>
    shape(
      (g) => {
        g.moveTo(x - 4, m + 12)
        g.lineTo(x - 4 + lean, m + 12 - h * 0.7)
        g.lineTo(x + lean, m + 12 - h)
        g.lineTo(x + 4 + lean, m + 12 - h * 0.7)
        g.lineTo(x + 4, m + 12)
        g.closePath()
      },
      { cx: x + lean / 2, cy: m + 12 - h / 2, rx: 4, ry: h / 2 },
      col,
      { gloss: 0.5 },
    )
  paintParts(ctx, [
    crystal(m - 9, 16, -4, 0x9ad8ff),
    crystal(m + 9, 18, 4, 0x8ac8f5),
    crystal(m, 26, 0, 0xb8e8ff),
  ], 1.8, 0x1f4a7a)
  sparkle(ctx, m + 2, m - 10, 2.4, P.white, 1)
  return c
}

/** A big sugar-dusted gumdrop. */
export function paintGumdrop(colour: number): Canvas2D {
  const c = makeCanvas(50)
  const { ctx } = c
  const m = 25
  groundShadow(ctx, m, m + 13, 18, 4.5, 0.28)
  const drop = shape(
    (g) => {
      g.moveTo(m - 16, m + 11)
      g.bezierCurveTo(m - 17, m - 6, m - 8, m - 14, m, m - 14)
      g.bezierCurveTo(m + 8, m - 14, m + 17, m - 6, m + 16, m + 11)
      g.quadraticCurveTo(m, m + 15, m - 16, m + 11)
      g.closePath()
    },
    { cx: m, cy: m, rx: 16, ry: 13 },
    colour,
    { gloss: 0.6 },
  )
  paintParts(ctx, [drop], 2, 0x5a1a3a)
  const rnd = seededRandom(colour)
  ctx.fillStyle = css(P.white, 0.85)
  for (let i = 0; i < 26; i++) {
    const x = m - 13 + rnd() * 26
    const y = m - 10 + rnd() * 20
    ctx.fillRect(x, y, 1.1, 1.1)
  }
  return c
}

export const gumdrop: Painter = () => paintGumdrop(0x7ae0a8)

/** A swirly lollipop planted in the ground. */
export const lollipop: Painter = () => {
  const c = makeCanvas(50)
  const { ctx } = c
  const m = 25
  groundShadow(ctx, m, m + 16, 13, 3.5, 0.28)
  inkedStroke(ctx, (g) => {
    g.moveTo(m, m + 16)
    g.lineTo(m, m + 2)
  }, 0xfff6f0, 3, 0x6a4a5a)
  paintParts(ctx, [ell(m, m - 5, 15, 15, 0xffe0f0, { gloss: 0.5 })], 2, 0x6a1a4a)
  ctx.save()
  ctx.beginPath()
  ctx.arc(m, m - 5, 15, 0, Math.PI * 2)
  ctx.clip()
  ctx.lineWidth = 3.4
  const cols = [0xff5aa0, 0x7ad8ff, 0xffd166]
  for (let k = 0; k < 3; k++) {
    ctx.strokeStyle = css(cols[k])
    ctx.beginPath()
    for (let t = 0; t < Math.PI * 4; t += 0.15) {
      const r = (t / (Math.PI * 4)) * 15
      const a = t + (k * Math.PI * 2) / 3
      const x = m + Math.cos(a) * r
      const y = m - 5 + Math.sin(a) * r
      if (t === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.restore()
  ctx.fillStyle = css(P.white, 0.55)
  ctx.beginPath()
  ctx.ellipse(m - 6, m - 11, 5, 2.6, -0.6, 0, Math.PI * 2)
  ctx.fill()
  return c
}

/** A giant cupcake, frosted, with a cherry. */
export const cupcakeHill: Painter = () => {
  const c = makeCanvas(50)
  const { ctx } = c
  const m = 25
  groundShadow(ctx, m, m + 15, 18, 4.5, 0.28)
  paintParts(ctx, [
    shape(
      (g) => {
        g.moveTo(m - 15, m + 1)
        g.lineTo(m + 15, m + 1)
        g.lineTo(m + 11, m + 15)
        g.quadraticCurveTo(m, m + 17, m - 11, m + 15)
        g.closePath()
      },
      { cx: m, cy: m + 8, rx: 14, ry: 7 },
      0xb8e0ff,
    ),
    ell(m - 8, m - 1, 9, 6.5, 0xfff4fa),
    ell(m + 8, m - 1, 9, 6.5, 0xfff4fa),
    ell(m, m - 7, 10, 7.5, 0xfffaff, { gloss: 0.5 }),
    ell(m + 1, m - 15, 3.4, 3.4, 0xff4a6a, { gloss: 0.8 }),
  ], 2, 0x5a2a4a)
  ctx.strokeStyle = css(0x000000, 0.12)
  ctx.lineWidth = 1.2
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath()
    ctx.moveTo(m + i * 4, m + 2)
    ctx.lineTo(m + i * 3, m + 15)
    ctx.stroke()
  }
  const rnd = seededRandom(5)
  const bits = [0xff7eb6, 0x7ad8ff, 0xffd166, 0x7ae08a]
  for (let i = 0; i < 10; i++) {
    ctx.save()
    ctx.translate(m - 12 + rnd() * 24, m - 10 + rnd() * 10)
    ctx.rotate(rnd() * Math.PI)
    ctx.fillStyle = css(bits[i % bits.length])
    ctx.fillRect(-1.5, -0.5, 3, 1.1)
    ctx.restore()
  }
  return c
}

/** A pale purple moon rock with craters. */
export const moonRock: Painter = () => {
  const c = makeCanvas(50)
  const { ctx } = c
  const m = 25
  groundShadow(ctx, m, m + 13, 18, 4.5, 0.35)
  paintParts(ctx, [ell(m, m + 1, 16, 13, 0x9a8ad0)], 2, 0x2a1e50)
  for (const [x, y, r] of [
    [m - 5, m - 2, 4],
    [m + 6, m + 4, 3],
    [m + 3, m - 6, 2.2],
  ] as const) {
    ctx.fillStyle = css(0x7a6ab8)
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = css(0xb8a8e8, 0.8)
    ctx.beginPath()
    ctx.ellipse(x + r * 0.2, y + r * 0.25, r * 0.7, r * 0.45, 0, 0, Math.PI)
    ctx.fill()
  }
  sparkle(ctx, m + 10, m - 8, 2, 0xfff6c8, 1)
  return c
}

/** A solid little cloud, the kind you could sit on. */
export const dreamCloud: Painter = () => {
  const c = makeCanvas(50)
  const { ctx } = c
  const m = 25
  groundShadow(ctx, m, m + 14, 18, 4, 0.3)
  const parts: Part[] = []
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2
    parts.push(ell(m + Math.cos(a) * 10, m + 2 + Math.sin(a) * 6, 7, 6, 0xe8dcff, { shadow: 0.6 }))
  }
  parts.push(ell(m, m, 12, 9, 0xf0e8ff))
  paintParts(ctx, parts, 2, 0x4a3a7a)
  return c
}

/** A little lantern with a star inside, glowing gently. */
export const starLamp: Painter = () => {
  const c = makeCanvas(50)
  const { ctx } = c
  const m = 25
  groundShadow(ctx, m, m + 16, 12, 3.5, 0.3)
  glow(ctx, m, m - 4, 20, 0xfff0a0, 0.45)
  paintParts(ctx, [
    shape((g) => g.rect(m - 2, m + 2, 4, 14), { cx: m, cy: m + 9, rx: 2, ry: 7 }, 0x6a5aa0),
    ell(m, m + 16, 6, 2.2, 0x6a5aa0),
    shape((g) => g.roundRect(m - 8, m - 14, 16, 16, 4), { cx: m, cy: m - 6, rx: 8, ry: 8 }, 0xfff8e0, { gloss: 0.5 }),
    ell(m, m - 15, 9, 3, 0x6a5aa0),
  ], 1.8, 0x2a1e50)
  ctx.beginPath()
  starPath(ctx, m, m - 6, 5.5, 5, 0.5)
  ctx.fillStyle = css(0xffd166)
  ctx.fill()
  return c
}

// ------------------------------------------------------------------ decals

function decal(size: number, draw: (ctx: CanvasRenderingContext2D, m: number) => void): Canvas2D {
  const c = makeCanvas(size)
  draw(c.ctx, size / 2)
  return c
}

export const decalSnowflakes: Painter = () =>
  decal(26, (ctx, m) => {
    ctx.strokeStyle = css(0xc4d6f0)
    ctx.lineWidth = 1.1
    ctx.lineCap = 'round'
    for (const [x, y, r] of [
      [m - 5, m - 2, 4],
      [m + 5, m + 4, 3],
    ] as const) {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI
        ctx.beginPath()
        ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r)
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
        ctx.stroke()
      }
    }
  })

export const decalSnowdrift: Painter = () =>
  decal(30, (ctx, m) => {
    ctx.fillStyle = css(0xf8fbff)
    ctx.beginPath()
    ctx.ellipse(m, m + 2, 11, 4, 0, 0, Math.PI * 2)
    ctx.ellipse(m - 5, m, 6, 4, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = css(0xd2e0f2)
    ctx.beginPath()
    ctx.ellipse(m + 2, m + 4.5, 9, 1.6, 0, 0, Math.PI * 2)
    ctx.fill()
  })

export const decalPawprints: Painter = () =>
  decal(28, (ctx, m) => {
    ctx.fillStyle = css(0xcad8ee)
    for (const [x, y, rot] of [
      [m - 6, m + 5, -0.3],
      [m + 1, m - 1, -0.2],
      [m + 7, m - 7, -0.3],
    ] as const) {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rot)
      ctx.beginPath()
      ctx.ellipse(0, 1, 2, 1.6, 0, 0, Math.PI * 2)
      for (const [dx, dy] of [
        [-1.8, -1.8],
        [0, -2.6],
        [1.8, -1.8],
      ] as const) {
        ctx.moveTo(dx + 0.8, dy)
        ctx.ellipse(dx, dy, 0.8, 0.8, 0, 0, Math.PI * 2)
      }
      ctx.fill()
      ctx.restore()
    }
  })

export const decalIcecrack: Painter = () =>
  decal(28, (ctx, m) => {
    ctx.fillStyle = css(0xd4ecf8)
    ctx.beginPath()
    ctx.ellipse(m, m, 11, 6, 0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = css(0xb0d4ea)
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(m - 7, m - 1)
    ctx.lineTo(m - 1, m + 1)
    ctx.lineTo(m + 3, m - 2)
    ctx.moveTo(m - 1, m + 1)
    ctx.lineTo(m + 1, m + 4)
    ctx.stroke()
  })

export const decalSprinkles: Painter = () =>
  decal(24, (ctx, m) => {
    const rnd = seededRandom(3)
    const bits = [0xf7a8c8, 0xa8d8f0, 0xf5e0a0, 0xb8e8c8]
    for (let i = 0; i < 7; i++) {
      ctx.save()
      ctx.translate(m + (rnd() - 0.5) * 16, m + (rnd() - 0.5) * 12)
      ctx.rotate(rnd() * Math.PI)
      ctx.fillStyle = css(bits[i % bits.length])
      ctx.beginPath()
      ctx.roundRect(-2.2, -0.7, 4.4, 1.4, 0.7)
      ctx.fill()
      ctx.restore()
    }
  })

export const decalCandies: Painter = () =>
  decal(26, (ctx, m) => {
    for (const [x, y, col] of [
      [m - 5, m + 1, 0xf5b0cc],
      [m + 5, m - 3, 0xb8d8f8],
    ] as const) {
      ctx.fillStyle = css(col)
      ctx.beginPath()
      ctx.ellipse(x, y, 3.4, 2.6, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(x - 3, y)
      ctx.lineTo(x - 6, y - 2)
      ctx.lineTo(x - 6, y + 2)
      ctx.closePath()
      ctx.moveTo(x + 3, y)
      ctx.lineTo(x + 6, y - 2)
      ctx.lineTo(x + 6, y + 2)
      ctx.closePath()
      ctx.fill()
    }
  })

export const decalFrosting: Painter = () =>
  decal(26, (ctx, m) => {
    ctx.fillStyle = css(0xfff0f7)
    ctx.beginPath()
    ctx.ellipse(m, m, 9, 5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = css(0xf5d0e2)
    ctx.beginPath()
    ctx.ellipse(m + 1, m + 2.5, 7, 1.4, 0, 0, Math.PI * 2)
    ctx.fill()
  })

export const decalHearts: Painter = () =>
  decal(24, (ctx, m) => {
    for (const [x, y, r] of [
      [m - 4, m, 3.2],
      [m + 4, m + 3, 2.4],
    ] as const) {
      ctx.beginPath()
      heartPath(ctx, x, y, r)
      ctx.fillStyle = css(0xf5b8d0)
      ctx.fill()
    }
  })

export const decalStars: Painter = () =>
  decal(24, (ctx, m) => {
    for (const [x, y, r] of [
      [m - 4, m - 2, 3],
      [m + 5, m + 4, 2],
    ] as const) {
      ctx.beginPath()
      starPath(ctx, x, y, r, 5, 0.45)
      ctx.fillStyle = css(mix(P.dusk, P.starGlow, 0.55))
      ctx.fill()
    }
  })

export const decalMoonflower: Painter = () =>
  decal(24, (ctx, m) => {
    ctx.fillStyle = css(0x8e80c8)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      ctx.beginPath()
      ctx.ellipse(m + Math.cos(a) * 3, m + Math.sin(a) * 3, 2.6, 1.6, a, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = css(0xd8ccff)
    ctx.beginPath()
    ctx.arc(m, m, 1.5, 0, Math.PI * 2)
    ctx.fill()
  })

export const decalSparkles: Painter = () =>
  decal(22, (ctx, m) => {
    sparkle(ctx, m - 3, m - 2, 3, mix(P.dusk, P.starGlow, 0.5), 1)
    sparkle(ctx, m + 4, m + 4, 2, mix(P.dusk, P.starGlow, 0.4), 1)
  })

export const decalCrater: Painter = () =>
  decal(28, (ctx, m) => {
    ctx.fillStyle = css(P.duskDeep)
    ctx.beginPath()
    ctx.ellipse(m, m, 8, 5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = css(P.duskLight, 0.7)
    ctx.beginPath()
    ctx.ellipse(m + 1, m + 2, 7, 2.4, 0, 0, Math.PI)
    ctx.fill()
  })

