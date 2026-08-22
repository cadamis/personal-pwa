/**
 * The intro's choreography. Checked here rather than by watching a
 * twelve-second animation and trying to spot a beat that fires early, late, or
 * on top of another one.
 */
import { describe, expect, it } from 'vitest'
import {
  BEATS,
  BEAT_IDS,
  RING,
  STAGE_H,
  STAGE_W,
  beatSchedule,
  beatStart,
  hunterMarks,
  inBottomGap,
  introDuration,
} from '../game/introScript'

describe('beat schedule', () => {
  it('covers every named beat, in order, exactly once', () => {
    expect(beatSchedule().map((beat) => beat.id)).toEqual([...BEAT_IDS])
  })

  it('lays the beats end to end with no gap or overlap', () => {
    const schedule = beatSchedule()
    expect(schedule[0].start).toBe(0)
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].start, schedule[i].id).toBe(schedule[i - 1].end)
    }
  })

  it('gives every beat a positive length', () => {
    for (const beat of BEATS) expect(beat.ms, beat.id).toBeGreaterThan(0)
  })

  it('ends where the last beat ends', () => {
    const schedule = beatSchedule()
    expect(introDuration()).toBe(schedule[schedule.length - 1].end)
  })

  it('runs long enough to read but short enough to sit through', () => {
    expect(introDuration()).toBeGreaterThan(6_000)
    expect(introDuration()).toBeLessThan(20_000)
  })

  it('looks beats up by name', () => {
    expect(beatStart('surround')).toBe(0)
    expect(beatStart('fall')).toBe(BEATS[0].ms + BEATS[1].ms)
  })

  it('rejects an unknown beat rather than silently returning 0', () => {
    // @ts-expect-error deliberately off-script
    expect(() => beatStart('nope')).toThrow(/Unknown intro beat/)
  })

  it('leaves the fall long enough to feel like a fall', () => {
    const fall = BEATS.find((beat) => beat.id === 'fall')
    expect(fall?.ms).toBeGreaterThanOrEqual(2_000)
  })
})

describe('hunterMarks', () => {
  const marks = hunterMarks(6)

  it('places one hunter per slot', () => {
    expect(marks).toHaveLength(6)
  })

  it('starts every hunter off the stage', () => {
    for (const mark of marks) {
      const offStage =
        Math.abs(mark.startX) > STAGE_W / 2 || Math.abs(mark.startY) > STAGE_H / 2
      expect(offStage, `${mark.startX},${mark.startY}`).toBe(true)
    }
  })

  it('starts them off screen on a tall display too, not just a wide one', () => {
    // A portrait tablet: the frame is much taller than the authored stage, so a
    // start ring sized off the stage alone would sit well inside it.
    const portrait = { ...RING, halfW: 340, halfH: 453 }
    for (const mark of hunterMarks(6, portrait)) {
      const offScreen =
        Math.abs(mark.startX) > portrait.halfW || Math.abs(mark.startY) > portrait.halfH
      expect(offScreen, `${mark.startX},${mark.startY}`).toBe(true)
    }
  })

  it('walks them in from further out than they end up', () => {
    for (const mark of marks) {
      expect(Math.hypot(mark.startX, mark.startY)).toBeGreaterThan(Math.hypot(mark.x, mark.y))
    }
  })

  it('closes them onto the ring, not on top of her', () => {
    for (const mark of marks) {
      const distance = Math.hypot(mark.x / RING.rx, mark.y / RING.ry)
      expect(distance).toBeCloseTo(1, 5)
    }
  })

  it('leaves the front of the shot clear', () => {
    for (const mark of marks) {
      expect(inBottomGap(mark.x, mark.y), `${mark.x},${mark.y}`).toBe(false)
    }
    // The gap is real: a point directly below her is inside it.
    expect(inBottomGap(0, RING.ry)).toBe(true)
  })

  it('surrounds her — hunters on both sides and above', () => {
    expect(marks.some((mark) => mark.x < -RING.rx * 0.4)).toBe(true)
    expect(marks.some((mark) => mark.x > RING.rx * 0.4)).toBe(true)
    expect(marks.some((mark) => mark.y < -RING.ry * 0.4)).toBe(true)
  })

  it('turns every hunter inward', () => {
    for (const mark of marks) {
      if (mark.x > 1) expect(mark.facing).toBe(-1)
      if (mark.x < -1) expect(mark.facing).toBe(1)
    }
  })

  it('never stacks two hunters in the same spot', () => {
    for (let i = 0; i < marks.length; i++) {
      for (let j = i + 1; j < marks.length; j++) {
        expect(Math.hypot(marks[i].x - marks[j].x, marks[i].y - marks[j].y)).toBeGreaterThan(40)
      }
    }
  })

  it('handles a single hunter without dividing by zero', () => {
    const [only] = hunterMarks(1)
    expect(Number.isFinite(only.x) && Number.isFinite(only.y)).toBe(true)
  })
})
