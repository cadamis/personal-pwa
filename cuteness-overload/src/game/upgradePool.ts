/**
 * Picks the cards offered on level-up, and what's inside a treasure chest.
 *
 * Kept pure (an injected `rng`) so the awkward cases — every weapon maxed, all
 * slots full, luck rolling a fourth card, a chest with nothing left to give —
 * are unit-testable instead of something you find out about in the middle of a
 * run.
 */
import { PASSIVES, PASSIVE_IDS, type PassiveId } from '../data/passives'
import { WEAPONS, maxWeaponLevel, type BaseWeaponId, type EvolutionId, type WeaponId } from '../data/weapons'
import {
  MAX_PASSIVE_SLOTS,
  MAX_WEAPON_SLOTS,
  evolvable,
  passiveLevelOf,
  weaponLevelOf,
  type Inventory,
} from './loadout'

/** Consolation prizes when the pool is exhausted. */
export const SNACK_HEAL = 45
export const STASH_SPRINKLES = 40

export type Choice =
  | { kind: 'weapon'; id: WeaponId; nextLevel: number; title: string; icon: string; desc: string; tag: string; hint?: string }
  | { kind: 'passive'; id: PassiveId; nextLevel: number; title: string; icon: string; desc: string; tag: string; hint?: string }
  | { kind: 'heal'; title: string; icon: string; desc: string; tag: string; hint?: string }
  | { kind: 'sprinkles'; title: string; icon: string; desc: string; tag: string; hint?: string }

/** New items are a bit rarer than levelling something you already like. */
const WEIGHT_NEW = 1
const WEIGHT_UPGRADE = 2
/**
 * A passive that's the evolution buddy of a weapon you're carrying turns up
 * more often, so evolutions are something a run finds rather than something a
 * run is lucky to stumble into.
 */
const WEIGHT_BUDDY = 1.8

interface Candidate {
  choice: Choice
  weight: number
}

/** A stable key for a card, used to remember which ones were banished. */
export function choiceKey(choice: Choice): string {
  return choice.kind === 'weapon' || choice.kind === 'passive' ? `${choice.kind}:${choice.id}` : choice.kind
}

/** "Buddy" hint: which passive a weapon evolves with, or which weapon a passive helps evolve. */
function weaponHint(id: WeaponId): string | undefined {
  const evo = WEAPONS[id].evolution
  if (!evo) return undefined
  const buddy = PASSIVES[evo.needs]
  return `Evolves with ${buddy.icon} ${buddy.name}`
}

function passiveHint(id: PassiveId, inventory: Inventory): string | undefined {
  const helps = inventory.weapons.find((w) => WEAPONS[w.id].evolution?.needs === id)
  if (!helps) return undefined
  const def = WEAPONS[helps.id]
  return `Helps ${def.icon} ${def.name} evolve!`
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
    tag: nextLevel === 1 ? 'NEW!' : nextLevel === maxWeaponLevel(id) ? 'MAX!' : `Lv ${nextLevel}`,
    hint: weaponHint(id),
  }
}

function passiveChoice(id: PassiveId, nextLevel: number, inventory: Inventory): Choice {
  const def = PASSIVES[id]
  return {
    kind: 'passive',
    id,
    nextLevel,
    title: def.name,
    icon: def.icon,
    desc: nextLevel === 1 ? def.blurb : def.notes[nextLevel - 1],
    tag: nextLevel === 1 ? 'NEW!' : `Lv ${nextLevel}`,
    hint: passiveHint(id, inventory),
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

/**
 * Everything the player could legally be offered right now.
 *
 * `available` is the base weapons unlocked on this save; weapons you already
 * own can always be levelled whether or not they're in it (a friend's starting
 * weapon might still be locked for everyone else). `banished` holds
 * {@link choiceKey}s the player has said "no thanks" to this run.
 */
export function candidates(
  inventory: Inventory,
  available: readonly BaseWeaponId[],
  banished: ReadonlySet<string> = new Set(),
): Candidate[] {
  const out: Candidate[] = []

  for (const owned of inventory.weapons) {
    if (owned.level < maxWeaponLevel(owned.id)) {
      out.push({ choice: weaponChoice(owned.id, owned.level + 1), weight: WEIGHT_UPGRADE })
    }
  }
  if (inventory.weapons.length < MAX_WEAPON_SLOTS) {
    for (const id of available) {
      if (weaponLevelOf(inventory, id) > 0) continue
      // An evolved weapon still counts as having its base weapon.
      if (inventory.weapons.some((w) => WEAPONS[w.id].evolvedFrom === id)) continue
      out.push({ choice: weaponChoice(id, 1), weight: WEIGHT_NEW })
    }
  }

  for (const id of PASSIVE_IDS) {
    const level = passiveLevelOf(inventory, id)
    if (level === 0) {
      if (inventory.passives.length < MAX_PASSIVE_SLOTS) {
        const buddy = inventory.weapons.some((w) => WEAPONS[w.id].evolution?.needs === id)
        out.push({ choice: passiveChoice(id, 1, inventory), weight: buddy ? WEIGHT_BUDDY : WEIGHT_NEW })
      }
    } else if (level < PASSIVES[id].perLevel.length) {
      out.push({ choice: passiveChoice(id, level + 1, inventory), weight: WEIGHT_UPGRADE })
    }
  }

  return out.filter((c) => !banished.has(choiceKey(c.choice)))
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
export function rollChoices(
  inventory: Inventory,
  rng: () => number,
  count: number,
  available: readonly BaseWeaponId[],
  banished: ReadonlySet<string> = new Set(),
): Choice[] {
  const pool = candidates(inventory, available, banished)
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

// ------------------------------------------------------------------- chests

export type ChestPrize =
  | { kind: 'evolve'; from: WeaponId; into: EvolutionId }
  | { kind: 'weapon'; id: WeaponId; nextLevel: number }
  | { kind: 'passive'; id: PassiveId; nextLevel: number }
  | { kind: 'sprinkles'; amount: number }

/** How many prizes a chest holds: usually one, sometimes three, rarely five. */
export function chestSize(chestLuck: number, rng: () => number, boss: boolean): number {
  const roll = rng()
  const five = 0.04 + chestLuck * 0.5 + (boss ? 0.1 : 0)
  const three = 0.22 + chestLuck + (boss ? 0.4 : 0)
  if (roll < five) return 5
  if (roll < five + three) return 3
  return 1
}

/**
 * Fills a chest. Evolutions come first — that's what chests are *for* — then
 * levels for things you already own (never new items, which keeps the level-up
 * cards meaningful), then sprinkles once there's nothing left to level.
 *
 * Doesn't touch `inventory`: it simulates the levels on a copy so a chest never
 * offers a weapon past its maximum.
 */
export function rollChest(inventory: Inventory, rng: () => number, size: number): ChestPrize[] {
  const sim: Inventory = {
    weapons: inventory.weapons.map((w) => ({ ...w })),
    passives: inventory.passives.map((p) => ({ ...p })),
  }
  const prizes: ChestPrize[] = []

  for (const into of evolvable(sim)) {
    if (prizes.length >= size) break
    const from = WEAPONS[into].evolvedFrom
    if (!from) continue
    prizes.push({ kind: 'evolve', from, into })
    const slot = sim.weapons.find((w) => w.id === from)
    if (slot) {
      slot.id = into
      slot.level = 1
    }
  }

  while (prizes.length < size) {
    const options: ChestPrize[] = []
    for (const w of sim.weapons) {
      if (w.level < maxWeaponLevel(w.id)) options.push({ kind: 'weapon', id: w.id, nextLevel: w.level + 1 })
    }
    for (const p of sim.passives) {
      if (p.level < PASSIVES[p.id].perLevel.length) options.push({ kind: 'passive', id: p.id, nextLevel: p.level + 1 })
    }
    if (options.length === 0) {
      prizes.push({ kind: 'sprinkles', amount: 25 })
      continue
    }
    const prize = options[Math.floor(rng() * options.length) % options.length]
    prizes.push(prize)
    if (prize.kind === 'weapon') {
      const slot = sim.weapons.find((w) => w.id === prize.id)
      if (slot) slot.level += 1
    } else if (prize.kind === 'passive') {
      const slot = sim.passives.find((p) => p.id === prize.id)
      if (slot) slot.level += 1
    }
  }
  return prizes
}
