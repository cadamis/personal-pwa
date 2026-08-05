/**
 * Turns "who am I playing, what have I bought, what have I picked up" into one
 * {@link Stats} block. Recomputed from scratch whenever the inventory changes,
 * so no upgrade has to know how to undo itself.
 */
import { CHARACTERS, type CharacterId } from '../data/characters'
import { METAS, type MetaId } from '../data/meta'
import { PASSIVES, type PassiveId } from '../data/passives'
import { maxWeaponLevel, type WeaponId } from '../data/weapons'
import { applyMods, baseStats, clampStats, modsUpToLevel, type Stats, type StatMod } from './stats'

export interface OwnedWeapon {
  id: WeaponId
  level: number
}

export interface OwnedPassive {
  id: PassiveId
  level: number
}

export interface Inventory {
  weapons: OwnedWeapon[]
  passives: OwnedPassive[]
}

/** How many of each a run can hold. Full slots stop new items being offered. */
export const MAX_WEAPON_SLOTS = 6
export const MAX_PASSIVE_SLOTS = 6

export function emptyInventory(): Inventory {
  return { weapons: [], passives: [] }
}

function metaMods(upgrades: Partial<Record<MetaId, number>>): StatMod {
  const total: StatMod = {}
  for (const [id, level] of Object.entries(upgrades) as [MetaId, number][]) {
    const per = METAS[id].perLevel
    for (const key of Object.keys(per) as (keyof Stats)[]) {
      total[key] = (total[key] ?? 0) + (per[key] ?? 0) * level
    }
  }
  return total
}

export function computeStats(
  characterId: CharacterId,
  upgrades: Partial<Record<MetaId, number>>,
  inventory: Inventory,
): Stats {
  const stats = baseStats()
  applyMods(stats, CHARACTERS[characterId].mods, metaMods(upgrades))
  for (const owned of inventory.passives) {
    applyMods(stats, modsUpToLevel(PASSIVES[owned.id].perLevel, owned.level))
  }
  return clampStats(stats)
}

export function weaponLevelOf(inventory: Inventory, id: WeaponId): number {
  return inventory.weapons.find((w) => w.id === id)?.level ?? 0
}

export function passiveLevelOf(inventory: Inventory, id: PassiveId): number {
  return inventory.passives.find((p) => p.id === id)?.level ?? 0
}

/** Adds a weapon or bumps its level, in place. Caps at the weapon's max level. */
export function grantWeapon(inventory: Inventory, id: WeaponId): void {
  const owned = inventory.weapons.find((w) => w.id === id)
  if (owned) {
    owned.level = Math.min(owned.level + 1, maxWeaponLevel(id))
  } else if (inventory.weapons.length < MAX_WEAPON_SLOTS) {
    inventory.weapons.push({ id, level: 1 })
  }
}

export function grantPassive(inventory: Inventory, id: PassiveId): void {
  const owned = inventory.passives.find((p) => p.id === id)
  if (owned) {
    owned.level = Math.min(owned.level + 1, PASSIVES[id].perLevel.length)
  } else if (inventory.passives.length < MAX_PASSIVE_SLOTS) {
    inventory.passives.push({ id, level: 1 })
  }
}
