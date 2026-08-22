#!/usr/bin/env node
// Turns a single piece of character artwork into a game-ready sprite sheet.
//
//   npm run sprites
//
// Input is one drawing on a plain background (`art-source/<form>-raw.png`,
// converted from whatever the artist sent with `sips -s format png`). Output is
// `public/sprites/<form>.png`, laid out to exactly the grid described in
// src/art/sheets.ts — 6 columns, 12 rows, idle/walk/attack across four facings.
//
// ## What it can and can't do
//
// One drawing is one pose, so the animation here is the whole figure moving as
// a unit: bob, lean, squash and lunge, timed as a gait. It is deliberately not
// a skeletal rig. Cutting this character into limbs was tried and abandoned —
// the tail sweeps across the hip line *and* the right leg, so every rectangle
// containing a leg also contains tail, and every posed limb tore or ghosted.
// A clean whole-figure animation beats a rig full of slicing artifacts at the
// size this actually renders (about 48 pixels tall).
//
// If proper per-limb animation is wanted later, the fix is more source art —
// a few drawn poses per facing — not a cleverer script.
//
// The three views that aren't drawn are derived: the side views narrow the
// figure, and the back view mirrors it and paints the face out in hair colour,
// leaving the ears and silhouette.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodePng, encodePng } from './lib/png.mjs'
import {
  averageColor,
  blit,
  cloneImage,
  colorMask,
  fillEllipse,
  crop,
  keepLargestComponent,
  keyBackground,
  faceBounds,
  makeImage,
  multiplyEllipseAlpha,
  trim,
} from './lib/raster.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// Must match GRID and the per-form entries in src/art/sheets.ts.
const FRAME = 96
const COLS = 6
const ROWS = 12
/** Fraction of the frame's height between the character's feet and its bottom. */
const FOOT_FRACTION = 0.06
/** How much of the frame's height the character fills. */
const FILL = 0.9

const FACINGS = ['down', 'left', 'right', 'up']
const CLIPS = [
  { name: 'idle', row: 0, frames: 2 },
  { name: 'walk', row: 4, frames: 6 },
  { name: 'attack', row: 8, frames: 4 },
]

const CHARACTERS = [
  {
    form: 'mmc',
    source: 'art-source/mmc-raw.png',
    /** Roughly the skin tone, used to find the face for the back view. */
    skin: [242, 213, 176],
    skinTolerance: 46,
    /**
     * The solid mass of hair beside the face, as fractions of the cutout. It is
     * both averaged for a fill colour and stamped over the face to make the
     * back of the head.
     */
    hairSampleBox: [0.49, 0.17, 0.21, 0.19],
  },
  {
    form: 'fmc',
    source: 'art-source/fmc-raw.png',
    skin: [242, 213, 176],
    skinTolerance: 46,
    hairSampleBox: [0.49, 0.17, 0.21, 0.19],
  },
]

// -------------------------------------------------------------- posing

/** Unit "forward" per facing, in screen axes. */
const FORWARD = {
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
  up: [0, -1],
}

/**
 * A two-step gait. Frames 0 and 3 are the contacts — the foot lands, the body
 * squashes and sits at its lowest; 1/2 and 4/5 are the passes, where it rises,
 * leans into the step and sways off the centre line.
 */
const WALK = [
  { dy: 0, dx: 0, rot: 0, sy: 0.982, sx: 1.014 },
  { dy: -4, dx: 1.8, rot: 0.042, sy: 1.012, sx: 0.994 },
  { dy: -2.2, dx: 2.6, rot: 0.026, sy: 1.004, sx: 1 },
  { dy: 0, dx: 0, rot: 0, sy: 0.982, sx: 1.014 },
  { dy: -4, dx: -1.8, rot: -0.042, sy: 1.012, sx: 0.994 },
  { dy: -2.2, dx: -2.6, rot: -0.026, sy: 1.004, sx: 1 },
]

/** Breathing. Feet are the anchor, so squashing settles the head, not the boots. */
const IDLE = [
  { dy: 0, dx: 0, rot: 0, sy: 1, sx: 1 },
  { dy: 0, dx: 0, rot: 0, sy: 0.992, sx: 1.005 },
]

/**
 * Wind up, commit, overshoot, recover. `lunge` is along the facing, so the same
 * numbers read as a step into the swing whichever way the character is facing.
 */
const ATTACK = [
  { lunge: -3, dy: 0, sy: 0.972, sx: 1.03 },
  { lunge: 4.5, dy: -1.5, sy: 1.03, sx: 0.975 },
  { lunge: 3, dy: -0.5, sy: 1.005, sx: 0.995 },
  { lunge: 1, dy: 0, sy: 1, sx: 1 },
]

function poseFor(clip, index, facing) {
  const [fx, fy] = FORWARD[facing]
  // A lean only reads on the side views; head-on it just looks like a tilt.
  const leans = facing === 'left' || facing === 'right'

  if (clip === 'idle') return { ...IDLE[index], rot: 0 }
  if (clip === 'walk') {
    const step = WALK[index]
    return { ...step, rot: leans ? step.rot : step.rot * 0.45 }
  }
  const beat = ATTACK[index]
  return {
    dx: beat.lunge * fx,
    dy: beat.dy + beat.lunge * fy * 0.55,
    rot: leans ? beat.lunge * 0.014 * fx : 0,
    sy: beat.sy,
    sx: beat.sx,
  }
}

/**
 * Per-facing treatment of the one drawn pose.
 *
 * The mirroring here is load-bearing, and getting it wrong is very visible in
 * play. An earlier version mirrored `up` but not `down`, which meant walking
 * up and then down flipped the character horizontally — so pressing up appeared
 * to turn him around, and which way he "faced" depended on the last vertical
 * key rather than on where he was going.
 *
 * The rule now: `down` and `up` are never mirrored, so vertical movement can't
 * change his handedness at all. The two side views are mirrors of one another,
 * which is the only place a flip means anything.
 *
 * The side art is drawn facing left (head turned that way), so `left` uses it
 * as-is and `right` mirrors it. That also puts the tail behind him either way:
 * in the source it sweeps to the viewer's right, which trails a left-facing
 * character and, once mirrored, trails a right-facing one.
 */
function facingStyle(facing) {
  switch (facing) {
    case 'down':
      return { squeeze: 1, flip: false, source: 'front' }
    case 'left':
      return { squeeze: 0.84, flip: false, source: 'side' }
    case 'right':
      return { squeeze: 0.84, flip: true, source: 'side' }
    case 'up':
      return { squeeze: 1, flip: false, source: 'back' }
  }
}

// --------------------------------------------------------------- shadow

/** The contact shadow the character sits on, so it isn't floating. */
function drawShadow(img, cx, cy, rx, ry, alpha) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry)
      if (d > 1) continue
      // Soft all the way out, so it reads as a shadow rather than a disc.
      const a = alpha * (1 - d * d)
      const k = (y * img.width + x) * 4
      const da = img.rgba[k + 3] / 255
      const outA = a + da * (1 - a)
      if (outA <= 0) continue
      img.rgba[k] = Math.round((img.rgba[k] * da * (1 - a)) / outA)
      img.rgba[k + 1] = Math.round((img.rgba[k + 1] * da * (1 - a)) / outA)
      img.rgba[k + 2] = Math.round((img.rgba[k + 2] * da * (1 - a)) / outA)
      img.rgba[k + 3] = Math.round(outA * 255)
    }
  }
}

// ------------------------------------------------------------ the build

/**
 * Where the character actually stands, as a fraction of the cutout's width.
 *
 * Taken from the bottom of the figure — the boots — rather than the middle of
 * the bounding box, which a big sweeping tail would drag off to one side and
 * leave the character walking permanently off-centre.
 */
function groundCenter(img) {
  const from = Math.floor(img.height * 0.94)
  let min = img.width
  let max = -1
  for (let y = from; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.rgba[(y * img.width + x) * 4 + 3] < 40) continue
      if (x < min) min = x
      if (x > max) max = x
    }
  }
  if (max < 0) return 0.5
  return (min + max) / 2 / img.width
}

/** How far the face slides toward the facing side, as a fraction of its width. */
const FACE_TURN = 0.22
/** Horizontal squash on a turned face — a cheek seen at an angle is narrower. */
const FACE_SQUASH = 0.84

/**
 * Locates the face in the top half of the figure — the hands are the same
 * colour, which is what the half is for. See {@link faceBounds} for why this
 * is more than "the biggest patch of skin".
 */
function findFace(cutout, character) {
  const mask = colorMask(cutout, character.skin, character.skinTolerance)
  for (let y = Math.floor(cutout.height * 0.5); y < cutout.height; y++) {
    for (let x = 0; x < cutout.width; x++) mask[y * cutout.width + x] = 0
  }
  return faceBounds(mask, cutout.width, cutout.height)
}

/** The mass of hair beside the face: its average colour, and the pixels. */
function readHair(cutout, character) {
  const [hx, hy, hw, hh] = character.hairSampleBox
  const rect = [
    Math.round(cutout.width * hx),
    Math.round(cutout.height * hy),
    Math.round(cutout.width * hw),
    Math.round(cutout.height * hh),
  ]
  return { rect, color: averageColor(cutout, ...rect) ?? [120, 80, 48], image: crop(cutout, ...rect) }
}

/**
 * Covers the face with the character's own hair.
 *
 * Flat colour first so nothing of the face survives at the edges, then real
 * hair pixels over the top: those carry the artist's shading and strand detail,
 * where a flat oval reads as a hole in the head however well the colour matches.
 */
function coverFace(image, face, hair, { rx, ry, alpha = 0.95 } = {}) {
  const cx = face.x + face.width / 2
  const cy = face.y + face.height * 0.5
  const radiusX = rx ?? face.width * 0.58
  const radiusY = ry ?? face.height * 0.6

  fillEllipse(image, cx, cy, radiusX, radiusY, hair.color.map((c) => Math.round(c * 0.88)), 0.28)

  const patch = cloneImage(hair.image)
  multiplyEllipseAlpha(patch, patch.width / 2, patch.height / 2, patch.width / 2, patch.height / 2, 0.5)
  blit(image, patch, {
    x: cx,
    y: cy,
    scaleX: (radiusX * 2.05) / patch.width,
    scaleY: (radiusY * 2.05) / patch.height,
    alpha,
    shade: 0.08,
  })
}

/** The nape: face gone entirely, ears and silhouette kept. */
function makeBackView(cutout, face, hair) {
  const back = cloneImage(cutout)
  coverFace(back, face, hair)
  return back
}

/**
 * A head turned to the character's left.
 *
 * The face is lifted off, the hair is closed over where it was, and the face is
 * set back down shifted toward the direction of travel and narrowed. That is
 * the standard way to fake a turn in 2D, and it's what makes a side view read
 * as *going* somewhere rather than as the front view standing sideways —
 * which is exactly the complaint that prompted it.
 */
function makeSideView(cutout, face, hair) {
  const side = cloneImage(cutout)
  // Cover a little wider than the back view: the face is about to move, and
  // any sliver of the original left showing behind it reads as a smear.
  coverFace(side, face, hair, { rx: face.width * 0.66, ry: face.height * 0.66 })

  // Taken with margin so the brows above and the chin below travel with it.
  const padX = face.width * 0.22
  const padY = face.height * 0.34
  const patch = crop(
    cutout,
    Math.round(face.x - padX),
    Math.round(face.y - padY),
    Math.round(face.width + padX * 2),
    Math.round(face.height + padY * 2),
  )
  multiplyEllipseAlpha(patch, patch.width / 2, patch.height / 2, patch.width * 0.46, patch.height * 0.46, 0.42)

  blit(side, patch, {
    x: face.x + face.width / 2 - face.width * FACE_TURN,
    y: face.y + face.height * 0.5,
    scaleX: FACE_SQUASH,
    scaleY: 1,
  })
  return side
}

function buildSheet(character) {
  const raw = decodePng(readFileSync(join(ROOT, character.source)))
  keyBackground(raw, { minLuma: 168, maxSaturation: 0.15, feather: 2 })
  keepLargestComponent(raw)
  const { image: cutout } = trim(raw)

  const face = findFace(cutout, character)
  const hair = face ? readHair(cutout, character) : null
  // Without a face there's nothing to turn or cover, so every view falls back
  // to the drawing as-is — wrong, but visibly wrong, rather than a crash.
  const views = {
    front: cutout,
    side: face && hair ? makeSideView(cutout, face, hair) : cutout,
    back: face && hair ? makeBackView(cutout, face, hair) : cutout,
  }
  if (!face) console.warn(`[sprites] ${character.form}: no face found; side and back views will show one`)
  console.log(
    `[sprites] ${character.form}: cutout ${cutout.width}x${cutout.height}` +
      (face ? `, face ${face.width}x${face.height} at ${face.x},${face.y}` : ', no face found') +
      (hair ? `, hair #${hair.color.map((c) => c.toString(16).padStart(2, '0')).join('')}` : ''),
  )

  const anchorX = groundCenter(cutout)
  const scale = (FRAME * FILL) / cutout.height
  const footY = FRAME * (1 - FOOT_FRACTION)
  const sheet = makeImage(COLS * FRAME, ROWS * FRAME)

  for (const clip of CLIPS) {
    FACINGS.forEach((facing, f) => {
      const style = facingStyle(facing)
      const source = views[style.source]
      const row = clip.row + f

      for (let i = 0; i < clip.frames; i++) {
        const pose = poseFor(clip.name, i, facing)
        const originX = i * FRAME
        const originY = row * FRAME
        const cx = originX + FRAME / 2 + pose.dx
        const cy = originY + footY + pose.dy

        // Shadow first, and it stays put while the character moves over it.
        drawShadow(
          sheet,
          originX + FRAME / 2,
          originY + footY - 1,
          FRAME * 0.17 * style.squeeze,
          FRAME * 0.052,
          0.3,
        )

        blit(sheet, source, {
          x: cx,
          y: cy,
          anchor: [anchorX, 1],
          scaleX: scale * style.squeeze * pose.sx,
          scaleY: scale * pose.sy,
          rotation: pose.rot,
          flipX: style.flip,
        })
      }
    })
  }

  const out = join(ROOT, 'public/sprites', `${character.form}.png`)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, encodePng(sheet.width, sheet.height, sheet.rgba))
  console.log(`[sprites] wrote ${out} (${sheet.width}x${sheet.height})`)

  // `--debug` dumps the isolated character on its own, which is what you want
  // to look at when the background keying needs tuning for new artwork.
  if (process.argv.includes('--debug')) {
    const path = join(ROOT, 'art-source', `${character.form}-cutout.png`)
    writeFileSync(path, encodePng(cutout.width, cutout.height, cutout.rgba))
    console.log(`[sprites] wrote ${path}`)
  }
}

for (const character of CHARACTERS) buildSheet(character)
