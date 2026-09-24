/**
 * In-run passive upgrades — the level-up cards that aren't weapons.
 *
 * Each level's effect is a plain {@link StatMod}, so levelling one up is just
 * "recompute the stat block from the whole inventory" rather than mutating
 * anything. `notes` runs parallel to `perLevel` and is what the card says.
 */
import type { StatMod } from '../game/stats'

export type PassiveId =
  | 'extraSpicy'
  | 'sugarRush'
  | 'squishyArmour'
  | 'friendshipBracelet'
  | 'loudZoomies'
  | 'twinBraids'
  | 'fastPaws'
  | 'luckySocks'
  | 'snackPocket'
  | 'starPupil'
  | 'sleepySlippers'

export interface PassiveDef {
  id: PassiveId
  name: string
  icon: string
  blurb: string
  perLevel: readonly StatMod[]
  notes: readonly string[]
}

const PASSIVE_LIST: readonly PassiveDef[] = [
  {
    id: 'extraSpicy',
    name: 'Extra Spicy',
    icon: '🌶️',
    blurb: 'Everything you do hits harder. Nobody knows why. Spice.',
    perLevel: [
      { damageMult: 0.13 },
      { damageMult: 0.13 },
      { damageMult: 0.13 },
      { damageMult: 0.13 },
      { damageMult: 0.18 },
    ],
    notes: ['+13% damage', '+13% damage', '+13% damage', '+13% damage', '+18% damage'],
  },
  {
    id: 'sugarRush',
    name: 'Sugar Rush',
    icon: '🍭',
    blurb: 'You had a lollipop. Now you are extremely fast.',
    perLevel: [
      { moveSpeed: 15 },
      { moveSpeed: 15 },
      { moveSpeed: 15 },
      { moveSpeed: 15 },
      { moveSpeed: 22 },
    ],
    notes: ['+15 speed', '+15 speed', '+15 speed', '+15 speed', '+22 speed'],
  },
  {
    id: 'squishyArmour',
    name: 'Squishy Armour',
    icon: '🛡️',
    blurb: 'Armour, but made of pillows. Surprisingly effective.',
    perLevel: [
      { maxHp: 22 },
      { maxHp: 22, armor: 1 },
      { maxHp: 22 },
      { maxHp: 22, armor: 1 },
      { maxHp: 30, armor: 2 },
    ],
    notes: [
      '+22 max HP',
      '+22 max HP, +1 armour',
      '+22 max HP',
      '+22 max HP, +1 armour',
      '+30 max HP, +2 armour',
    ],
  },
  {
    id: 'friendshipBracelet',
    name: 'Friendship Bracelet',
    icon: '💖',
    blurb: 'Hearts and sprinkles come to you, because you are lovely.',
    perLevel: [
      { pickupRadius: 30 },
      { pickupRadius: 30 },
      { pickupRadius: 30 },
      { pickupRadius: 30 },
      { pickupRadius: 45 },
    ],
    notes: ['+30 pickup range', '+30 pickup range', '+30 pickup range', '+30 pickup range', '+45 pickup range'],
  },
  {
    id: 'loudZoomies',
    name: 'Loud Zoomies',
    icon: '📣',
    blurb: 'You are simply taking up more space now.',
    perLevel: [
      { areaMult: 0.11 },
      { areaMult: 0.11 },
      { areaMult: 0.11 },
      { areaMult: 0.11 },
      { areaMult: 0.16 },
    ],
    notes: ['+11% area', '+11% area', '+11% area', '+11% area', '+16% area'],
  },
  {
    id: 'twinBraids',
    name: 'Twin Braids',
    icon: '🎀',
    blurb: 'Two braids means two of everything. Obviously.',
    perLevel: [
      { extraProjectiles: 1 },
      { projSpeedMult: 0.15 },
      { extraProjectiles: 1 },
      { projSpeedMult: 0.15 },
      { extraProjectiles: 1 },
    ],
    notes: ['+1 shot per attack', '+15% shot speed', '+1 shot per attack', '+15% shot speed', '+1 shot per attack'],
  },
  {
    id: 'fastPaws',
    name: 'Fast Paws',
    icon: '⚡',
    blurb: 'Attack faster. So fast. Paws are a blur.',
    perLevel: [
      { hasteMult: 0.1 },
      { hasteMult: 0.1 },
      { hasteMult: 0.1 },
      { hasteMult: 0.1 },
      { hasteMult: 0.15 },
    ],
    notes: ['+10% attack speed', '+10% attack speed', '+10% attack speed', '+10% attack speed', '+15% attack speed'],
  },
  {
    id: 'luckySocks',
    name: 'Lucky Socks',
    icon: '🧦',
    blurb: 'Mismatched on purpose. Big hits happen more often.',
    perLevel: [
      { critChance: 0.06 },
      { critChance: 0.06 },
      { critChance: 0.06, critMult: 0.25 },
      { critChance: 0.06 },
      { critChance: 0.08, critMult: 0.4 },
    ],
    notes: [
      '+6% crit chance',
      '+6% crit chance',
      '+6% crit, +0.25x crit damage',
      '+6% crit chance',
      '+8% crit, +0.4x crit damage',
    ],
  },
  {
    id: 'snackPocket',
    name: 'Snack Pocket',
    icon: '🍪',
    blurb: 'A pocket. Full of snacks. You nibble constantly.',
    perLevel: [
      { regen: 0.8 },
      { regen: 0.8 },
      { regen: 0.8 },
      { regen: 0.8 },
      { regen: 1.2, maxHp: 15 },
    ],
    notes: ['+0.8 HP per second', '+0.8 HP per second', '+0.8 HP per second', '+0.8 HP per second', '+1.2 HP/sec, +15 max HP'],
  },
  {
    id: 'starPupil',
    name: 'Star Pupil',
    icon: '🎓',
    blurb: 'You pay attention in class, so you level up quicker.',
    perLevel: [
      { xpMult: 0.14 },
      { xpMult: 0.14 },
      { xpMult: 0.14 },
      { xpMult: 0.14 },
      { xpMult: 0.2, luck: 0.15 },
    ],
    notes: ['+14% XP', '+14% XP', '+14% XP', '+14% XP', '+20% XP, +luck'],
  },
  {
    id: 'sleepySlippers',
    name: 'Sleepy Slippers',
    icon: '🥿',
    blurb: 'So comfy. Everything you leave lying around lasts longer.',
    perLevel: [
      { durationMult: 0.12 },
      { durationMult: 0.12 },
      { durationMult: 0.12 },
      { durationMult: 0.12 },
      { durationMult: 0.18 },
    ],
    notes: ['+12% duration', '+12% duration', '+12% duration', '+12% duration', '+18% duration'],
  },
]

export const PASSIVES: Readonly<Record<PassiveId, PassiveDef>> = Object.fromEntries(
  PASSIVE_LIST.map((p) => [p.id, p]),
) as Record<PassiveId, PassiveDef>

export const PASSIVE_IDS = PASSIVE_LIST.map((p) => p.id)

export function maxPassiveLevel(id: PassiveId): number {
  return PASSIVES[id].perLevel.length
}
