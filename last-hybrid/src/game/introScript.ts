/**
 * The shape of the opening cinematic: how long each beat runs, and where the
 * hunters stand.
 *
 * Free of Phaser so the choreography can be checked by a test rather than by
 * watching a twelve-second animation and squinting. The scene reads absolute
 * start times out of {@link beatSchedule} and hangs one timer off each, which
 * also makes skipping a matter of cancelling timers rather than unwinding a
 * chain of callbacks.
 */

/** The stage the intro is authored against; the scene scales it to cover. */
export const STAGE_W = 960
export const STAGE_H = 640

export const BEAT_IDS = ['surround', 'collapse', 'fall', 'impact', 'settle'] as const
export type BeatId = (typeof BEAT_IDS)[number]

export interface Beat {
  id: BeatId
  ms: number
  /** What the player is looking at, for anyone reading the timeline cold. */
  note: string
}

export const BEATS: readonly Beat[] = [
  { id: 'surround', ms: 3800, note: 'Torches close in from every side.' },
  { id: 'collapse', ms: 1300, note: 'The ground opens under her.' },
  { id: 'fall', ms: 3800, note: 'Down the shaft, daylight shrinking above.' },
  { id: 'impact', ms: 1500, note: 'She lands hard in the Hollow.' },
  { id: 'settle', ms: 1300, note: 'A held breath, then fade to the title.' },
]

export interface ScheduledBeat extends Beat {
  start: number
  end: number
}

/** Lays the beats end to end, giving each an absolute start and end. */
export function beatSchedule(beats: readonly Beat[] = BEATS): ScheduledBeat[] {
  let start = 0
  return beats.map((beat) => {
    const scheduled = { ...beat, start, end: start + beat.ms }
    start += beat.ms
    return scheduled
  })
}

export function introDuration(beats: readonly Beat[] = BEATS): number {
  return beats.reduce((total, beat) => total + beat.ms, 0)
}

/** When a named beat begins, in ms from the top of the intro. */
export function beatStart(id: BeatId, beats: readonly Beat[] = BEATS): number {
  const found = beatSchedule(beats).find((beat) => beat.id === id)
  if (!found) throw new Error(`Unknown intro beat: ${id}`)
  return found.start
}

export interface HunterMark {
  /** Where the hunter walks to, in stage coordinates relative to centre. */
  x: number
  y: number
  /** Where it starts, off the edge of the stage. */
  startX: number
  startY: number
  /** Which way it faces when it arrives: -1 looking left, 1 looking right. */
  facing: -1 | 1
}

export interface RingOptions {
  /** Half-width and half-height of the ring they close to. */
  rx: number
  ry: number
  /**
   * How far past the edge of the frame they begin, as a multiple of the
   * distance at which they'd first leave it.
   *
   * Deliberately *not* a multiple of the ring: the ring is much wider than it
   * is tall, so scaling it uniformly leaves the hunters on the diagonals still
   * inside the frame, and they pop into existence instead of walking in.
   */
  approach: number
  /** Half-extents of the visible area, for working out where "off" is. */
  halfW: number
  halfH: number
  /**
   * Half-width of the wedge left open at the bottom of the ring, in radians.
   * Nobody stands directly in front of her — a hunter there would be drawn over
   * the top of the shot's only subject.
   */
  gap: number
}

/**
 * Wide and flat. The ring has to stay inside the frame through the push-in, and
 * there's far more room to the sides than above — a taller ring puts the two
 * back hunters' heads through the top of the shot.
 */
export const RING: RingOptions = {
  rx: 340,
  ry: 158,
  approach: 1.35,
  gap: 0.44,
  halfW: STAGE_W / 2,
  halfH: STAGE_H / 2,
}

/**
 * Spaces `count` hunters evenly around the ring, skipping the gap at the
 * bottom. Angles run clockwise on screen from the +x axis, so π/2 is directly
 * below her.
 *
 * Each one sits at the *centre* of its share of the arc rather than at the
 * ends, which keeps the first and last off the lip of the gap — placing them
 * on the boundary exactly is both fragile and reads as a smaller gap than the
 * one that was asked for. It also means `count === 1` needs no special case.
 */
export function hunterMarks(count: number, options: RingOptions = RING): HunterMark[] {
  const bottom = Math.PI / 2
  const from = bottom + options.gap
  const span = Math.PI * 2 - options.gap * 2
  return Array.from({ length: count }, (_, i) => {
    const angle = from + ((i + 0.5) / count) * span
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const x = cos * options.rx
    const y = sin * options.ry
    const push = exitDistance(x, y, options) * options.approach
    return {
      x,
      y,
      startX: x * push,
      startY: y * push,
      // They all face inward, toward her.
      facing: cos > 0 ? -1 : 1,
    }
  })
}

/**
 * How far along the ray through (x, y) you have to go, as a multiple of that
 * point, before leaving the visible rectangle.
 */
function exitDistance(x: number, y: number, options: RingOptions): number {
  const byWidth = x === 0 ? Infinity : options.halfW / Math.abs(x)
  const byHeight = y === 0 ? Infinity : options.halfH / Math.abs(y)
  const exit = Math.min(byWidth, byHeight)
  return Number.isFinite(exit) ? exit : 1
}

/** True if a point sits inside the open wedge at the bottom of the ring. */
export function inBottomGap(x: number, y: number, options: RingOptions = RING): boolean {
  if (x === 0 && y === 0) return true
  const angle = Math.atan2(y / options.ry, x / options.rx)
  return Math.abs(angle - Math.PI / 2) < options.gap
}
