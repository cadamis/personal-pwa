import { describe, expect, it } from 'vitest'
import { METAS } from '../data/meta'
import {
  applyRunResult,
  defaultSave,
  metaLevel,
  nextMetaCost,
  parseSave,
  tryBuyMeta,
  tryUnlockCharacter,
} from '../game/save'

describe('parseSave', () => {
  it('falls back to a fresh save for junk input', () => {
    expect(parseSave(null)).toEqual(defaultSave())
    expect(parseSave('not json')).toEqual(defaultSave())
    expect(parseSave('[1,2,3]')).toEqual(defaultSave())
    expect(parseSave('null')).toEqual(defaultSave())
  })

  it('keeps good values and repairs bad ones', () => {
    const save = parseSave(
      JSON.stringify({
        sprinkles: 123.7,
        bestTimeSec: -5,
        bestKills: 'lots',
        wins: 2,
        muted: 'yes',
        upgrades: { growthSpurt: 3, sharperSparkles: 999, nonsense: 4 },
        unlocked: ['nimbus', 'not-a-friend', 42],
        lastCharacter: 'nimbus',
      }),
    )
    expect(save.sprinkles).toBe(123)
    expect(save.bestTimeSec).toBe(0)
    expect(save.bestKills).toBe(0)
    expect(save.wins).toBe(2)
    // Only a literal `true` counts as muted, so a truthy string doesn't.
    expect(save.muted).toBe(false)
    expect(save.upgrades.growthSpurt).toBe(3)
    expect(save.upgrades.sharperSparkles).toBe(METAS.sharperSparkles.maxLevel)
    expect(save.upgrades).not.toHaveProperty('nonsense')
    expect(save.unlocked).toEqual(['mochi', 'nimbus'])
    expect(save.lastCharacter).toBe('nimbus')
  })

  it('never leaves the last character locked', () => {
    const save = parseSave(JSON.stringify({ unlocked: ['mochi'], lastCharacter: 'blobbo' }))
    expect(save.lastCharacter).toBe('mochi')
  })
})

describe('shop purchases', () => {
  it('refuses a purchase you cannot afford and leaves the save alone', () => {
    const save = { ...defaultSave(), sprinkles: 10 }
    expect(tryBuyMeta(save, 'growthSpurt')).toBeNull()
    expect(save.sprinkles).toBe(10)
  })

  it('charges the escalating price and banks the level', () => {
    let save = { ...defaultSave(), sprinkles: 1000 }
    const first = nextMetaCost(save, 'growthSpurt')
    expect(first).toBe(METAS.growthSpurt.baseCost)

    save = tryBuyMeta(save, 'growthSpurt')!
    expect(metaLevel(save, 'growthSpurt')).toBe(1)
    expect(save.sprinkles).toBe(1000 - first!)
    expect(nextMetaCost(save, 'growthSpurt')!).toBeGreaterThan(first!)
  })

  it('stops selling at max level', () => {
    let save = { ...defaultSave(), sprinkles: 99999 }
    for (let i = 0; i < METAS.luckyClover.maxLevel; i++) {
      save = tryBuyMeta(save, 'luckyClover')!
    }
    expect(metaLevel(save, 'luckyClover')).toBe(METAS.luckyClover.maxLevel)
    expect(nextMetaCost(save, 'luckyClover')).toBeNull()
    expect(tryBuyMeta(save, 'luckyClover')).toBeNull()
  })
})

describe('character unlocks', () => {
  it('unlocks, charges and selects in one go', () => {
    const save = { ...defaultSave(), sprinkles: 500 }
    const next = tryUnlockCharacter(save, 'nimbus')!
    expect(next.unlocked).toContain('nimbus')
    expect(next.lastCharacter).toBe('nimbus')
    expect(next.sprinkles).toBe(250)
  })

  it('will not double-buy or overspend', () => {
    const owned = { ...defaultSave(), sprinkles: 5000, unlocked: ['mochi' as const, 'pip' as const] }
    expect(tryUnlockCharacter(owned, 'pip')).toBeNull()
    expect(tryUnlockCharacter({ ...defaultSave(), sprinkles: 1 }, 'waffles')).toBeNull()
  })
})

describe('applyRunResult', () => {
  it('adds takings and only ratchets records upwards', () => {
    const save = { ...defaultSave(), sprinkles: 40, bestTimeSec: 120, bestKills: 300 }
    const next = applyRunResult(save, { sprinkles: 60, survivedSec: 90, kills: 400, won: true })
    expect(next.sprinkles).toBe(100)
    expect(next.bestTimeSec).toBe(120)
    expect(next.bestKills).toBe(400)
    expect(next.wins).toBe(1)
    expect(next.runs).toBe(1)
  })

  it('ignores a negative payout rather than draining the jar', () => {
    const save = { ...defaultSave(), sprinkles: 40 }
    const next = applyRunResult(save, { sprinkles: -100, survivedSec: 1, kills: 0, won: false })
    expect(next.sprinkles).toBe(40)
  })
})
