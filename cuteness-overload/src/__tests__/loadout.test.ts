import { describe, expect, it } from 'vitest'
import { CHARACTERS } from '../data/characters'
import { PASSIVES } from '../data/passives'
import { WEAPONS, weaponLevel } from '../data/weapons'
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
import { baseStats, difficultyAt, modsUpToLevel, xpToNext } from '../game/stats'
import { PASSIVE_IDS } from '../data/passives'
import { WEAPON_IDS } from '../data/weapons'

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
    for (const id of WEAPON_IDS) grantWeapon(inventory, id)
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

  it('ramps difficulty over a run', () => {
    expect(difficultyAt(0).hp).toBe(1)
    expect(difficultyAt(240).hp).toBeGreaterThan(difficultyAt(60).hp)
    expect(difficultyAt(240).damage).toBeGreaterThan(1)
  })
})

describe('weapon tables', () => {
  it('clamps level lookups instead of returning undefined', () => {
    expect(weaponLevel('bubbleBark', 0)).toBe(WEAPONS.bubbleBark.levels[0])
    expect(weaponLevel('bubbleBark', 99)).toBe(WEAPONS.bubbleBark.levels.at(-1))
  })

  it('gets stronger every level, and every weapon has a full table', () => {
    for (const id of WEAPON_IDS) {
      const def = WEAPONS[id]
      expect(def.levels).toHaveLength(5)
      for (let i = 1; i < def.levels.length; i++) {
        expect(def.levels[i].damage).toBeGreaterThan(def.levels[i - 1].damage)
        expect(def.levels[i].note).toBeTruthy()
      }
    }
  })

  it('gives every passive a note per level', () => {
    for (const id of PASSIVE_IDS) {
      const def = PASSIVES[id]
      expect(def.notes).toHaveLength(def.perLevel.length)
    }
  })
})
