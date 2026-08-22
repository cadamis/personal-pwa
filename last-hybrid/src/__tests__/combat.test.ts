/** Swing resolution, including the angle wrapping that's easy to get wrong. */
import { describe, expect, it } from 'vitest'
import { FACING_VECTORS, strikeHits, wrapAngle, type Strike } from '../game/combat'
import { FORMS } from '../game/forms'

function swing(angle: number, overrides: Partial<Strike> = {}): Strike {
  return { x: 0, y: 0, radius: 40, angle, arc: 0.9, damage: 1, id: 1, ...overrides }
}

describe('wrapAngle', () => {
  it('leaves angles already in range alone', () => {
    expect(wrapAngle(1)).toBeCloseTo(1)
    expect(wrapAngle(-1)).toBeCloseTo(-1)
  })

  it('wraps past ±π, onto the -π end of the range', () => {
    expect(wrapAngle(Math.PI * 3)).toBeCloseTo(-Math.PI)
    expect(wrapAngle(-Math.PI * 3)).toBeCloseTo(-Math.PI)
    expect(wrapAngle(Math.PI * 1.5)).toBeCloseTo(-Math.PI * 0.5)
  })
})

describe('strikeHits', () => {
  it('hits what is in front', () => {
    expect(strikeHits(swing(0), 30, 0, 8)).toBe(true)
  })

  it('misses what is behind', () => {
    expect(strikeHits(swing(0), -30, 0, 8)).toBe(false)
  })

  it('misses what is out of reach', () => {
    expect(strikeHits(swing(0), 200, 0, 8)).toBe(false)
  })

  it('still works for a swing aimed across the ±π seam', () => {
    // Facing left is angle π; a target just below it wraps to -π.
    const left = swing(Math.PI)
    expect(strikeHits(left, -30, 4, 8)).toBe(true)
    expect(strikeHits(left, -30, -4, 8)).toBe(true)
    expect(strikeHits(left, 30, 0, 8)).toBe(false)
  })

  it('hits anything overlapping the attacker, whatever the angle', () => {
    expect(strikeHits(swing(0), -4, 0, 20)).toBe(true)
  })

  it('forgives the arc for a target pressed up against you', () => {
    // Just outside the raw wedge at close range — the size allowance covers it.
    const strike = swing(0, { arc: 0.5 })
    expect(strikeHits(strike, 14, 10, 12)).toBe(true)
    // The same offset far away is a clean miss.
    expect(strikeHits(strike, 34, 24, 4)).toBe(false)
  })

  it('reaches every facing symmetrically', () => {
    for (const [facing, vector] of Object.entries(FACING_VECTORS)) {
      const strike = swing(Math.atan2(vector.y, vector.x))
      expect(strikeHits(strike, vector.x * 30, vector.y * 30, 8), facing).toBe(true)
      expect(strikeHits(strike, vector.x * -30, vector.y * -30, 8), facing).toBe(false)
    }
  })

  it('gives every form a wedge that is neither a full circle nor a needle', () => {
    for (const form of Object.values(FORMS)) {
      expect(form.arc).toBeGreaterThan(0.3)
      expect(form.arc).toBeLessThan(Math.PI / 2)
      expect(form.reach).toBeGreaterThan(0)
    }
  })
})
