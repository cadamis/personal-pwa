/**
 * Picks the cards offered on level-up.
 *
 * Kept pure (an injected `rng`) so the awkward cases — every weapon maxed, all
 * slots full, luck rolling a fourth card — are unit-testable instead of
 * something you find out about in the middle of a run.
 */
import { PASSIVES, PASSIVE_IDS, type PassiveId } from '../data/passives'
import { WEAPONS, WEAPON_IDS, maxWeaponLevel, type WeaponId } from '../data/weapons'
import {
  MAX_PASSIVE_SLOTS,
  MAX_WEAPON_SLOTS,
  passiveLevelOf,
  weaponLevelOf,
  type Inventory,
} from './loadout'

/** Consolation prizes when the pool is exhausted. */
export const SNACK_HEAL = 45
export const STASH_SPRINKLES = 40

export type Choice =
  | { kind: 'weapon'; id: WeaponId; nextLevel: number; title: string; icon: string; desc: string; tag: string }
  | { kind: 'passive'; id: PassiveId; nextLevel: number; title: string; icon: string; desc: string; tag: string }
  | { kind: 'heal'; title: string; icon: string; desc: string; tag: string }
  | { kind: 'sprinkles'; title: string; icon: string; desc: string; tag: string }

/** New items are a bit rarer than levelling something you already like. */
const WEIGHT_NEW = 1
const WEIGHT_UPGRADE = 1.5

interface Candidate {
  choice: Choice
  weight: number
}

function weaponChoice(id: WeaponId, nextLevel: number): Choice {
  const def = WEAPONS[id]
  return {
    kind: 'weapon',
    id,
    nextLevel,
    title: def.name,
    icon: def.icon,
    desc: nextLevel === 1 ? def.blurb : def.levels[nextLevel - 1].note,
    tag: nextLevel === 1 ? 'NEW!' : `Lv ${nextLevel}`,
  }
}

function passiveChoice(id: PassiveId, nextLevel: number): Choice {
  const def = PASSIVES[id]
  return {
    kind: 'passive',
    id,
    nextLevel,
    title: def.name,
    icon: def.icon,
    desc: nextLevel === 1 ? def.blurb : def.notes[nextLevel - 1],
    tag: nextLevel === 1 ? 'NEW!' : `Lv ${nextLevel}`,
  }
}

const HEAL_CHOICE: Choice = {
  kind: 'heal',
  title: 'Snack Break',
  icon: '🍰',
  desc: `Munch munch. Heal ${SNACK_HEAL} HP right now.`,
  tag: '',
}

const STASH_CHOICE: Choice = {
  kind: 'sprinkles',
  title: 'Sprinkle Stash',
  icon: '🍬',
  desc: `+${STASH_SPRINKLES} sprinkles to spend in the shop.`,
  tag: '',
}

/** Everything the player could legally be offered right now. */
export function candidates(inventory: Inventory): Candidate[] {
  const out: Candidate[] = []

  for (const id of WEAPON_IDS) {
    const level = weaponLevelOf(inventory, id)
    if (level === 0) {
      if (inventory.weapons.length < MAX_WEAPON_SLOTS) {
        out.push({ choice: weaponChoice(id, 1), weight: WEIGHT_NEW })
      }
    } else if (level < maxWeaponLevel(id)) {
      out.push({ choice: weaponChoice(id, level + 1), weight: WEIGHT_UPGRADE })
    }
  }

  for (const id of PASSIVE_IDS) {
    const level = passiveLevelOf(inventory, id)
    if (level === 0) {
      if (inventory.passives.length < MAX_PASSIVE_SLOTS) {
        out.push({ choice: passiveChoice(id, 1), weight: WEIGHT_NEW })
      }
    } else if (level < PASSIVES[id].perLevel.length) {
      out.push({ choice: passiveChoice(id, level + 1), weight: WEIGHT_UPGRADE })
    }
  }

  return out
}

/** How many cards to show: three, plus a fourth if luck comes through. */
export function choiceCount(luck: number, rng: () => number): number {
  return 3 + (rng() < luck ? 1 : 0)
}

/**
 * Weighted sample without replacement. Falls back to the snack/stash cards when
 * there isn't enough left in the pool, so the player is never handed an empty
 * level-up screen.
 */
export function rollChoices(inventory: Inventory, rng: () => number, count: number): Choice[] {
  const pool = candidates(inventory)
  const picked: Choice[] = []

  while (picked.length < count && pool.length > 0) {
    const total = pool.reduce((sum, c) => sum + c.weight, 0)
    let roll = rng() * total
    let index = pool.length - 1
    for (let i = 0; i < pool.length; i++) {
      roll -= pool[i].weight
      if (roll <= 0) {
        index = i
        break
      }
    }
    picked.push(pool[index].choice)
    pool.splice(index, 1)
  }

  const fallbacks = [HEAL_CHOICE, STASH_CHOICE]
  let f = 0
  while (picked.length < count) {
    picked.push(fallbacks[f % fallbacks.length])
    f++
  }

  return picked
}
