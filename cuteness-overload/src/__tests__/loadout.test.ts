import { describe, expect, it } from 'vitest'
import { CHARACTERS, CHARACTER_IDS, STARTER_CHARACTER } from '../data/characters'
import { ENEMIES, ENEMY_IDS } from '../data/enemies'
import { SPRITES } from '../art/textures'
import { PASSIVES } from '../data/passives'
import { WEAPONS, maxWeaponLevel, weaponLevel } from '../data/weapons'
import {
  MAX_PASSIVE_SLOTS,
  MAX_WEAPON_SLOTS,
  computeStats,
  emptyInventory,
  grantPassive,
  grantWeapon,
  passiveLevelOf,
  weaponLevelOf,
} from '../game/loadout'
import { LEVELS, LEVEL_IDS } from '../data/levels'
import { baseStats, difficultyAt, modsUpToLevel, xpToNext } from '../game/stats'
import { PASSIVE_IDS } from '../data/passives'
import { BASE_WEAPON_IDS, WEAPON_IDS } from '../data/weapons'
import { characterUnlockSticker } from '../data/stickers'

describe('computeStats', () => {
  it('starts from the base block for the starter character', () => {
    const stats = computeStats('mochi', {}, emptyInventory())
    expect(stats).toEqual(baseStats())
  })

  it('layers character mods, shop upgrades and passives additively', () => {
    const inventory = emptyInventory()
    grantPassive(inventory, 'squishyArmour') // +22 max HP at level 1
    const stats = computeStats('waffles', { growthSpurt: 2 }, inventory)
    // 100 base + 55 (Waffles) + 50 (2x Growth Spurt) + 22 (Squishy Armour)
    expect(stats.maxHp).toBe(227)
    expect(stats.armor).toBe(CHARACTERS.waffles.mods.armor)
  })

  it('turns the shop regen upgrade into hit points per second', () => {
    const none = computeStats('mochi', {}, emptyInventory())
    expect(none.regen).toBe(0)

    const blanketed = computeStats('mochi', { cosyBlanket: 4 }, emptyInventory())
    expect(blanketed.regen).toBeCloseTo(1, 5)

    // Stacks with the in-run passive rather than replacing it.
    const inventory = emptyInventory()
    grantPassive(inventory, 'snackPocket')
    expect(computeStats('mochi', { cosyBlanket: 2 }, inventory).regen).toBeCloseTo(0.5 + 0.8, 5)
  })

  it('clamps combos that would break the game', () => {
    const inventory = emptyInventory()
    for (let i = 0; i < 5; i++) {
      grantPassive(inventory, 'sugarRush')
      grantPassive(inventory, 'luckySocks')
      grantPassive(inventory, 'fastPaws')
    }
    const stats = computeStats('nimbus', { sneakerUpgrade: 5, windUpWatch: 5 }, inventory)
    expect(stats.moveSpeed).toBeLessThanOrEqual(420)
    expect(stats.critChance).toBeLessThanOrEqual(0.9)
    expect(stats.hasteMult).toBeLessThanOrEqual(4)
  })
})

describe('granting items', () => {
  it('levels an owned weapon instead of taking a second slot', () => {
    const inventory = emptyInventory()
    grantWeapon(inventory, 'bubbleBark')
    grantWeapon(inventory, 'bubbleBark')
    expect(inventory.weapons).toHaveLength(1)
    expect(weaponLevelOf(inventory, 'bubbleBark')).toBe(2)
  })

  it('caps at the weapon and passive maximum level', () => {
    const inventory = emptyInventory()
    for (let i = 0; i < 20; i++) {
      grantWeapon(inventory, 'glitterBomb')
      grantPassive(inventory, 'extraSpicy')
    }
    expect(weaponLevelOf(inventory, 'glitterBomb')).toBe(WEAPONS.glitterBomb.levels.length)
    expect(passiveLevelOf(inventory, 'extraSpicy')).toBe(PASSIVES.extraSpicy.perLevel.length)
  })

  it('refuses new items once the slots are full', () => {
    const inventory = emptyInventory()
    for (const id of BASE_WEAPON_IDS) grantWeapon(inventory, id)
    for (const id of PASSIVE_IDS) grantPassive(inventory, id)
    expect(inventory.weapons).toHaveLength(MAX_WEAPON_SLOTS)
    expect(inventory.passives).toHaveLength(MAX_PASSIVE_SLOTS)
  })
})

describe('stat maths', () => {
  it('sums only the levels reached', () => {
    const perLevel = [{ maxHp: 10 }, { maxHp: 5, armor: 1 }, { maxHp: 5 }]
    expect(modsUpToLevel(perLevel, 0)).toEqual({})
    expect(modsUpToLevel(perLevel, 2)).toEqual({ maxHp: 15, armor: 1 })
    // Over-levelling can't reach past the end of the table.
    expect(modsUpToLevel(perLevel, 99)).toEqual({ maxHp: 20, armor: 1 })
  })

  it('needs more XP for each level', () => {
    for (let level = 1; level < 40; level++) {
      expect(xpToNext(level + 1)).toBeGreaterThan(xpToNext(level))
    }
  })

  it('pays out half as much in the first level as the second', () => {
    expect(LEVELS.meadow.sprinkleMult).toBeCloseTo(LEVELS.forest.sprinkleMult / 2, 5)
  })

  it('ramps difficulty over a run, per level', () => {
    const meadow = LEVELS.meadow.ramp
    expect(difficultyAt(0, meadow).hp).toBe(1)
    expect(difficultyAt(240, meadow).hp).toBeGreaterThan(difficultyAt(60, meadow).hp)
    expect(difficultyAt(240, meadow).damage).toBeGreaterThan(1)

    // The forest is the harder level and its ramp has to actually be steeper.
    const forest = LEVELS.forest.ramp
    expect(difficultyAt(240, forest).hp).toBeGreaterThan(difficultyAt(240, meadow).hp)
    expect(difficultyAt(240, forest).damage).toBeGreaterThan(difficultyAt(240, meadow).damage)
  })
})

describe('the art registry lines up with the data', () => {
  // A mistyped texture key is invisible until something renders as the missing
  // green square in the middle of a run, which is a miserable way to find it.
  it('has a painter for every texture the data asks for', () => {
    for (const id of CHARACTER_IDS) expect(SPRITES).toHaveProperty(CHARACTERS[id].texture)
    for (const id of ENEMY_IDS) {
      const def = ENEMIES[id]
      expect(SPRITES).toHaveProperty(def.texture)
      if (def.shootTexture) expect(SPRITES).toHaveProperty(def.shootTexture)
      for (const move of def.moves ?? []) {
        if (move.kind === 'burst' || move.kind === 'spread') expect(SPRITES).toHaveProperty(move.texture)
        if (move.kind === 'summon') expect(ENEMIES).toHaveProperty(move.enemy)
      }
    }
    for (const id of WEAPON_IDS) {
      const def = WEAPONS[id]
      expect(SPRITES).toHaveProperty(def.texture)
      if (def.fx) expect(SPRITES).toHaveProperty(def.fx)
      if (def.prop) expect(SPRITES).toHaveProperty(def.prop)
    }
    // Keys the scenes use directly rather than through the data.
    for (const key of ['fx-crown', 'fx-ring', 'fx-rays', 'fx-zzz', 'fx-poof', 'fx-heart', 'fx-hit', 'pick-chest', 'pick-magnet', 'pick-bomb', 'pick-freeze', 'pick-bag', 'pick-heart2', 'pick-heart3', 'prop-present-pink', 'prop-present-mint', 'prop-present-lilac']) {
      expect(SPRITES).toHaveProperty(key)
    }
    for (const id of LEVEL_IDS) {
      expect(SPRITES).toHaveProperty(LEVELS[id].backdrop)
      const obstacles = LEVELS[id].obstacles
      for (const texture of obstacles?.textures ?? []) expect(SPRITES).toHaveProperty(texture)
      for (const texture of LEVELS[id].decals.textures) expect(SPRITES).toHaveProperty(texture)
    }
  })

  it('gives every friend a real starting weapon and a price', () => {
    for (const id of CHARACTER_IDS) {
      const def = CHARACTERS[id]
      expect(WEAPONS).toHaveProperty(def.startWeapon)
      expect(def.unlockCost).toBeGreaterThanOrEqual(0)
      expect(def.perk).toBeTruthy()
      expect(def.title).toBeTruthy()
    }
    // Exactly one is free to start with, or the roster has no obvious starting
    // point. (Friends that come off a sticker aren't bought at all.)
    const forSale = CHARACTER_IDS.filter((id) => characterUnlockSticker(id) === undefined)
    expect(forSale.filter((id) => CHARACTERS[id].unlockCost === 0)).toEqual([STARTER_CHARACTER])
    for (const id of CHARACTER_IDS) {
      if (!forSale.includes(id)) expect(CHARACTERS[id].unlockCost).toBe(0)
    }
  })

  it('names every boss and champion from the enemy roster', () => {
    for (const id of LEVEL_IDS) {
      const level = LEVELS[id]
      expect(ENEMIES).toHaveProperty(level.boss)
      expect(ENEMIES[level.boss].isBoss).toBe(true)
      expect(ENEMIES[level.boss].chest).toBe(true)
      // The boss event must actually be scheduled, at bossTime.
      expect(level.events.some((e) => e.kind === 'boss' && e.at === level.bossTime)).toBe(true)
      for (const event of level.events) {
        if (event.kind === 'miniboss') expect(ENEMIES[event.enemy].chest).toBe(true)
        if ('enemy' in event) expect(ENEMIES).toHaveProperty(event.enemy)
      }
      for (const wave of level.waves) for (const enemy of wave.enemies) expect(ENEMIES).toHaveProperty(enemy)
    }
  })

  it('chains every level to the one before it', () => {
    LEVEL_IDS.forEach((id, i) => {
      if (i === 0) expect(LEVELS[id].unlockedBy).toBeUndefined()
      else expect(LEVELS[id].unlockedBy).toBe(LEVEL_IDS[i - 1])
    })
  })

  it('makes each later level longer, harder and better-paying than the last', () => {
    for (let i = 1; i < LEVEL_IDS.length; i++) {
      const prev = LEVELS[LEVEL_IDS[i - 1]]
      const next = LEVELS[LEVEL_IDS[i]]
      expect(next.bossTime).toBeGreaterThanOrEqual(prev.bossTime)
      expect(next.ramp.hp).toBeGreaterThan(prev.ramp.hp)
      expect(next.sprinkleMult).toBeGreaterThan(prev.sprinkleMult)
    }
  })
})

describe('weapon tables', () => {
  it('clamps level lookups instead of returning undefined', () => {
    expect(weaponLevel('bubbleBark', 0)).toBe(WEAPONS.bubbleBark.levels[0])
    expect(weaponLevel('bubbleBark', 99)).toBe(WEAPONS.bubbleBark.levels.at(-1))
  })

  it('gets better every level, whatever "better" means for that weapon', () => {
    for (const id of BASE_WEAPON_IDS) {
      const def = WEAPONS[id]
      expect(def.levels.length).toBeGreaterThanOrEqual(3)
      expect(maxWeaponLevel(id)).toBe(def.levels.length)

      for (let i = 1; i < def.levels.length; i++) {
        const prev = def.levels[i - 1]
        const next = def.levels[i]
        expect(next.note).toBeTruthy()
        // Damage may stay flat — Brave Brolly deals none at all — but it must
        // never go backwards, and something has to have improved.
        expect(next.damage).toBeGreaterThanOrEqual(prev.damage)
        const better =
          next.damage > prev.damage ||
          next.count > prev.count ||
          next.area > prev.area ||
          next.pierce > prev.pierce ||
          (next.duration ?? 0) > (prev.duration ?? 0) ||
          next.cooldown < prev.cooldown
        expect(better).toBe(true)
      }
    }
  })

  it('gives Brave Brolly the up-time and cooldown it was asked for', () => {
    const levels = WEAPONS.braveBrolly.levels
    expect(WEAPONS.braveBrolly.behavior).toBe('shield')
    expect(levels).toHaveLength(3)
    // Longer up-time and a shorter wait at every level.
    expect(levels.map((l) => l.duration)).toEqual([1000, 1500, 2000])
    expect(levels.map((l) => l.cooldown)).toEqual([8000, 7000, 6000])
    // It buys safety, not damage.
    expect(levels.every((l) => l.damage === 0)).toBe(true)
  })

  it('gives every passive a note per level', () => {
    for (const id of PASSIVE_IDS) {
      const def = PASSIVES[id]
      expect(def.notes).toHaveLength(def.perLevel.length)
    }
  })
})
