/**
 * The game's input vocabulary, and the pure logic that folds three very
 * different control schemes into one.
 *
 * Deliberately free of Phaser: every source (keyboard, gamepad, touch) fills in
 * the same {@link SourceState} shape, and the rest of the game only ever sees
 * the merged result. Adding a fourth scheme later means writing one more
 * producer, not touching the player.
 */

export const ACTIONS = ['attack', 'dash', 'interact', 'shift', 'pause'] as const
export type Action = (typeof ACTIONS)[number]

export interface Vec2 {
  x: number
  y: number
}

export interface SourceState {
  /** Movement, already clamped to magnitude <= 1. */
  move: Vec2
  buttons: Record<Action, boolean>
}

export function noButtons(): Record<Action, boolean> {
  return { attack: false, dash: false, interact: false, shift: false, pause: false }
}

export function emptySource(): SourceState {
  return { move: { x: 0, y: 0 }, buttons: noButtons() }
}

/** Zeroes a source in place, ready to be refilled this frame. */
export function resetSource(source: SourceState): void {
  source.move.x = 0
  source.move.y = 0
  for (const action of ACTIONS) source.buttons[action] = false
}

/** Shortens a vector to magnitude 1 if it's longer, leaving direction alone. */
export function clampMagnitude(x: number, y: number): Vec2 {
  const length = Math.hypot(x, y)
  return length > 1 ? { x: x / length, y: y / length } : { x, y }
}

/**
 * Radial dead zone. Radial rather than per-axis so a worn stick resting at
 * (0.15, 0.15) still counts as centred, and so diagonals aren't favoured.
 * Rescales what's left across the full 0..1 range, so the first millimetre past
 * the dead zone is a slow walk rather than a jump to a third of top speed.
 */
export function applyDeadzone(x: number, y: number, deadzone: number): Vec2 {
  const length = Math.hypot(x, y)
  if (length <= deadzone) return { x: 0, y: 0 }
  const scaled = Math.min(1, (length - deadzone) / (1 - deadzone))
  return { x: (x / length) * scaled, y: (y / length) * scaled }
}

/**
 * Combines every source into one state.
 *
 * Movement takes whichever source is pushing hardest rather than summing them,
 * so a stick resting slightly off-centre can't drag a keyboard-driven walk
 * off course. Buttons are OR'd — any source can fire any action at any time,
 * which is what lets someone pick up a controller mid-session and just use it.
 */
export function mergeSources(sources: readonly SourceState[], out: SourceState): SourceState {
  let bestLength = 0
  out.move.x = 0
  out.move.y = 0
  for (const action of ACTIONS) out.buttons[action] = false

  for (const source of sources) {
    const length = Math.hypot(source.move.x, source.move.y)
    if (length > bestLength) {
      bestLength = length
      out.move.x = source.move.x
      out.move.y = source.move.y
    }
    for (const action of ACTIONS) {
      if (source.buttons[action]) out.buttons[action] = true
    }
  }
  return out
}

/** The four facings, as a movement vector. Ties break toward the vertical. */
export function facingFromVector(x: number, y: number): 'up' | 'down' | 'left' | 'right' | null {
  if (x === 0 && y === 0) return null
  if (Math.abs(x) > Math.abs(y)) return x > 0 ? 'right' : 'left'
  return y > 0 ? 'down' : 'up'
}
