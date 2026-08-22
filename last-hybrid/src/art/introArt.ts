/**
 * Art used only by the opening cinematic.
 *
 * Kept apart from [worldArt.ts](./worldArt.ts) because none of it belongs in
 * the game proper: the hunters are never fought, and the shaft is never walked
 * through. The intro reuses the real world textures wherever it can — ground,
 * trees, the campfire, the character's own sheet — so it can't drift away from
 * how the game actually looks.
 */
import type Phaser from 'phaser'
import { css, darken, lighten, P } from './palette'
import {
  circle,
  curve,
  ellipse,
  limb,
  makeCanvas,
  poly,
  seededRandom,
  shadow,
  tiled,
  wrapped,
  type Canvas2D,
} from './draw'

export const HUNTER_KINDS = ['torch', 'spear', 'bow'] as const
export type HunterKind = (typeof HUNTER_KINDS)[number]

export function hunterKey(kind: HunterKind): string {
  return `hunter-${kind}`
}

const CLOAK = darken(P.nightSoft, 0.55)
const CLOAK_LIT = darken(P.nightSoft, 0.2)
const HUNTER_W = 88
const HUNTER_H = 132
/** Where a hunter's feet sit in its frame, so it can be placed by the ground. */
export const HUNTER_FOOT = 126

/**
 * A hooded silhouette. Almost entirely shape — the only detail is a warm rim
 * down one side from the torchlight and two cold eye glints, which is enough
 * to read as "people, and they are looking at you" at any size.
 */
function paintHunter(kind: HunterKind): Canvas2D {
  const c = makeCanvas(HUNTER_W, HUNTER_H)
  const { ctx } = c
  const cx = HUNTER_W / 2
  const foot = HUNTER_FOOT

  shadow(ctx, cx, foot, 20, 6, 0.42)

  // Legs, mostly hidden under the cloak.
  for (const side of [-1, 1]) {
    limb(ctx, cx + side * 6, foot - 34, cx + side * 8, foot - 2, 9, darken(CLOAK, 0.3))
  }

  // Cloak: shoulders down to a ragged hem.
  poly(
    ctx,
    [
      cx - 17, foot - 74,
      cx + 17, foot - 74,
      cx + 26, foot - 6,
      cx + 14, foot - 12,
      cx + 6, foot - 4,
      cx - 5, foot - 13,
      cx - 15, foot - 5,
      cx - 26, foot - 8,
    ],
    CLOAK,
  )
  // Warm rim from the torch, always on the same side.
  poly(ctx, [cx + 11, foot - 74, cx + 17, foot - 74, cx + 26, foot - 6, cx + 17, foot - 10], CLOAK_LIT)

  // Hood and the dark under it.
  ellipse(ctx, cx, foot - 84, 15, 17, CLOAK)
  poly(ctx, [cx - 15, foot - 84, cx, foot - 106, cx + 15, foot - 84], CLOAK)
  ellipse(ctx, cx + 1, foot - 80, 9, 10, darken(CLOAK, 0.55))
  for (const side of [-1, 1]) ellipse(ctx, cx + 1 + side * 3.5, foot - 82, 1.7, 1.4, P.fireHot, 0.9)

  switch (kind) {
    case 'torch':
      // Arm up and out; the flame itself is a separate sprite so it can gutter.
      limb(ctx, cx + 12, foot - 66, cx + 27, foot - 92, 7, CLOAK_LIT)
      limb(ctx, cx + 27, foot - 88, cx + 33, foot - 116, 5, P.bark)
      break
    case 'spear':
      limb(ctx, cx + 10, foot - 62, cx + 22, foot - 74, 7, CLOAK_LIT)
      limb(ctx, cx + 34, foot - 120, cx + 12, foot - 10, 3.5, P.bark)
      poly(ctx, [cx + 34, foot - 132, cx + 30, foot - 112, cx + 39, foot - 114], P.stone)
      break
    case 'bow': {
      limb(ctx, cx + 10, foot - 66, cx + 24, foot - 78, 7, CLOAK_LIT)
      curve(ctx, cx + 24, foot - 112, cx + 42, foot - 78, cx + 24, foot - 44, 3.5, P.bark)
      limb(ctx, cx + 24, foot - 112, cx + 24, foot - 44, 1.2, P.inkSoft, 0.6)
      break
    }
  }

  return c
}

/**
 * The mouth of the pit: a ragged black hole with a lip of raw earth.
 *
 * Drawn wide and shallow, as an ellipse, so it sits convincingly on a
 * top-down-ish ground plane rather than looking like a circle pasted on top.
 */
function paintPit(): Canvas2D {
  const width = 340
  const height = 210
  const c = makeCanvas(width, height)
  const { ctx } = c
  const cx = width / 2
  const cy = height / 2
  const rnd = seededRandom(31337)

  /** An ellipse with a noisy radius, so no edge of the hole is a clean arc. */
  const ragged = (rx: number, ry: number, jitter: number, color: number, alpha = 1): void => {
    const points: number[] = []
    const steps = 46
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2
      const wobble = 1 + (rnd() - 0.5) * jitter
      points.push(cx + Math.cos(a) * rx * wobble, cy + Math.sin(a) * ry * wobble)
    }
    poly(ctx, points, color, alpha)
  }

  ragged(160, 96, 0.14, P.dirtDark)
  ragged(150, 88, 0.12, darken(P.dirt, 0.15))
  ragged(138, 78, 0.1, P.black, 0.92)
  // A hint of depth: the far wall catches a little light, the near one none.
  ellipse(ctx, cx, cy - 12, 120, 52, darken(P.dirtDark, 0.55), 0.55)
  ragged(120, 62, 0.08, P.black)

  // Cracks radiating out into the surrounding ground.
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2
    const from = 0.98 + rnd() * 0.08
    const to = from + 0.1 + rnd() * 0.22
    limb(
      ctx,
      cx + Math.cos(a) * 160 * from,
      cy + Math.sin(a) * 96 * from,
      cx + Math.cos(a) * 160 * to,
      cy + Math.sin(a) * 96 * to,
      1.5 + rnd() * 2,
      P.dirtDark,
      0.85,
    )
  }
  return c
}

/** Seamless rock wall for the shaft, scrolled past during the fall. */
function paintShaftWall(): Canvas2D {
  const size = 256
  const c = makeCanvas(size)
  const { ctx } = c
  const rnd = seededRandom(8675309)
  const base = darken(P.stoneDark, 0.55)

  ctx.fillStyle = css(base)
  ctx.fillRect(0, 0, size, size)

  // Every random value has to be drawn *before* `tiled`, never inside it — the
  // whole point is that all nine wrapped copies are the same shape. Rolling
  // inside the callback makes nine different shapes and puts a hard seam at
  // every tile edge.
  //
  // Horizontal strata: the thing that actually sells vertical motion.
  for (let i = 0; i < 22; i++) {
    const x = rnd() * size
    const y = rnd() * size
    const rx = 40 + rnd() * 90
    const h = 3 + rnd() * 14
    const shade = rnd() > 0.55 ? lighten(base, 0.18) : darken(base, 0.5)
    tiled(ctx, size, size, (target) => ellipse(target, x, y, rx, h, shade, 0.5))
  }
  // Pocks and cracks.
  for (let i = 0; i < 26; i++) {
    const x = rnd() * size
    const y = rnd() * size
    const rx = 4 + rnd() * 12
    tiled(ctx, size, size, (target) => ellipse(target, x, y, rx, rx * 0.6, P.black, 0.35))
  }
  // Roots trailing down out of the soil above.
  for (let i = 0; i < 7; i++) {
    const x = rnd() * size
    const y = rnd() * size
    const len = 30 + rnd() * 60
    const bend1 = (rnd() - 0.5) * 30
    const bend2 = (rnd() - 0.5) * 20
    tiled(ctx, size, size, (target) => {
      curve(target, x, y, x + bend1, y + len * 0.5, x + bend2, y + len, 2.5, darken(P.bark, 0.35), 0.75)
    })
  }
  return c
}

/** An angular chunk of falling debris. Rotated and scaled per use. */
function paintRubble(): Canvas2D {
  const c = makeCanvas(32)
  const { ctx } = c
  poly(ctx, [6, 20, 9, 8, 20, 5, 27, 14, 22, 26, 11, 27], P.stone)
  poly(ctx, [20, 5, 27, 14, 22, 26, 18, 16], P.stoneDark)
  poly(ctx, [9, 8, 20, 5, 16, 13, 8, 15], lighten(P.stone, 0.2))
  return c
}

/** A vertical speed streak: soft, fading out at both ends. */
function paintStreak(): Canvas2D {
  const c = makeCanvas(8, 192)
  const { ctx } = c
  const gradient = ctx.createLinearGradient(0, 0, 0, 192)
  gradient.addColorStop(0, 'rgba(255,255,255,0)')
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.55)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(2.5, 0, 3, 192)
  return c
}

/** The ring of dust thrown out where she lands. Scaled up as it fades. */
function paintDustRing(): Canvas2D {
  const width = 320
  const height = 140
  const c = makeCanvas(width, height)
  const { ctx } = c
  const rnd = seededRandom(112358)
  // Built from overlapping puffs rather than a stroked ellipse, so the rim is
  // billowy instead of drawn-with-a-compass.
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2 + rnd() * 0.2
    const spread = 0.86 + rnd() * 0.2
    ellipse(
      ctx,
      width / 2 + Math.cos(a) * 130 * spread,
      height / 2 + Math.sin(a) * 52 * spread,
      14 + rnd() * 20,
      10 + rnd() * 14,
      P.dirt,
      0.4,
    )
  }
  return c
}

/**
 * The disc of night sky receding above her as she falls. Bright in the middle,
 * ragged at the edge where the broken ground frames it.
 */
function paintSkyHole(): Canvas2D {
  const size = 256
  const c = makeCanvas(size)
  const { ctx } = c
  const r = size / 2
  const rnd = seededRandom(24680)

  const points: number[] = []
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2
    const wobble = 1 + (rnd() - 0.5) * 0.16
    points.push(r + Math.cos(a) * 104 * wobble, r + Math.sin(a) * 104 * wobble)
  }
  // Kept dim: this is drawn additively, so anything near opaque blows out into
  // a white splat that reads as a light *source* rather than a way out.
  poly(ctx, points, P.moonDim, 0.35)

  const gradient = ctx.createRadialGradient(r, r, 0, r, r, 104)
  gradient.addColorStop(0, css(P.moon, 0.6))
  gradient.addColorStop(0.7, css(P.moonDim, 0.28))
  gradient.addColorStop(1, css(P.moonDim, 0))
  wrapped(ctx, () => {
    ctx.beginPath()
    ctx.arc(r, r, 104, 0, Math.PI * 2)
    ctx.clip()
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
  })

  circle(ctx, r, r, 26, P.white, 0.2)
  return c
}

/**
 * Registers the intro's textures. Called from boot alongside the world's, and
 * safe to call twice — a scene restart would otherwise re-add an existing key.
 */
export function buildIntroTextures(scene: Phaser.Scene): void {
  const add = (key: string, c: Canvas2D): void => {
    if (scene.textures.exists(key)) return
    scene.textures.addCanvas(key, c.canvas)
  }

  for (const kind of HUNTER_KINDS) add(hunterKey(kind), paintHunter(kind))
  add('pit', paintPit())
  add('shaft-wall', paintShaftWall())
  add('rubble', paintRubble())
  add('streak', paintStreak())
  add('dust-ring', paintDustRing())
  add('sky-hole', paintSkyHole())
}
