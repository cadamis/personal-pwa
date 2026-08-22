/**
 * Everything in the world that isn't the player: ground tiles, scenery,
 * enemies, effects, and the on-screen controls.
 *
 * Like the character sheets these are painted into canvases at boot rather than
 * loaded from disk. Unlike the character sheets they aren't placeholders for
 * anything — a tree is a tree.
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
  roundRect,
  seededRandom,
  shadow,
  tiled,
  wrapped,
  type Canvas2D,
} from './draw'
import { TILE } from '../game/constants'

/** How many random variants each ground kind gets. */
export const GROUND_VARIANTS = 4

export const GROUND_KINDS = ['grass', 'forest', 'dirt', 'bog'] as const
export type GroundKind = (typeof GROUND_KINDS)[number]

interface GroundStyle {
  base: number
  dark: number
  lit: number
  /** Tufts of grass per tile. */
  tufts: number
}

const GROUND_STYLES: Record<GroundKind, GroundStyle> = {
  grass: { base: P.grass, dark: P.grassDark, lit: P.grassLit, tufts: 5 },
  forest: { base: darken(P.grass, 0.3), dark: P.grassDark, lit: P.leafLit, tufts: 3 },
  dirt: { base: P.dirt, dark: P.dirtDark, lit: lighten(P.dirt, 0.15), tufts: 1 },
  bog: { base: P.bog, dark: darken(P.bog, 0.35), lit: P.leafLit, tufts: 2 },
}

export function groundKey(kind: GroundKind, variant: number): string {
  return `ground-${kind}-${variant}`
}

function paintGround(kind: GroundKind, variant: number): Canvas2D {
  const style = GROUND_STYLES[kind]
  const c = makeCanvas(TILE)
  const { ctx } = c
  const rnd = seededRandom(variant * 7919 + kind.length * 104729)

  ctx.fillStyle = css(style.base)
  ctx.fillRect(0, 0, TILE, TILE)

  // Mottling: soft dark and light patches so a field of tiles never reads flat.
  for (let i = 0; i < 14; i++) {
    const shade = rnd() > 0.5 ? style.dark : style.lit
    const x = rnd() * TILE
    const y = rnd() * TILE
    const rx = 3 + rnd() * 7
    const ry = 2 + rnd() * 5
    tiled(ctx, TILE, TILE, (target) => ellipse(target, x, y, rx, ry, shade, 0.16))
  }
  for (let i = 0; i < style.tufts; i++) {
    const x = 4 + rnd() * (TILE - 8)
    const y = 6 + rnd() * (TILE - 10)
    const h = 3 + rnd() * 4
    const color = rnd() > 0.6 ? style.lit : style.dark
    for (const lean of [-1, 0, 1]) {
      limb(ctx, x + lean, y, x + lean * 2.5, y - h, 1.2, color, 0.75)
    }
  }
  return c
}

// ------------------------------------------------------------------ scenery

function paintTree(dead: boolean): Canvas2D {
  const c = makeCanvas(112, 144)
  const { ctx } = c
  const cx = 56
  const rootY = 138
  const rnd = seededRandom(dead ? 4242 : 1337)

  shadow(ctx, cx, rootY - 2, 22, 7, 0.35)

  // Trunk: a slightly crooked taper, with roots flaring at the base.
  poly(ctx, [cx - 9, rootY, cx - 6, 66, cx + 6, 66, cx + 10, rootY], P.bark)
  poly(ctx, [cx + 1, rootY, cx + 3, 68, cx + 6, 68, cx + 10, rootY], darken(P.bark, 0.3))
  for (const side of [-1, 1]) {
    curve(ctx, cx + side * 6, rootY - 4, cx + side * 14, rootY - 6, cx + side * 20, rootY, 5, P.barkDark)
  }

  // Branches.
  for (const [x1, y1, x2, y2, w] of [
    [cx - 4, 92, cx - 26, 70, 5],
    [cx + 4, 84, cx + 28, 62, 5],
    [cx - 2, 74, cx - 18, 52, 4],
  ]) {
    limb(ctx, x1, y1, x2, y2, w, P.barkDark)
  }

  if (dead) {
    // No canopy — just bare, clawing twigs.
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (rnd() - 0.5) * 2.4
      const len = 18 + rnd() * 20
      limb(ctx, cx, 70, cx + Math.cos(a) * len, 70 + Math.sin(a) * len, 2.6, P.barkDark)
    }
    return c
  }

  // Canopy: overlapping blobs, darkest at the bottom.
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2
    const r = rnd() * 28
    const x = cx + Math.cos(a) * r
    const y = 44 + Math.sin(a) * r * 0.62
    ellipse(ctx, x, y, 16 + rnd() * 10, 13 + rnd() * 8, y > 46 ? P.leafDark : P.leaf)
  }
  for (let i = 0; i < 6; i++) {
    ellipse(ctx, cx - 12 + rnd() * 20, 30 + rnd() * 12, 10 + rnd() * 7, 8 + rnd() * 5, P.leafLit, 0.5)
  }
  return c
}

function paintRock(): Canvas2D {
  const c = makeCanvas(64, 56)
  const { ctx } = c
  shadow(ctx, 32, 48, 18, 5)
  poly(ctx, [12, 48, 18, 24, 34, 14, 50, 26, 54, 48], P.stone)
  poly(ctx, [34, 14, 50, 26, 54, 48, 38, 48], P.stoneDark)
  poly(ctx, [18, 24, 34, 14, 32, 28, 20, 34], lighten(P.stone, 0.18))
  ellipse(ctx, 26, 46, 12, 4, P.grassDark, 0.5)
  return c
}

function paintBush(): Canvas2D {
  const c = makeCanvas(64, 56)
  const { ctx } = c
  const rnd = seededRandom(90210)
  shadow(ctx, 32, 48, 16, 5)
  for (let i = 0; i < 9; i++) {
    const x = 32 + (rnd() - 0.5) * 30
    const y = 34 + (rnd() - 0.5) * 18
    ellipse(ctx, x, y, 9 + rnd() * 6, 8 + rnd() * 4, y > 34 ? P.leafDark : P.leaf)
  }
  for (let i = 0; i < 4; i++) {
    ellipse(ctx, 24 + rnd() * 16, 26 + rnd() * 8, 6, 4.5, P.leafLit, 0.45)
  }
  return c
}

function paintCampfire(): Canvas2D {
  const c = makeCanvas(64, 64)
  const { ctx } = c
  shadow(ctx, 32, 54, 18, 6, 0.4)
  // Ring of stones.
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.1 + (i / 6) * 0.8)
    ellipse(ctx, 32 + Math.cos(a) * 19, 50 + Math.sin(a) * 8, 5.5, 4.5, i % 2 ? P.stone : P.stoneDark)
  }
  // Crossed logs.
  limb(ctx, 20, 50, 44, 42, 6, P.bark)
  limb(ctx, 22, 42, 46, 50, 6, darken(P.bark, 0.25))
  // Embers under the flame proper, which is a separate animated sprite.
  ellipse(ctx, 32, 46, 10, 4, P.ember, 0.8)
  ellipse(ctx, 32, 46, 6, 2.5, P.fire, 0.9)
  return c
}

/** A single teardrop flame, scaled and jittered at runtime. */
function paintFlame(): Canvas2D {
  const c = makeCanvas(40, 56)
  const { ctx } = c
  const flame = (w: number, h: number, color: number, alpha: number): void => {
    ctx.beginPath()
    ctx.moveTo(20, 52 - h)
    ctx.quadraticCurveTo(20 + w, 50 - h * 0.35, 20 + w * 0.6, 52)
    ctx.quadraticCurveTo(20, 56, 20 - w * 0.6, 52)
    ctx.quadraticCurveTo(20 - w, 50 - h * 0.35, 20, 52 - h)
    ctx.fillStyle = css(color, alpha)
    ctx.fill()
  }
  flame(13, 44, P.ember, 0.9)
  flame(9, 34, P.fire, 0.95)
  flame(5, 20, P.fireHot, 1)
  return c
}

/** Soft radial falloff, tinted at use — firelight, aggro tells, the vignette. */
function paintGlow(size: number): Canvas2D {
  const c = makeCanvas(size)
  const { ctx } = c
  const r = size / 2
  const gradient = ctx.createRadialGradient(r, r, 0, r, r, r)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.42)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  return c
}

/**
 * The inverse of {@link paintGlow}: clear in the middle, solid at the edges.
 * Tinted and faded up when something is hunting you.
 */
function paintVignette(size: number): Canvas2D {
  const c = makeCanvas(size)
  const { ctx } = c
  const r = size / 2
  // Nothing until well past halfway, so it reads as a rim around the screen
  // rather than a wash over it. The HUD oversizes this past the viewport (see
  // VIGNETTE_OVERSCAN), so only the outermost stops are ever on screen.
  const gradient = ctx.createRadialGradient(r, r, r * 0.6, r, r, r)
  gradient.addColorStop(0, 'rgba(255,255,255,0)')
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.1)')
  gradient.addColorStop(0.8, 'rgba(255,255,255,0.45)')
  gradient.addColorStop(1, 'rgba(255,255,255,1)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  return c
}

function paintParticle(): Canvas2D {
  const c = makeCanvas(16)
  const { ctx } = c
  circle(c.ctx, 8, 8, 6, 0xffffff, 0.25)
  circle(ctx, 8, 8, 3.5, 0xffffff, 1)
  return c
}

/** The arc that flashes in the world when the player swings. */
function paintSlash(): Canvas2D {
  const c = makeCanvas(96, 96)
  const { ctx } = c
  wrapped(ctx, () => {
    ctx.translate(48, 48)
    for (const [radius, width, alpha] of [
      [38, 9, 0.85],
      [34, 4, 1],
    ]) {
      ctx.beginPath()
      ctx.arc(0, 0, radius, -0.8, 0.8)
      ctx.lineWidth = width
      ctx.lineCap = 'round'
      ctx.strokeStyle = css(P.moon, alpha)
      ctx.stroke()
    }
  })
  return c
}

// ------------------------------------------------------------------ enemies

function paintHusk(): Canvas2D {
  const c = makeCanvas(56, 64)
  const { ctx } = c
  const cx = 28
  shadow(ctx, cx, 58, 12, 4)
  // A hunched, over-long humanoid.
  for (const side of [-1, 1]) {
    limb(ctx, cx + side * 4, 44, cx + side * 6, 56, 6, P.huskGreyDark)
  }
  roundRect(ctx, cx - 9, 26, 18, 20, 7, P.huskGrey)
  roundRect(ctx, cx - 9, 36, 18, 10, 5, P.huskGreyDark)
  for (const side of [-1, 1]) {
    limb(ctx, cx + side * 8, 29, cx + side * 13, 47, 4.5, P.huskGrey)
    // Claws.
    for (let i = -1; i <= 1; i++) {
      limb(ctx, cx + side * 13, 47, cx + side * 13 + i * 2.5, 53, 1.6, P.huskGreyDark)
    }
  }
  ellipse(ctx, cx, 20, 8, 8.5, P.huskGrey)
  ellipse(ctx, cx, 23, 5, 4, P.huskGreyDark)
  for (const side of [-1, 1]) ellipse(ctx, cx + side * 3.2, 18, 1.8, 2.2, P.rotGreen)
  // Rot seeping down the chest.
  ellipse(ctx, cx, 33, 5, 7, P.rotGreenDark, 0.55)
  return c
}

function paintStalker(): Canvas2D {
  const c = makeCanvas(72, 56)
  const { ctx } = c
  const cx = 36
  shadow(ctx, cx, 50, 18, 5)
  // Low four-legged shadow, all silhouette and eyeshine.
  for (const [x, phase] of [
    [-12, 1],
    [-6, -1],
    [10, -1],
    [15, 1],
  ]) {
    limb(ctx, cx + x, 34, cx + x + phase * 3, 48, 4.5, darken(P.huskGreyDark, 0.4))
  }
  ellipse(ctx, cx, 34, 18, 8, P.huskGreyDark)
  ellipse(ctx, cx - 6, 30, 11, 4, darken(P.huskGrey, 0.2), 0.5)
  curve(ctx, cx - 16, 32, cx - 28, 26, cx - 30, 14, 5, darken(P.huskGreyDark, 0.35))
  ellipse(ctx, cx + 19, 28, 9, 7, P.huskGreyDark)
  poly(ctx, [cx + 15, 23, cx + 13, 13, cx + 21, 21], P.huskGreyDark)
  poly(ctx, [cx + 22, 22, cx + 25, 12, cx + 27, 23], P.huskGreyDark)
  ellipse(ctx, cx + 27, 30, 7, 3.5, darken(P.huskGreyDark, 0.2))
  for (const side of [-1, 1]) ellipse(ctx, cx + 19 + side * 0.5, 27 + side * 2, 2, 1.8, P.bloodRed)
  return c
}

// --------------------------------------------------------------- touch UI

function paintStickBase(): Canvas2D {
  const c = makeCanvas(140)
  const { ctx } = c
  circle(ctx, 70, 70, 62, P.panel, 0.3)
  ctx.beginPath()
  ctx.arc(70, 70, 62, 0, Math.PI * 2)
  ctx.lineWidth = 3
  ctx.strokeStyle = css(P.panelEdge, 0.75)
  ctx.stroke()
  // Four faint tick marks, so the neutral centre is obvious at a glance.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2
    limb(
      ctx,
      70 + Math.cos(a) * 46,
      70 + Math.sin(a) * 46,
      70 + Math.cos(a) * 56,
      70 + Math.sin(a) * 56,
      3,
      P.inkSoft,
      0.5,
    )
  }
  return c
}

function paintStickKnob(): Canvas2D {
  const c = makeCanvas(72)
  const { ctx } = c
  circle(ctx, 36, 36, 30, P.panelEdge, 0.85)
  circle(ctx, 36, 36, 25, lighten(P.panelEdge, 0.25), 0.9)
  ellipse(ctx, 36, 29, 15, 9, P.ink, 0.25)
  return c
}

/** A round action button. The glyph is drawn as a Phaser text on top. */
function paintActionButton(): Canvas2D {
  const c = makeCanvas(120)
  const { ctx } = c
  circle(ctx, 60, 60, 52, P.panel, 0.55)
  ctx.beginPath()
  ctx.arc(60, 60, 52, 0, Math.PI * 2)
  ctx.lineWidth = 3.5
  ctx.strokeStyle = css(P.panelEdge, 0.9)
  ctx.stroke()
  ellipse(ctx, 60, 44, 30, 16, P.white, 0.06)
  return c
}

function paintHeart(full: boolean): Canvas2D {
  const c = makeCanvas(40)
  const { ctx } = c
  const color = full ? P.heart : P.heartDark
  ctx.beginPath()
  ctx.moveTo(20, 34)
  ctx.bezierCurveTo(2, 22, 4, 8, 12, 8)
  ctx.bezierCurveTo(17, 8, 20, 12, 20, 14)
  ctx.bezierCurveTo(20, 12, 23, 8, 28, 8)
  ctx.bezierCurveTo(36, 8, 38, 22, 20, 34)
  ctx.closePath()
  ctx.fillStyle = css(color)
  ctx.fill()
  ctx.lineWidth = 2.5
  ctx.strokeStyle = css(darken(color, 0.45))
  ctx.stroke()
  if (full) ellipse(ctx, 14, 15, 4, 3, P.white, 0.5)
  return c
}

/**
 * Drifting mist. Tiled across a whole area, so every blob is drawn wrapped —
 * a blob cut off at the edge would repeat as a hard vertical seam every 256px.
 */
function paintFog(): Canvas2D {
  const c = makeCanvas(256, 256)
  const { ctx } = c
  const rnd = seededRandom(5150)
  for (let i = 0; i < 30; i++) {
    const x = rnd() * 256
    const y = rnd() * 256
    const rx = 34 + rnd() * 54
    const ry = 16 + rnd() * 26
    tiled(ctx, 256, 256, (target) => ellipse(target, x, y, rx, ry, P.moonDim, 0.06))
  }
  return c
}

// ------------------------------------------------------------------ install

/**
 * Registers every world texture on the scene's texture manager.
 *
 * Safe to call more than once — a scene restart re-enters Boot, and re-adding
 * an existing key would otherwise throw.
 */
export function buildWorldTextures(scene: Phaser.Scene): void {
  const add = (key: string, c: Canvas2D): void => {
    if (scene.textures.exists(key)) return
    scene.textures.addCanvas(key, c.canvas)
  }

  for (const kind of GROUND_KINDS) {
    for (let v = 0; v < GROUND_VARIANTS; v++) add(groundKey(kind, v), paintGround(kind, v))
  }

  add('tree', paintTree(false))
  add('tree-dead', paintTree(true))
  add('rock', paintRock())
  add('bush', paintBush())
  add('campfire', paintCampfire())
  add('flame', paintFlame())
  add('glow', paintGlow(256))
  add('vignette', paintVignette(256))
  add('particle', paintParticle())
  add('slash', paintSlash())

  add('husk', paintHusk())
  add('stalker', paintStalker())

  add('ui-stick-base', paintStickBase())
  add('ui-stick-knob', paintStickKnob())
  add('ui-button', paintActionButton())
  add('heart-full', paintHeart(true))
  add('heart-empty', paintHeart(false))
  add('fog', paintFog())
}
