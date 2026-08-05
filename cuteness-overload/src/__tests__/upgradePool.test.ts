import { describe, expect, it } from 'vitest'
import { PASSIVES, PASSIVE_IDS } from '../data/passives'
import { WEAPONS, WEAPON_IDS } from '../data/weapons'
import { emptyInventory, grantPassive, grantWeapon, type Inventory } from '../game/loadout'
import { candidates, choiceCount, rollChoices } from '../game/upgradePool'

/** Deterministic rng so a failing case is reproducible. */
function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

/** Levels absolutely everything to its cap. */
function maxedInventory(): Inventory {
  const inventory = emptyInventory()
  for (const id of WEAPON_IDS) {
    for (let i = 0; i < WEAPONS[id].levels.length; i++) grantWeapon(inventory, id)
  }
  for (const id of PASSIVE_IDS) {
    for (let i = 0; i < PASSIVES[id].perLevel.length; i++) grantPassive(inventory, id)
  }
  return inventory
}

describe('candidates', () => {
  it('offers every weapon and passive on a fresh run', () => {
    const pool = candidates(emptyInventory())
    expect(pool).toHaveLength(WEAPON_IDS.length + PASSIVE_IDS.length)
    expect(pool.every((c) => c.choice.tag === 'NEW!')).toBe(true)
  })

  it('offers the next level of something you already own', () => {
    const inventory = emptyInventory()
    grantWeapon(inventory, 'bubbleBark')
    const bubble = candidates(inventory).find(
      (c) => c.choice.kind === 'weapon' && c.choice.id === 'bubbleBark',
    )
    expect(bubble?.choice).toMatchObject({ nextLevel: 2, tag: 'Lv 2' })
    expect(bubble?.choice.desc).toBe(WEAPONS.bubbleBark.levels[1].note)
  })

  it('stops offering new items once the slots are full, but keeps upgrades', () => {
    const inventory = emptyInventory()
    for (const id of WEAPON_IDS.slice(0, 6)) grantWeapon(inventory, id)
    for (const id of PASSIVE_IDS.slice(0, 6)) grantPassive(inventory, id)
    const pool = candidates(inventory)
    expect(pool.every((c) => c.choice.tag !== 'NEW!')).toBe(true)
    expect(pool.length).toBe(12) // the twelve owned things, each levellable
  })

  it('runs dry when everything is maxed', () => {
    expect(candidates(maxedInventory())).toHaveLength(0)
  })
})

describe('rollChoices', () => {
  it('returns the number of cards asked for, with no duplicates', () => {
    const rng = seeded(99)
    for (let attempt = 0; attempt < 50; attempt++) {
      const picks = rollChoices(emptyInventory(), rng, 4)
      expect(picks).toHaveLength(4)
      const keys = picks.map((p) => `${p.kind}:${'id' in p ? p.id : ''}`)
      expect(new Set(keys).size).toBe(4)
    }
  })

  it('pads with snack and stash cards when the pool is empty', () => {
    const picks = rollChoices(maxedInventory(), seeded(5), 3)
    expect(picks).toHaveLength(3)
    expect(picks.map((p) => p.kind)).toEqual(['heal', 'sprinkles', 'heal'])
  })

  it('tops up a short pool rather than returning fewer cards', () => {
    const inventory = emptyInventory()
    // One weapon left at level 4 of 5 — exactly one real candidate.
    for (const id of WEAPON_IDS.slice(0, 6)) {
      for (let i = 0; i < WEAPONS[id].levels.length; i++) grantWeapon(inventory, id)
    }
    for (const id of PASSIVE_IDS.slice(0, 6)) {
      for (let i = 0; i < PASSIVES[id].perLevel.length; i++) grantPassive(inventory, id)
    }
    inventory.weapons[0].level = 4
    const picks = rollChoices(inventory, seeded(7), 3)
    expect(picks).toHaveLength(3)
    expect(picks[0].kind).toBe('weapon')
    expect(picks.slice(1).map((p) => p.kind)).toEqual(['heal', 'sprinkles'])
  })
})

describe('weapon behaviours', () => {
  it('keeps Bubble Bark aimed rather than homing', () => {
    // Mochi's starter is deliberately not a tracking weapon: bubbles are fired
    // at whatever is nearest and then fly straight, so they can miss.
    expect(WEAPONS.bubbleBark.behavior).toBe('aimed')
    expect(WEAPONS.kittenMissiles.behavior).toBe('homing')
  })
})

describe('choiceCount', () => {
  it('is three cards without luck', () => {
    expect(choiceCount(0, () => 0.99)).toBe(3)
    expect(choiceCount(0, () => 0)).toBe(3)
  })

  it('is four when luck comes through', () => {
    expect(choiceCount(0.5, () => 0.1)).toBe(4)
    expect(choiceCount(0.5, () => 0.9)).toBe(3)
  })
})
