/**
 * Stand-in character sheets, drawn at boot.
 *
 * These exist so the game is playable before the real artwork lands. They are
 * generated into *exactly* the grid described in [sheets.ts](./sheets.ts) —
 * same frame size, same rows, same frame counts — so the animation code,
 * the hitboxes and the depth sorting are all being exercised for real. When a
 * PNG shows up in `public/sprites/`, the loader uses it instead and nothing
 * else changes.
 *
 * Nobody should spend time making these pretty. They only need to be legible:
 * which way am I facing, am I walking, did my swing come out.
 */
import { css, darken, lighten, P } from './palette'
import { curve, ellipse, limb, makeCanvas, poly, roundRect, shadow, wrapped } from './draw'
import { CLIPS, FACINGS, clipFrames, clipSpec, type ClipName, type Facing, type SheetSpec } from './sheets'
import type { FormId } from '../game/forms'

/** The colours that distinguish one placeholder form from another. */
interface CharColors {
  fur: number
  furDark: number
  furLit: number
  skin: number
  skinDark: number
  cloth: number
  clothDark: number
  hair: number
}

interface Build {
  /** Shoulder width in px. */
  chest: number
  hips: number
  /** Extra hair mass behind the head. */
  longHair: boolean
}

const COLORS: Record<FormId, CharColors> = {
  mmc: {
    fur: P.furGrey,
    furDark: P.furGreyDark,
    furLit: P.furGreyLit,
    skin: P.skin,
    skinDark: P.skinDark,
    cloth: P.cloth,
    clothDark: P.clothDark,
    hair: P.hair,
  },
  fmc: {
    fur: P.furRuss,
    furDark: P.furRussDark,
    furLit: P.furRussLit,
    skin: P.skin,
    skinDark: P.skinDark,
    cloth: P.clothAlt,
    clothDark: P.clothAltDark,
    hair: darken(P.furRussDark, 0.35),
  },
  wolf: {
    fur: P.furGreyDark,
    furDark: darken(P.furGreyDark, 0.4),
    furLit: P.furGrey,
    skin: P.skinDark,
    skinDark: P.skinDark,
    cloth: P.leather,
    clothDark: darken(P.leather, 0.3),
    hair: P.hair,
  },
}

const BUILDS: Record<FormId, Build> = {
  mmc: { chest: 20, hips: 15, longHair: false },
  fmc: { chest: 16, hips: 16, longHair: true },
  wolf: { chest: 18, hips: 16, longHair: false },
}

/** Where a frame's action sits in its own little animation. */
interface Pose {
  /** Walk cycle position, 0..1. */
  gait: number
  /** Attack progress, 0..1, or null when not swinging. */
  swing: number | null
  /** Vertical bob, in px (negative is up). */
  bob: number
}

function poseFor(clip: ClipName, index: number, frames: number): Pose {
  switch (clip) {
    case 'idle':
      // Two frames of breathing.
      return { gait: 0, swing: null, bob: index === 0 ? 0 : -1 }
    case 'walk': {
      const gait = index / frames
      // A body rises twice per stride, at each mid-step.
      return { gait, swing: null, bob: -Math.abs(Math.sin(gait * Math.PI * 2)) * 1.5 }
    }
    case 'attack': {
      const swing = frames > 1 ? index / (frames - 1) : 1
      return { gait: 0, swing, bob: swing < 0.35 ? 1 : -1 }
    }
  }
}

// ---------------------------------------------------------------- the biped

const GROUND = 60
const HIP_Y = 43
const SHOULDER_Y = 30
const HEAD_Y = 19
const HEAD_R = 8.5

/**
 * How far the body leans/steps into the swing, 0..1 in and back out again.
 * Peaks just after the halfway point so the strike frame reads as the fast one.
 */
function lunge(swing: number): number {
  return Math.sin(Math.min(1, swing * 1.25) * Math.PI) ** 0.7
}

function paintHumanoid(
  ctx: CanvasRenderingContext2D,
  colors: CharColors,
  build: Build,
  facing: Facing,
  pose: Pose,
): void {
  const cx = 32
  const step = Math.sin(pose.gait * Math.PI * 2)
  const bob = pose.bob
  const hit = pose.swing === null ? 0 : lunge(pose.swing)

  shadow(ctx, cx, GROUND + 1, 11 - hit, 3.5)

  if (facing === 'left' || facing === 'right') {
    paintHumanoidSide(ctx, colors, build, facing === 'left' ? -1 : 1, step, bob, pose.swing, hit)
  } else {
    paintHumanoidFacing(ctx, colors, build, facing === 'up' ? -1 : 1, step, bob, pose.swing, hit)
  }
}

/**
 * Front (`toward = 1`) and back (`toward = -1`) views. They share every shape
 * except the face, which is why they're one function.
 */
function paintHumanoidFacing(
  ctx: CanvasRenderingContext2D,
  colors: CharColors,
  build: Build,
  toward: number,
  step: number,
  bob: number,
  swing: number | null,
  hit: number,
): void {
  const cx = 32
  const front = toward > 0
  // Swinging pushes the body toward the camera on a front-facing strike, away
  // on a back-facing one.
  const y = bob + hit * toward * 1.5

  // Tail, behind everything, poking out past one hip.
  const tailSway = step * 3 + hit * 4
  curve(
    ctx,
    cx + 5,
    HIP_Y + y,
    cx + 13,
    HIP_Y + 6 + y + tailSway,
    cx + 15,
    HIP_Y - 3 + y + tailSway,
    5,
    colors.furDark,
  )

  // Legs.
  for (const side of [-1, 1]) {
    const phase = step * side
    const hipX = cx + side * (build.hips * 0.28)
    const footX = hipX + phase * 2.2
    const footY = GROUND - 2 - Math.max(0, phase) * 3
    limb(ctx, hipX, HIP_Y + y, footX, footY + y, 6.5, colors.fur)
    limb(ctx, footX, footY + y, footX + side * 1.5, footY + y, 5.5, colors.furDark)
  }

  // Torso: chest over hips, so the silhouette narrows at the waist.
  roundRect(ctx, cx - build.chest / 2, 26 + y, build.chest, 13, 5, colors.cloth)
  roundRect(ctx, cx - build.hips / 2, 35 + y, build.hips, 10, 4, colors.clothDark)
  // Moonlight from the upper left.
  roundRect(ctx, cx - build.chest / 2 + 1, 27 + y, 3.5, 10, 2, lighten(colors.cloth, 0.22))

  // Arms. On a swing the leading arm crosses the body; otherwise they
  // counter-swing against the legs.
  for (const side of [-1, 1]) {
    const lead = side === 1
    const shoulderX = cx + side * (build.chest / 2 - 1)
    let handX = shoulderX + side * 2 - step * side * 2
    let handY = HIP_Y + 1 + step * side * 1.5
    if (swing !== null && lead) {
      handX = cx - 14 + 28 * swing
      handY = SHOULDER_Y + 4 + toward * 4 * hit
    }
    limb(ctx, shoulderX, SHOULDER_Y + y, handX, handY + y, 5.5, colors.fur)
    ellipse(ctx, handX, handY + y, 3, 3, colors.furLit)
  }

  // Head.
  const headY = HEAD_Y + y
  for (const side of [-1, 1]) {
    // Ears: swept-back triangles.
    poly(
      ctx,
      [
        cx + side * 4,
        headY - 5,
        cx + side * 9,
        headY - 15,
        cx + side * 10,
        headY - 5.5,
      ],
      colors.fur,
    )
    if (front) {
      poly(
        ctx,
        [cx + side * 5.5, headY - 6.5, cx + side * 8.4, headY - 12.5, cx + side * 8.8, headY - 6.8],
        darken(colors.skin, 0.15),
      )
    }
  }
  if (build.longHair) {
    // A mane behind the head and down past the shoulders.
    ellipse(ctx, cx, headY + 2, HEAD_R + 2.5, HEAD_R + 4, colors.hair)
    roundRect(ctx, cx - HEAD_R - 1.5, headY, (HEAD_R + 1.5) * 2, 16, 5, colors.hair)
  }
  ellipse(ctx, cx, headY, HEAD_R, HEAD_R + 0.5, colors.fur)
  ellipse(ctx, cx - 3, headY - 3.5, 4, 3.5, lighten(colors.fur, 0.18))

  if (front) {
    // Muzzle, nose, and the gold eyes that give the placeholder a face.
    ellipse(ctx, cx, headY + 4.5, 5, 3.8, colors.furLit)
    ellipse(ctx, cx, headY + 3, 1.6, 1.2, P.black, 0.8)
    for (const side of [-1, 1]) {
      ellipse(ctx, cx + side * 3.6, headY - 1, 2, 2.4, P.black, 0.55)
      ellipse(ctx, cx + side * 3.6, headY - 1.2, 1.5, 1.9, P.eyeGold)
    }
  } else {
    // Back of the head: just fur, with a hint of the ear bases.
    ellipse(ctx, cx, headY + 1, HEAD_R - 1.5, HEAD_R - 2, darken(colors.fur, 0.12))
    if (!build.longHair) ellipse(ctx, cx, headY - 4, 6, 4, colors.hair, 0.7)
  }

  if (swing !== null) slashArc(ctx, cx, SHOULDER_Y + 8 + y, toward > 0 ? Math.PI / 2 : -Math.PI / 2, swing)
}

/** Profile view. `dir` is -1 for left, +1 for right. */
function paintHumanoidSide(
  ctx: CanvasRenderingContext2D,
  colors: CharColors,
  build: Build,
  dir: number,
  step: number,
  bob: number,
  swing: number | null,
  hit: number,
): void {
  const cx = 32 + dir * hit * 3
  const y = bob
  const at = (local: number): number => cx + dir * local

  // Tail, sweeping out behind.
  const tailLift = step * 3 - hit * 5
  curve(
    ctx,
    at(-7),
    HIP_Y - 1 + y,
    at(-16),
    HIP_Y + 3 + y + tailLift,
    at(-19),
    HIP_Y - 6 + y + tailLift,
    5,
    colors.furDark,
  )

  // Far leg and far arm first, in shadow, so the near ones read as nearer.
  drawSideLeg(ctx, at, -step, y, darken(colors.fur, 0.28), dir)
  const farHand = { x: at(-4 - step * 5), y: HIP_Y + y + 1 }
  limb(ctx, at(1), SHOULDER_Y + y, farHand.x, farHand.y, 5, darken(colors.fur, 0.28))

  drawSideLeg(ctx, at, step, y, colors.fur, dir)

  // Torso, leaning into the swing.
  const lean = hit * 2.5
  wrapped(ctx, () => {
    ctx.translate(cx, 36 + y)
    ctx.rotate(dir * lean * 0.06)
    ctx.translate(-cx, -(36 + y))
    roundRect(ctx, cx - 7, 26 + y, 14, 13, 5, colors.cloth)
    roundRect(ctx, cx - 6.5, 35 + y, 13, 10, 4, colors.clothDark)
    roundRect(ctx, at(2), 27 + y, 3, 10, 1.5, lighten(colors.cloth, 0.2))
  })

  // Near arm: swings with the gait, or drives the strike.
  let handX = at(-2 + step * 6)
  let handY = HIP_Y + y
  if (swing !== null) {
    // Up and back, then down and forward across the front of the body.
    const a = Math.PI * (0.85 - 1.15 * swing)
    handX = at(Math.cos(a) * -15)
    handY = SHOULDER_Y + y + Math.sin(a) * -11
  }
  limb(ctx, at(1), SHOULDER_Y + y, handX, handY, 5.5, colors.fur)
  ellipse(ctx, handX, handY, 3.2, 3.2, colors.furLit)

  // Head, muzzle forward.
  const headY = HEAD_Y + y
  poly(ctx, [at(-2), headY - 5, at(-6), headY - 15, at(3), headY - 7], colors.fur)
  if (build.longHair) {
    ellipse(ctx, at(-4), headY + 3, 7, 9, colors.hair)
    roundRect(ctx, at(-9), headY, 9, 16, 4, colors.hair)
  }
  ellipse(ctx, cx, headY, HEAD_R, HEAD_R, colors.fur)
  ellipse(ctx, at(6.5), headY + 2.5, 5.5, 3.6, colors.furLit)
  ellipse(ctx, at(11), headY + 1.8, 1.6, 1.3, P.black, 0.8)
  ellipse(ctx, at(3), headY - 1, 2.1, 2.4, P.black, 0.5)
  ellipse(ctx, at(3.2), headY - 1.2, 1.6, 1.9, P.eyeGold)

  if (swing !== null) slashArc(ctx, at(9), SHOULDER_Y + 5 + y, dir > 0 ? 0 : Math.PI, swing)
}

function drawSideLeg(
  ctx: CanvasRenderingContext2D,
  at: (local: number) => number,
  phase: number,
  y: number,
  color: number,
  dir: number,
): void {
  const hipX = at(0)
  const footX = at(phase * 7)
  const footY = GROUND - 2 - Math.max(0, -phase) * 3
  // Digitigrade: knee kicks backwards, like the wolf's.
  limb(ctx, hipX, HIP_Y + y, at(phase * 3 - 2), 51 + y, 6.5, color)
  limb(ctx, at(phase * 3 - 2), 51 + y, footX, footY + y, 5.5, color)
  limb(ctx, footX, footY + y, footX + dir * 3, footY + y, 4.5, darken(color, 0.15))
}

/**
 * The crescent that sells a swing. Sweeps through `angle` over the clip and
 * fades as it goes, so the last frame is mostly gone.
 */
function slashArc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  swing: number,
): void {
  if (swing < 0.25 || swing > 0.95) return
  const t = (swing - 0.25) / 0.7
  wrapped(ctx, () => {
    ctx.translate(x, y)
    ctx.rotate(angle + (t - 0.5) * 1.5)
    ctx.beginPath()
    ctx.arc(0, 0, 15, -0.9, 0.9)
    ctx.lineWidth = 4 - t * 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = css(P.moon, 0.85 * (1 - t))
    ctx.stroke()
  })
}

// ----------------------------------------------------------------- the wolf

const WOLF_GROUND = 60

function paintWolf(ctx: CanvasRenderingContext2D, colors: CharColors, facing: Facing, pose: Pose): void {
  const step = Math.sin(pose.gait * Math.PI * 2)
  const hit = pose.swing === null ? 0 : lunge(pose.swing)
  const y = pose.bob - hit * 2

  shadow(ctx, 32, WOLF_GROUND + 1, facing === 'left' || facing === 'right' ? 15 : 10, 3.5)

  if (facing === 'left' || facing === 'right') {
    paintWolfSide(ctx, colors, facing === 'left' ? -1 : 1, step, y, pose.swing, hit)
  } else {
    paintWolfFacing(ctx, colors, facing === 'up' ? -1 : 1, step, y, pose.swing, hit)
  }
}

function paintWolfSide(
  ctx: CanvasRenderingContext2D,
  colors: CharColors,
  dir: number,
  step: number,
  y: number,
  swing: number | null,
  hit: number,
): void {
  const cx = 32 + dir * hit * 4
  const at = (local: number): number => cx + dir * local
  const backY = 42 + y

  // Tail: a fat plume, up when lunging.
  curve(
    ctx,
    at(-13),
    backY + 1,
    at(-22),
    backY - 4 - hit * 6 + step * 2,
    at(-24),
    backY - 12 - hit * 5,
    6,
    colors.furDark,
  )

  // Far pair of legs, darker.
  drawWolfLeg(ctx, at(-9), backY + 3, -step, y, darken(colors.fur, 0.3), dir)
  drawWolfLeg(ctx, at(9), backY + 2, step, y, darken(colors.fur, 0.3), dir)

  // Body: a low, long barrel, stretched forward mid-lunge.
  ellipse(ctx, cx, backY + 5, 15 + hit * 2, 7.5, colors.fur)
  ellipse(ctx, at(-3), backY + 1.5, 10, 4, colors.furLit, 0.5)
  ellipse(ctx, at(4), backY + 9, 9, 3.5, colors.furDark, 0.6)

  // Near pair of legs.
  drawWolfLeg(ctx, at(-9), backY + 3, step, y, colors.fur, dir)
  drawWolfLeg(ctx, at(9), backY + 2, -step, y, colors.fur, dir)

  // Neck and head, lowered and thrust forward on a bite.
  const headX = at(17 + hit * 4)
  const headY = backY - 6 + hit * 5
  limb(ctx, at(9), backY, headX, headY + 2, 9, colors.fur)
  poly(ctx, [headX - dir * 2, headY - 4, headX - dir * 5, headY - 13, headX + dir * 3, headY - 5], colors.fur)
  ellipse(ctx, headX, headY, 7, 6, colors.fur)
  // Muzzle, opening as the bite lands.
  const gape = swing === null ? 0 : hit * 3.5
  ellipse(ctx, at(24 + hit * 4), headY + 1 + gape * 0.4, 6.5, 3.2 - gape * 0.2, colors.furLit)
  if (gape > 0.6) {
    poly(
      ctx,
      [
        at(19),
        headY + 1,
        at(30 + hit * 4),
        headY - 1 - gape,
        at(30 + hit * 4),
        headY + 3 + gape,
      ],
      P.black,
      0.75,
    )
    for (let i = 0; i < 3; i++) {
      const tx = at(22 + i * 3)
      poly(ctx, [tx, headY - gape + 0.5, tx + dir * 1.6, headY - gape + 0.5, tx, headY + 2], P.white, 0.9)
    }
  }
  ellipse(ctx, at(29 + hit * 4), headY + 0.5 + gape * 0.4, 1.7, 1.4, P.black, 0.85)
  ellipse(ctx, at(4), headY - 1.5, 2.1, 2.2, P.black, 0.5)
  ellipse(ctx, at(4.2), headY - 1.7, 1.6, 1.7, P.eyeGold)

  if (swing !== null) slashArc(ctx, at(28), headY + 2, dir > 0 ? 0 : Math.PI, swing)
}

function paintWolfFacing(
  ctx: CanvasRenderingContext2D,
  colors: CharColors,
  toward: number,
  step: number,
  y: number,
  swing: number | null,
  hit: number,
): void {
  const cx = 32
  const front = toward > 0
  const backY = 42 + y

  if (!front) {
    curve(ctx, cx, backY + 2, cx + 3, backY - 10 - hit * 6, cx - 2, backY - 20 - hit * 6, 6, colors.furDark)
  }

  // Hind legs, then body, then fore legs.
  for (const side of [-1, 1]) {
    limb(ctx, cx + side * 7, backY + 6, cx + side * 8, WOLF_GROUND - 2 + y, 6, darken(colors.fur, 0.25))
  }
  ellipse(ctx, cx, backY + 8, 11, 9, colors.fur)
  ellipse(ctx, cx, backY + 3, 8, 5, colors.furLit, 0.45)
  for (const side of [-1, 1]) {
    const phase = step * side
    const footY = WOLF_GROUND - 2 - Math.max(0, phase) * 3 + y
    limb(ctx, cx + side * 6, backY + 5, cx + side * 6.5 + phase, footY, 6, colors.fur)
    ellipse(ctx, cx + side * 6.5 + phase, footY, 3.2, 2.4, colors.furDark)
  }

  // Head.
  const headY = backY - 8 + hit * 3
  for (const side of [-1, 1]) {
    poly(
      ctx,
      [cx + side * 3, headY - 3, cx + side * 8, headY - 13, cx + side * 9, headY - 3.5],
      colors.fur,
    )
    if (front) {
      poly(
        ctx,
        [cx + side * 4.5, headY - 4.5, cx + side * 7.4, headY - 10.5, cx + side * 7.8, headY - 4.8],
        darken(colors.skin, 0.2),
      )
    }
  }
  ellipse(ctx, cx, headY, 8.5, 7.5, colors.fur)
  if (front) {
    const gape = swing === null ? 0 : hit * 3
    ellipse(ctx, cx, headY + 5, 5.5, 4 + gape * 0.5, colors.furLit)
    if (gape > 0.6) ellipse(ctx, cx, headY + 6.5, 3.4, 1.6 + gape * 0.5, P.black, 0.75)
    ellipse(ctx, cx, headY + 3, 1.8, 1.4, P.black, 0.85)
    for (const side of [-1, 1]) {
      ellipse(ctx, cx + side * 3.8, headY - 1, 2.2, 2.4, P.black, 0.5)
      ellipse(ctx, cx + side * 3.8, headY - 1.2, 1.7, 1.9, P.eyeGold)
    }
  } else {
    ellipse(ctx, cx, headY + 1, 6.5, 5.5, darken(colors.fur, 0.15))
  }

  if (swing !== null) slashArc(ctx, cx, headY + 6, front ? Math.PI / 2 : -Math.PI / 2, swing)
}

function drawWolfLeg(
  ctx: CanvasRenderingContext2D,
  hipX: number,
  hipY: number,
  phase: number,
  y: number,
  color: number,
  dir: number,
): void {
  const footX = hipX + dir * phase * 6
  const footY = WOLF_GROUND - 2 - Math.max(0, -phase) * 3 + y
  limb(ctx, hipX, hipY, hipX + dir * phase * 2, hipY + 8, 6, color)
  limb(ctx, hipX + dir * phase * 2, hipY + 8, footX, footY, 5, color)
  limb(ctx, footX, footY, footX + dir * 3, footY, 4, darken(color, 0.15))
}

// --------------------------------------------------------------- the sheet

/**
 * Renders a whole placeholder sheet for one form, laid out to `spec`.
 *
 * Frame positions come from {@link clipFrames}, not from a second copy of the
 * grid, so this can't fall out of step with what the animations ask for.
 */
export function buildPlaceholderSheet(spec: SheetSpec, form: FormId): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(spec.cols * spec.frameWidth, spec.rows * spec.frameHeight)
  const colors = COLORS[form]
  const build = BUILDS[form]
  // The painters are authored against a 64px frame; anything else scales.
  const unit = spec.frameHeight / 64

  for (const clip of CLIPS) {
    const layout = clipSpec(spec, clip)
    for (const facing of FACINGS) {
      const frames = clipFrames(spec, clip, facing)
      frames.forEach((index, i) => {
        const col = index % spec.cols
        const row = Math.floor(index / spec.cols)
        wrapped(ctx, () => {
          ctx.translate(col * spec.frameWidth, row * spec.frameHeight)
          ctx.scale(unit, unit)
          ctx.beginPath()
          ctx.rect(0, 0, spec.frameWidth / unit, spec.frameHeight / unit)
          ctx.clip()
          const pose = poseFor(clip, i, layout.frames)
          if (form === 'wolf') paintWolf(ctx, colors, facing, pose)
          else paintHumanoid(ctx, colors, build, facing, pose)
        })
      })
    }
  }

  return canvas
}
