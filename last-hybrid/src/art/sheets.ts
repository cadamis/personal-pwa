/**
 * The character spritesheet contract.
 *
 * Everything about a form's art lives in one {@link SheetSpec}: where the file
 * is, how big a frame is, and which grid cells make up each animation. Nothing
 * else in the game hard-codes a frame number, so dropping the real artwork in
 * is a change to this file and nothing else.
 *
 * ## Getting official art into the game
 *
 * 1. Save the sheet as `public/sprites/<form>.png`.
 * 2. Set `frameWidth` / `frameHeight` / `cols` to match it, and `display` to
 *    the height in world pixels you want it drawn at (`TILE` is 48).
 * 3. If the sheet's rows aren't in the order below, re-point the `row` numbers
 *    in {@link CLIP_LAYOUT} — or give that one form its own `clips` override.
 *
 * Until a file exists at that path the loader 404s, and the game generates a
 * placeholder sheet with exactly this layout instead (see
 * [placeholderChars.ts](./placeholderChars.ts)), so the two are
 * interchangeable and the game is playable either way.
 *
 * ## The default grid
 *
 * Row-major, 6 columns wide, 12 rows tall — a frame's index is
 * `row * cols + col`:
 *
 * ```
 *  row  0..3   idle    facing down, left, right, up   (2 frames)
 *  row  4..7   walk    facing down, left, right, up   (6 frames)
 *  row  8..11  attack  facing down, left, right, up   (4 frames)
 * ```
 */
import type { FormId } from '../game/forms'

/** The four facings, in the row order every sheet uses. */
export const FACINGS = ['down', 'left', 'right', 'up'] as const
export type Facing = (typeof FACINGS)[number]

export const CLIPS = ['idle', 'walk', 'attack'] as const
export type ClipName = (typeof CLIPS)[number]

export interface ClipSpec {
  /** Row of the first facing (`down`); the other three follow it in order. */
  row: number
  frames: number
  frameRate: number
  /** -1 loops forever, 0 plays once. */
  repeat: number
}

/** The row/timing layout every sheet uses unless it overrides it. */
export const CLIP_LAYOUT: Record<ClipName, ClipSpec> = {
  idle: { row: 0, frames: 2, frameRate: 3, repeat: -1 },
  walk: { row: 4, frames: 6, frameRate: 11, repeat: -1 },
  attack: { row: 8, frames: 4, frameRate: 16, repeat: 0 },
}

export interface SheetSpec {
  /** Texture key, and the stem of the file under `public/sprites/`. */
  key: FormId
  file: string
  frameWidth: number
  frameHeight: number
  cols: number
  rows: number
  /** Rendered height in world pixels. The sprite's scale is derived from it. */
  display: number
  /**
   * How far up from the frame's bottom edge the character's feet are, as a
   * fraction of frame height. Sprites are positioned by their feet so they sort
   * against the ground correctly no matter how tall the art is.
   */
  footFraction: number
  clips?: Partial<Record<ClipName, ClipSpec>>
}

/** The default grid, used by any form still on placeholder art. */
const GRID = { frameWidth: 64, frameHeight: 64, cols: 6, rows: 12 } as const

/**
 * The grid `npm run sprites` writes: 96px cells, to keep the detail of the
 * original drawings. The figure fills 90% of its cell, so a 58px display height
 * renders a character about 52px tall.
 */
const BUILT = { frameWidth: 96, frameHeight: 96, cols: 6, rows: 12, display: 58, footFraction: 0.06 } as const

export const SHEETS: Record<FormId, SheetSpec> = {
  // Both humanoids are real artwork now. The wolf is still a placeholder, on
  // the smaller default grid — cell size is per sheet precisely so the forms
  // can be replaced one at a time.
  mmc: { key: 'mmc', file: 'sprites/mmc.png', ...BUILT },
  fmc: { key: 'fmc', file: 'sprites/fmc.png', ...BUILT },
  // The wolf is longer and lower, so it gets a taller display height than the
  // humanoids to keep its body reading at the same weight.
  wolf: { key: 'wolf', file: 'sprites/wolf.png', ...GRID, display: 58, footFraction: 0.06 },
}

/** Phaser animation key for one clip of one form in one direction. */
export function animKey(form: FormId, clip: ClipName, facing: Facing): string {
  return `${form}-${clip}-${facing}`
}

/** Resolves a clip's layout, honouring any per-sheet override. */
export function clipSpec(spec: SheetSpec, clip: ClipName): ClipSpec {
  return spec.clips?.[clip] ?? CLIP_LAYOUT[clip]
}

/**
 * The frame indices for one clip in one facing, in play order.
 *
 * Exported (and free of Phaser) so a test can assert the layout stays inside
 * the sheet — an off-by-one row here is otherwise an invisible bug that only
 * shows up as the wrong sprite mid-animation.
 */
export function clipFrames(spec: SheetSpec, clip: ClipName, facing: Facing): number[] {
  const layout = clipSpec(spec, clip)
  const row = layout.row + FACINGS.indexOf(facing)
  const start = row * spec.cols
  return Array.from({ length: layout.frames }, (_, i) => start + i)
}
