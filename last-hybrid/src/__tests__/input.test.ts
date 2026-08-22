/**
 * The three control schemes all feed one merged state, and the merge rules are
 * where "the stick fights the keyboard" bugs come from.
 */
import { describe, expect, it } from 'vitest'
import {
  ACTIONS,
  applyDeadzone,
  clampMagnitude,
  emptySource,
  facingFromVector,
  mergeSources,
  resetSource,
} from '../input/actions'

describe('clampMagnitude', () => {
  it('leaves a short vector alone', () => {
    expect(clampMagnitude(0.3, 0.4)).toEqual({ x: 0.3, y: 0.4 })
  })

  it('normalises a diagonal, so two keys are not faster than one', () => {
    const move = clampMagnitude(1, 1)
    expect(Math.hypot(move.x, move.y)).toBeCloseTo(1)
    expect(move.x).toBeCloseTo(move.y)
  })

  it('is a no-op at rest', () => {
    expect(clampMagnitude(0, 0)).toEqual({ x: 0, y: 0 })
  })
})

describe('applyDeadzone', () => {
  it('zeroes a resting stick', () => {
    expect(applyDeadzone(0.15, 0.1, 0.24)).toEqual({ x: 0, y: 0 })
  })

  it('rescales what is left, so the first push past it is a slow walk', () => {
    const move = applyDeadzone(0.25, 0, 0.24)
    expect(Math.hypot(move.x, move.y)).toBeLessThan(0.05)
  })

  it('still reaches full speed at the rim', () => {
    const move = applyDeadzone(1, 0, 0.24)
    expect(Math.hypot(move.x, move.y)).toBeCloseTo(1)
  })

  it('treats the dead zone as a circle, not a square', () => {
    // Inside on each axis, but outside the circle: this must still move.
    const move = applyDeadzone(0.2, 0.2, 0.24)
    expect(Math.hypot(move.x, move.y)).toBeGreaterThan(0)
  })

  it('keeps direction', () => {
    const move = applyDeadzone(-0.6, 0.8, 0.24)
    expect(Math.atan2(move.y, move.x)).toBeCloseTo(Math.atan2(0.8, -0.6))
  })
})

describe('mergeSources', () => {
  it('takes the strongest movement rather than summing', () => {
    const keyboard = emptySource()
    keyboard.move.x = 1
    const pad = emptySource()
    pad.move.x = 0.3
    const out = mergeSources([keyboard, pad], emptySource())
    expect(out.move.x).toBe(1)
  })

  it('does not let an off-centre stick drag a keyboard walk sideways', () => {
    const keyboard = emptySource()
    keyboard.move.y = -1
    const driftingPad = emptySource()
    driftingPad.move.x = 0.2
    const out = mergeSources([keyboard, driftingPad], emptySource())
    expect(out.move).toEqual({ x: 0, y: -1 })
  })

  it('ORs buttons, so any scheme can fire any action', () => {
    const touch = emptySource()
    touch.buttons.attack = true
    const pad = emptySource()
    pad.buttons.dash = true
    const out = mergeSources([touch, pad], emptySource())
    expect(out.buttons.attack).toBe(true)
    expect(out.buttons.dash).toBe(true)
    expect(out.buttons.pause).toBe(false)
  })

  it('clears the previous frame out of the output it reuses', () => {
    const out = emptySource()
    out.move.x = 1
    for (const action of ACTIONS) out.buttons[action] = true
    mergeSources([emptySource()], out)
    expect(out.move).toEqual({ x: 0, y: 0 })
    expect(Object.values(out.buttons).some(Boolean)).toBe(false)
  })
})

describe('resetSource', () => {
  it('zeroes everything in place', () => {
    const source = emptySource()
    source.move.x = 0.5
    source.buttons.shift = true
    resetSource(source)
    expect(source.move).toEqual({ x: 0, y: 0 })
    expect(source.buttons.shift).toBe(false)
  })
})

describe('facingFromVector', () => {
  it('picks the dominant axis', () => {
    expect(facingFromVector(1, 0.2)).toBe('right')
    expect(facingFromVector(-1, 0.2)).toBe('left')
    expect(facingFromVector(0.2, 1)).toBe('down')
    expect(facingFromVector(0.2, -1)).toBe('up')
  })

  it('breaks an exact diagonal toward the vertical', () => {
    expect(facingFromVector(1, 1)).toBe('down')
    expect(facingFromVector(1, -1)).toBe('up')
  })

  it('reports nothing at rest', () => {
    expect(facingFromVector(0, 0)).toBeNull()
  })
})
