import { describe, expect, it } from 'vitest'
import { METAS } from '../data/meta'
import { STICKERS, STICKER_IDS, newlyEarned, type RunSummary } from '../data/stickers'
import { BASE_WEAPON_IDS } from '../data/weapons'
import {
  applyRunResult,
  awardStickers,
  defaultSave,
  isCharacterForSale,
  isGrumpierUnlocked,
  isLevelUnlocked,
  isShopItemAvailable,
  isWeaponUnlocked,
  markStickersSeen,
  metaLevel,
  nextMetaCost,
  parseSave,
  stickerRecords,
  tryBuyMeta,
  tryUnlockCharacter,
  unlockedLevels,
  unlockedWeapons,
  type RunResult,
  type SaveData,
} from '../game/save'

/** A run result with sensible defaults, so each test only states what it cares about. */
function run(overrides: Partial<RunResult>): RunResult {
  return {
    levelId: 'meadow',
    characterId: 'mochi',
    sprinkles: 0,
    survivedSec: 60,
    kills: 10,
    won: false,
    grumpier: false,
    level: 5,
    chestsOpened: 0,
    presentsPopped: 0,
    evolutions: [],
    ...overrides,
  }
}

function summary(overrides: Partial<RunSummary>): RunSummary {
  return {
    levelId: 'meadow',
    characterId: 'mochi',
    won: false,
    grumpier: false,
    survivedSec: 60,
    kills: 10,
    level: 5,
    evolutions: [],
    mostWeapons: 1,
    maxedWeapon: false,
    usedMagnet: false,
    usedBomb: false,
    usedFreeze: false,
    chestsOpened: 0,
    ...overrides,
  }
}

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
        stickers: ['meadowChamp', 'not-a-sticker', 7],
        evolutionsFound: ['bubbleBath', 'bubbleBark', 'nope'],
        bestTimes: { meadow: 200, atlantis: 50 },
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
    expect(save.stickers).toEqual(['meadowChamp'])
    // Only evolutions count as found evolutions.
    expect(save.evolutionsFound).toEqual(['bubbleBath'])
    expect(save.bestTimes).toEqual({ meadow: 200 })
  })

  it('never leaves the last character locked', () => {
    const save = parseSave(JSON.stringify({ unlocked: ['mochi'], lastCharacter: 'blobbo' }))
    expect(save.lastCharacter).toBe('mochi')
  })

  it('loads a save written by the previous version with everything it had', () => {
    // A real shape from before stickers, chests and the extra levels existed.
    const old = {
      sprinkles: 812,
      upgrades: { growthSpurt: 6, sneakerUpgrade: 5, luckyClover: 3, secondWind: 2 },
      unlocked: ['mochi', 'nimbus', 'waffles', 'pip', 'blobbo', 'puddles'],
      lastCharacter: 'puddles',
      bestTimeSec: 311,
      bestKills: 1240,
      wins: 9,
      levelWins: { meadow: 6, forest: 3 },
      lastLevel: 'forest',
      runs: 57,
      muted: false,
    }
    const save = parseSave(JSON.stringify(old))
    expect(save.sprinkles).toBe(812)
    expect(save.upgrades).toEqual(old.upgrades)
    expect(save.unlocked).toEqual(old.unlocked)
    expect(save.lastLevel).toBe('forest')
    expect(isLevelUnlocked(save, 'peaks')).toBe(true)
    expect(isLevelUnlocked(save, 'candy')).toBe(false)

    // ...and their old records are worth stickers straight away.
    const { save: awarded, earned } = awardStickers(save)
    expect(earned).toEqual(expect.arrayContaining(['meadowChamp', 'forestChamp', 'survive5', 'squish500']))
    expect(earned).not.toContain('peaksChamp')
    expect(awarded.sprinkles).toBeGreaterThan(save.sprinkles)
    expect(awarded.newStickers).toEqual(earned)
    // Squish Squad unlocks Cuddle Aura.
    expect(isWeaponUnlocked(awarded, 'cuddleAura')).toBe(true)
  })
})

describe('shop purchases', () => {
  it('refuses a purchase you cannot afford and leaves the save alone', () => {
    const save = { ...defaultSave(), sprinkles: 10 }
    expect(tryBuyMeta(save, 'growthSpurt')).toBeNull()
    expect(save.sprinkles).toBe(10)
  })

  it('charges the escalating price, banks the level and counts the purchase', () => {
    let save = { ...defaultSave(), sprinkles: 1000 }
    const first = nextMetaCost(save, 'growthSpurt')
    expect(first).toBe(METAS.growthSpurt.baseCost)

    save = tryBuyMeta(save, 'growthSpurt')!
    expect(metaLevel(save, 'growthSpurt')).toBe(1)
    expect(save.sprinkles).toBe(1000 - first!)
    expect(save.shopBuys).toBe(1)
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

  it('keeps sticker-locked items off the shelf until the sticker is earned', () => {
    const rich = { ...defaultSave(), sprinkles: 99999 }
    expect(isShopItemAvailable(rich, 'rerollDice')).toBe(false)
    expect(tryBuyMeta(rich, 'rerollDice')).toBeNull()
    const earned: SaveData = { ...rich, stickers: ['evolve1'] }
    expect(isShopItemAvailable(earned, 'rerollDice')).toBe(true)
    expect(metaLevel(tryBuyMeta(earned, 'rerollDice')!, 'rerollDice')).toBe(1)
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

  it('will not sell a friend who comes off a sticker', () => {
    expect(isCharacterForSale('fluffy')).toBe(false)
    expect(tryUnlockCharacter({ ...defaultSave(), sprinkles: 99999 }, 'fluffy')).toBeNull()
  })
})

describe('level unlocks', () => {
  it('starts with only the first level open', () => {
    const save = defaultSave()
    expect(isLevelUnlocked(save, 'meadow')).toBe(true)
    expect(isLevelUnlocked(save, 'forest')).toBe(false)
    expect(unlockedLevels(save)).toEqual(['meadow'])
  })

  it('opens the forest once the meadow boss goes down', () => {
    let save = defaultSave()
    // Surviving isn't enough — the boss has to actually die.
    save = applyRunResult(save, run({ survivedSec: 300, kills: 900, won: false }))
    expect(isLevelUnlocked(save, 'forest')).toBe(false)

    save = applyRunResult(save, run({ survivedSec: 300, kills: 900, won: true }))
    expect(save.levelWins.meadow).toBe(1)
    expect(isLevelUnlocked(save, 'forest')).toBe(true)
    expect(unlockedLevels(save)).toEqual(['meadow', 'forest'])
  })

  it('credits the win to the level it happened on', () => {
    let save = defaultSave()
    save = applyRunResult(save, run({ levelId: 'meadow', survivedSec: 250, won: true }))
    save = applyRunResult(save, run({ levelId: 'forest', survivedSec: 250, won: true }))
    expect(save.levelWins).toEqual({ meadow: 1, forest: 1 })
    expect(save.wins).toBe(2)
    expect(save.lastLevel).toBe('forest')
  })

  it('opens Grumpier mode per level, and counts Grumpier wins separately', () => {
    let save = defaultSave()
    expect(isGrumpierUnlocked(save, 'meadow')).toBe(false)
    save = applyRunResult(save, run({ won: true }))
    expect(isGrumpierUnlocked(save, 'meadow')).toBe(true)
    expect(isGrumpierUnlocked(save, 'forest')).toBe(false)
    save = applyRunResult(save, run({ won: true, grumpier: true }))
    expect(save.grumpierWins).toEqual({ meadow: 1 })
    expect(save.levelWins).toEqual({ meadow: 2 })
  })

  it('treats wins from before levels existed as meadow wins', () => {
    // Saves written by the single-level version have `wins` but no `levelWins`.
    const migrated = parseSave(JSON.stringify({ wins: 3 }))
    expect(migrated.levelWins.meadow).toBe(3)
    expect(isLevelUnlocked(migrated, 'forest')).toBe(true)
  })

  it('refuses to resume on a level that is not unlocked', () => {
    const save = parseSave(JSON.stringify({ lastLevel: 'forest' }))
    expect(save.lastLevel).toBe('meadow')
  })
})

describe('applyRunResult', () => {
  it('adds takings and only ratchets records upwards', () => {
    const save = { ...defaultSave(), sprinkles: 40, bestTimeSec: 120, bestKills: 300 }
    const next = applyRunResult(save, run({ sprinkles: 60, survivedSec: 90, kills: 400, won: true, level: 22 }))
    expect(next.sprinkles).toBe(100)
    expect(next.bestTimeSec).toBe(120)
    expect(next.bestKills).toBe(400)
    expect(next.bestLevel).toBe(22)
    expect(next.wins).toBe(1)
    expect(next.runs).toBe(1)
    expect(next.bestTimes.meadow).toBe(90)
  })

  it('keeps lifetime totals for the stickers', () => {
    let save = defaultSave()
    save = applyRunResult(save, run({ kills: 300, chestsOpened: 2, presentsPopped: 5, evolutions: ['bubbleBath'] }))
    save = applyRunResult(save, run({ kills: 200, chestsOpened: 1, presentsPopped: 3, evolutions: ['bubbleBath', 'cometKittens'] }))
    expect(save.totalKills).toBe(500)
    expect(save.chestsOpened).toBe(3)
    expect(save.presentsPopped).toBe(8)
    expect(save.evolutionsFound).toEqual(['bubbleBath', 'cometKittens'])
  })

  it('remembers which friends have won', () => {
    let save = applyRunResult(defaultSave(), run({ characterId: 'pip', won: false }))
    expect(save.characterWins).toEqual([])
    save = applyRunResult(save, run({ characterId: 'pip', won: true }))
    save = applyRunResult(save, run({ characterId: 'pip', won: true }))
    expect(save.characterWins).toEqual(['pip'])
  })

  it('ignores a negative payout rather than draining the jar', () => {
    const save = { ...defaultSave(), sprinkles: 40 }
    const next = applyRunResult(save, run({ sprinkles: -100 }))
    expect(next.sprinkles).toBe(40)
  })
})

describe('stickers', () => {
  it('has a name, an icon, a goal and a reward for every sticker', () => {
    for (const id of STICKER_IDS) {
      const def = STICKERS[id]
      expect(def.name).toBeTruthy()
      expect(def.icon).toBeTruthy()
      expect(def.desc).toBeTruthy()
      expect(def.reward).toBeDefined()
    }
  })

  it('hands out nothing on a fresh save', () => {
    expect(newlyEarned([], stickerRecords(defaultSave()))).toEqual([])
  })

  it('awards run-only stickers from the run summary and never twice', () => {
    const save = defaultSave()
    const first = awardStickers(save, summary({ usedMagnet: true, mostWeapons: 6, evolutions: ['bubbleBath', 'goldenCarrot'] }))
    expect(first.earned).toEqual(expect.arrayContaining(['magnet', 'fullHouse', 'doubleEvolve']))
    const again = awardStickers(first.save, summary({ usedMagnet: true }))
    expect(again.earned).toEqual([])
  })

  it('pays out its reward: sprinkles, friends, weapons and shop items', () => {
    const save = applyRunResult(defaultSave(), run({ levelId: 'peaks', won: true, survivedSec: 700 }))
    const { save: after } = awardStickers(save)
    // Peak Performer unlocks Twinkle, Ten Minute Hero unlocks Pillow.
    expect(after.unlocked).toEqual(expect.arrayContaining(['twinkle', 'pillow']))
    expect(after.sprinkles).toBeGreaterThan(0)
  })

  it('keeps three weapons back until their stickers are earned', () => {
    const save = defaultSave()
    const locked = BASE_WEAPON_IDS.filter((id) => !isWeaponUnlocked(save, id))
    expect(locked.sort()).toEqual(['cuddleAura', 'jellyPuddle', 'pixieZap'])
    expect(unlockedWeapons(save)).toHaveLength(BASE_WEAPON_IDS.length - 3)
  })

  it('clears the "new" badges once the book has been looked at', () => {
    const { save } = awardStickers(defaultSave(), summary({ usedBomb: true }))
    expect(save.newStickers).toEqual(['bomb'])
    expect(markStickersSeen(save).newStickers).toEqual([])
    expect(markStickersSeen(save).stickers).toEqual(['bomb'])
  })
})
