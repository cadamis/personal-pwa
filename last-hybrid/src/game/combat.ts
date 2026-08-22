/**
 * Hit resolution, kept free of Phaser so it can be tested directly.
 *
 * A swing is a wedge in front of the attacker rather than a circle, so backing
 * off actually works and facing the right way matters. Angle wrapping at ±π is
 * the classic way to get that wrong — a forward swing quietly becomes a
 * backward one — which is most of why this lives on its own.
 */
import type { Facing } from '../art/sheets'

/** A live attack hitbox. */
export interface Strike {
  x: number
  y: number
  /** How far from `x, y` the wedge reaches. */
  radius: number
  /** Direction the wedge points, in radians. */
  angle: number
  /** Half-width of the wedge, in radians. */
  arc: number
  damage: number
  /** Increments every swing, so one swing can't hit the same target twice. */
  id: number
}

/** Unit vector per facing. Screen coordinates, so `down` is +y. */
export const FACING_VECTORS: Record<Facing, { x: number; y: number }> = {
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
}

/** Wraps an angle to [-π, π). Note π itself comes back as -π. */
export function wrapAngle(angle: number): number {
  const wrapped = (angle + Math.PI) % (Math.PI * 2)
  return (wrapped < 0 ? wrapped + Math.PI * 2 : wrapped) - Math.PI
}

/** Whether a circular target at (x, y) is inside a strike's wedge. */
export function strikeHits(strike: Strike, x: number, y: number, targetRadius: number): boolean {
  const dx = x - strike.x
  const dy = y - strike.y
  const distance = Math.hypot(dx, dy)
  if (distance > strike.radius + targetRadius) return false
  // Anything overlapping the attacker is hit regardless of angle.
  if (distance < targetRadius * 0.5) return true
  const delta = Math.abs(wrapAngle(Math.atan2(dy, dx) - strike.angle))
  // Widen the wedge for close targets, so something pressed right up against
  // you can't slip out the side of a swing aimed straight at it.
  const forgiveness = Math.atan2(targetRadius, Math.max(distance, 1))
  return delta <= strike.arc + forgiveness
}
