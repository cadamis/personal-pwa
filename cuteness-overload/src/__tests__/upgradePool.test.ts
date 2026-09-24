import { describe, expect, it } from 'vitest'
import { PASSIVES, PASSIVE_IDS } from '../data/passives'
import { BASE_WEAPON_IDS, EVOLUTION_IDS, WEAPONS, maxWeaponLevel } from '../data/weapons'
import { emptyInventory, evolvable, evolveWeapon, grantPassive, grantWeapon, type Inventory } from '../game/loadout'
import { candidates, chestSize, choiceCount, choiceKey, rollChest, rollChoices } from '../game/upgradePool'

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
  for (const id of BASE_WEAPON_IDS) {
    for (let i = 0; i < WEAPONS[id].levels.length; i++) grantWeapon(inventory, id)
  }
  for (const id of PASSIVE_IDS) {
    for (let i = 0; i < PASSIVES[id].perLevel.length; i++) grantPassive(inventory, id)
  }
  return inventory
}

/** Maxes one weapon, and optionally gives it its buddy passive. */
function readyToEvolve(id: (typeof BASE_WEAPON_IDS)[number], withBuddy = true): Inventory {
  const inventory = emptyInventory()
  for (let i = 0; i < maxWeaponLevel(id); i++) grantWeapon(inventory, id)
  const needs = WEAPONS[id].evolution?.needs
  if (withBuddy && needs) grantPassive(inventory, needs)
  return inventory
}

describe('candidates', () => {
  it('offers every unlocked weapon and every passive on a fresh run', () => {
    const pool = candidates(emptyInventory(), BASE_WEAPON_IDS)
    expect(pool).toHaveLength(BASE_WEAPON_IDS.length + PASSIVE_IDS.length)
    expect(pool.every((c) => c.choice.tag === 'NEW!')).toBe(true)
  })

  it('never offers an evolution on a card', () => {
    const pool = candidates(emptyInventory(), BASE_WEAPON_IDS)
    const ids = pool.map((c) => ('id' in c.choice ? c.choice.id : ''))
    for (const evo of EVOLUTION_IDS) expect(ids).not.toContain(evo)
  })

  it('leaves locked weapons out, but still levels one you own', () => {
    const available = BASE_WEAPON_IDS.filter((id) => id !== 'pixieZap')
    expect(candidates(emptyInventory(), available).some((c) => 'id' in c.choice && c.choice.id === 'pixieZap')).toBe(false)

    // A friend's starting weapon can be locked for everyone else.
    const inventory = emptyInventory()
    grantWeapon(inventory, 'pixieZap')
    const upgrade = candidates(inventory, available).find((c) => 'id' in c.choice && c.choice.id === 'pixieZap')
    expect(upgrade?.choice).toMatchObject({ nextLevel: 2 })
  })

  it('offers the next level of something you already own, with its evolution buddy', () => {
    const inventory = emptyInventory()
    grantWeapon(inventory, 'bubbleBark')
    const bubble = candidates(inventory, BASE_WEAPON_IDS).find(
      (c) => c.choice.kind === 'weapon' && c.choice.id === 'bubbleBark',
    )
    expect(bubble?.choice).toMatchObject({ nextLevel: 2, tag: 'Lv 2' })
    expect(bubble?.choice.desc).toBe(WEAPONS.bubbleBark.levels[1].note)
    expect(bubble?.choice.hint).toContain(PASSIVES.twinBraids.name)
  })

  it('points out which passive helps a weapon you own evolve', () => {
    const inventory = emptyInventory()
    grantWeapon(inventory, 'bubbleBark')
    const braids = candidates(inventory, BASE_WEAPON_IDS).find((c) => c.choice.kind === 'passive' && c.choice.id === 'twinBraids')
    expect(braids?.choice.hint).toContain('Bubble Bark')
  })

  it('stops offering new items once the slots are full, but keeps upgrades', () => {
    const inventory = emptyInventory()
    for (const id of BASE_WEAPON_IDS.slice(0, 6)) grantWeapon(inventory, id)
    for (const id of PASSIVE_IDS.slice(0, 6)) grantPassive(inventory, id)
    const pool = candidates(inventory, BASE_WEAPON_IDS)
    expect(pool.every((c) => c.choice.tag !== 'NEW!')).toBe(true)
    expect(pool.length).toBe(12) // the twelve owned things, each levellable
  })

  it('does not offer a base weapon back once it has evolved', () => {
    const inventory = readyToEvolve('bubbleBark')
    evolveWeapon(inventory, 'bubbleBath')
    const pool = candidates(inventory, BASE_WEAPON_IDS)
    expect(pool.some((c) => 'id' in c.choice && c.choice.id === 'bubbleBark')).toBe(false)
  })

  it('leaves out anything banished this run', () => {
    const banished = new Set([choiceKey({ kind: 'weapon', id: 'glitterBomb', nextLevel: 1, title: '', icon: '', desc: '', tag: '' })])
    const pool = candidates(emptyInventory(), BASE_WEAPON_IDS, banished)
    expect(pool.some((c) => 'id' in c.choice && c.choice.id === 'glitterBomb')).toBe(false)
    expect(pool).toHaveLength(BASE_WEAPON_IDS.length + PASSIVE_IDS.length - 1)
  })

  it('runs dry when everything is maxed', () => {
    expect(candidates(maxedInventory(), BASE_WEAPON_IDS)).toHaveLength(0)
  })
})

describe('rollChoices', () => {
  it('returns the number of cards asked for, with no duplicates', () => {
    const rng = seeded(99)
    for (let attempt = 0; attempt < 50; attempt++) {
      const picks = rollChoices(emptyInventory(), rng, 4, BASE_WEAPON_IDS)
      expect(picks).toHaveLength(4)
      const keys = picks.map(choiceKey)
      expect(new Set(keys).size).toBe(4)
    }
  })

  it('pads with snack and stash cards when the pool is empty', () => {
    const picks = rollChoices(maxedInventory(), seeded(5), 3, BASE_WEAPON_IDS)
    expect(picks).toHaveLength(3)
    expect(picks.map((p) => p.kind)).toEqual(['heal', 'sprinkles', 'heal'])
  })

  it('tops up a short pool rather than returning fewer cards', () => {
    const inventory = emptyInventory()
    // One weapon left one level short of max — exactly one real candidate.
    for (const id of BASE_WEAPON_IDS.slice(0, 6)) {
      for (let i = 0; i < WEAPONS[id].levels.length; i++) grantWeapon(inventory, id)
    }
    for (const id of PASSIVE_IDS.slice(0, 6)) {
      for (let i = 0; i < PASSIVES[id].perLevel.length; i++) grantPassive(inventory, id)
    }
    inventory.weapons[0].level = maxWeaponLevel(inventory.weapons[0].id) - 1
    const picks = rollChoices(inventory, seeded(7), 3, BASE_WEAPON_IDS)
    expect(picks).toHaveLength(3)
    expect(picks[0].kind).toBe('weapon')
    expect(picks.slice(1).map((p) => p.kind)).toEqual(['heal', 'sprinkles'])
  })
})

describe('evolutions', () => {
  it('gives every base weapon an evolution, and every evolution a way back', () => {
    for (const id of BASE_WEAPON_IDS) {
      const evo = WEAPONS[id].evolution
      expect(evo, id).toBeDefined()
      expect(WEAPONS[evo!.into].evolvedFrom).toBe(id)
      expect(PASSIVES).toHaveProperty(evo!.needs)
    }
    for (const id of EVOLUTION_IDS) {
      expect(WEAPONS[id].levels).toHaveLength(1)
      expect(WEAPONS[id].behavior).toBe(WEAPONS[WEAPONS[id].evolvedFrom!].behavior)
    }
  })

  it('needs both a maxed weapon and its buddy passive', () => {
    expect(evolvable(readyToEvolve('kittenMissiles'))).toEqual(['cometKittens'])
    expect(evolvable(readyToEvolve('kittenMissiles', false))).toEqual([])

    const notMaxed = emptyInventory()
    grantWeapon(notMaxed, 'kittenMissiles')
    grantPassive(notMaxed, 'fastPaws')
    expect(evolvable(notMaxed)).toEqual([])
  })

  it('swaps the weapon in its own slot', () => {
    const inventory = readyToEvolve('sassyGoose')
    grantWeapon(inventory, 'bubbleBark')
    expect(evolveWeapon(inventory, 'furiousFlock')).toBe(true)
    expect(inventory.weapons.map((w) => w.id)).toEqual(['furiousFlock', 'bubbleBark'])
    expect(inventory.weapons[0].level).toBe(1)
  })
})

describe('treasure chests', () => {
  it('puts an evolution first when one is ready', () => {
    const inventory = readyToEvolve('coneNado')
    grantWeapon(inventory, 'bubbleBark')
    const prizes = rollChest(inventory, seeded(3), 3)
    expect(prizes[0]).toEqual({ kind: 'evolve', from: 'coneNado', into: 'sundaeCyclone' })
    expect(prizes).toHaveLength(3)
  })

  it('never levels anything past its maximum, and never touches the real inventory', () => {
    const inventory = emptyInventory()
    grantWeapon(inventory, 'glitterBomb')
    const before = JSON.stringify(inventory)
    const prizes = rollChest(inventory, seeded(11), 5)
    const bombLevels = prizes.filter((p) => p.kind === 'weapon').length
    expect(1 + bombLevels).toBeLessThanOrEqual(maxWeaponLevel('glitterBomb'))
    // Once there's nothing left to level, the rest are sprinkles.
    expect(prizes.filter((p) => p.kind === 'sprinkles').length).toBe(5 - bombLevels)
    expect(JSON.stringify(inventory)).toBe(before)
  })

  it('pays out sprinkles when there is nothing at all to give', () => {
    const prizes = rollChest(maxedInventory(), seeded(1), 3)
    expect(prizes.every((p) => p.kind === 'sprinkles' || p.kind === 'evolve')).toBe(true)
  })

  it('is usually one prize, bigger for bosses and with a chest charm', () => {
    const sizes = (luck: number, boss: boolean): number => {
      const rng = seeded(42)
      let total = 0
      for (let i = 0; i < 400; i++) total += chestSize(luck, rng, boss)
      return total / 400
    }
    expect(sizes(0, false)).toBeLessThan(2)
    expect(sizes(0, true)).toBeGreaterThan(sizes(0, false))
    expect(sizes(0.36, false)).toBeGreaterThan(sizes(0, false))
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
