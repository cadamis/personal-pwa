/**
 * The Sprinkle Shop: upgrades bought between runs and kept forever. This is the
 * rogue-lite half of the game — a bad run still buys you something.
 */
import type { StatMod } from '../game/stats'

export type MetaId =
  | 'growthSpurt'
  | 'sneakerUpgrade'
  | 'sharperSparkles'
  | 'magnetMittens'
  | 'windUpWatch'
  | 'piggyBank'
  | 'luckyClover'
  | 'bookBag'
  | 'headStart'
  | 'cosyBlanket'
  | 'secondWind'
  | 'musicBox'
  | 'puffyJacket'
  | 'presentRadar'
  | 'chestCharm'
  | 'rerollDice'
  | 'banishNote'
  | 'starPower'

export interface MetaDef {
  id: MetaId
  name: string
  icon: string
  blurb: string
  maxLevel: number
  /** Cost of the *first* level; later levels scale by {@link metaCost}. */
  baseCost: number
  /** Applied once per level owned. */
  perLevel: StatMod
  /** How the shop describes one level, e.g. "+25 max HP". */
  effectText: string
}

const META_LIST: readonly MetaDef[] = [
  {
    id: 'growthSpurt',
    name: 'Growth Spurt',
    icon: '🌱',
    blurb: 'Eat your greens. Become sturdier.',
    maxLevel: 8,
    baseCost: 45,
    perLevel: { maxHp: 25 },
    effectText: '+25 max HP',
  },
  {
    id: 'sneakerUpgrade',
    name: 'Squeaky Sneakers',
    icon: '👟',
    blurb: 'They light up when you run. Naturally you run faster.',
    maxLevel: 5,
    baseCost: 55,
    perLevel: { moveSpeed: 11 },
    effectText: '+11 move speed',
  },
  {
    id: 'sharperSparkles',
    name: 'Sharper Sparkles',
    icon: '✨',
    blurb: 'Same sparkles. Pointier.',
    maxLevel: 8,
    baseCost: 70,
    perLevel: { damageMult: 0.08 },
    effectText: '+8% damage',
  },
  {
    id: 'magnetMittens',
    name: 'Magnet Mittens',
    icon: '🧲',
    blurb: 'Hearts and sprinkles simply cannot resist.',
    maxLevel: 4,
    baseCost: 50,
    perLevel: { pickupRadius: 28 },
    effectText: '+28 pickup range',
  },
  {
    id: 'windUpWatch',
    name: 'Wind-Up Watch',
    icon: '⏱️',
    blurb: 'Tick tick tick tick tick tick.',
    maxLevel: 6,
    baseCost: 80,
    perLevel: { hasteMult: 0.06 },
    effectText: '+6% attack speed',
  },
  {
    id: 'piggyBank',
    name: 'Piggy Bank',
    icon: '🐷',
    blurb: 'Oink. Keeps more sprinkles from every run.',
    maxLevel: 6,
    baseCost: 60,
    perLevel: { sprinkleMult: 0.15 },
    effectText: '+15% sprinkles',
  },
  {
    id: 'luckyClover',
    name: 'Lucky Clover',
    icon: '🍀',
    blurb: 'More level-up cards to choose between.',
    maxLevel: 3,
    baseCost: 120,
    perLevel: { luck: 0.22 },
    effectText: '+22% chance of an extra card',
  },
  {
    id: 'bookBag',
    name: 'Book Bag',
    icon: '🎒',
    blurb: 'Full of homework. You level up faster anyway.',
    maxLevel: 5,
    baseCost: 65,
    perLevel: { xpMult: 0.1 },
    effectText: '+10% XP',
  },
  {
    id: 'headStart',
    name: 'Head Start',
    icon: '🏁',
    blurb: 'Begin every run already a bit powerful.',
    maxLevel: 3,
    baseCost: 150,
    perLevel: { startLevel: 1 },
    effectText: 'Start 1 level higher',
  },
  {
    id: 'cosyBlanket',
    name: 'Cosy Blanket',
    icon: '🧣',
    blurb: 'Snuggle as you go. Hearts come back all by themselves.',
    maxLevel: 4,
    baseCost: 110,
    // A quarter of a heart a second is small next to the ~6/sec a Grump does on
    // contact, but over a five-minute run it adds up to more than a full bar.
    perLevel: { regen: 0.25 },
    effectText: '+0.25 HP per second',
  },
  {
    id: 'secondWind',
    name: 'Second Wind',
    icon: '🫧',
    blurb: 'Get squished? Pop back up with half your hearts.',
    maxLevel: 2,
    baseCost: 300,
    perLevel: { revives: 1 },
    effectText: '+1 second chance',
  },
  {
    id: 'musicBox',
    name: 'Lullaby Music Box',
    icon: '🎶',
    blurb: 'Plays a gentle tune. Everything you leave behind lingers longer.',
    maxLevel: 4,
    baseCost: 90,
    perLevel: { durationMult: 0.08 },
    effectText: '+8% duration',
  },
  {
    id: 'puffyJacket',
    name: 'Puffy Jacket',
    icon: '🧥',
    blurb: 'Extremely puffy. Somehow makes every attack bigger.',
    maxLevel: 4,
    baseCost: 100,
    perLevel: { areaMult: 0.05 },
    effectText: '+5% area',
  },
  {
    id: 'presentRadar',
    name: 'Present Radar',
    icon: '📡',
    blurb: 'Beep beep! Finds more presents on the floor.',
    maxLevel: 3,
    baseCost: 90,
    perLevel: { presentLuck: 0.25 },
    effectText: '+25% presents',
  },
  {
    id: 'chestCharm',
    name: 'Chest Charm',
    icon: '🗝️',
    blurb: 'Treasure chests like you. They give you more.',
    maxLevel: 3,
    baseCost: 150,
    perLevel: { chestLuck: 0.12 },
    effectText: 'Bigger treasure chests',
  },
  {
    id: 'rerollDice',
    name: 'Reroll Dice',
    icon: '🎲',
    blurb: "Don't like the cards? Roll again!",
    maxLevel: 5,
    baseCost: 80,
    perLevel: { rerolls: 1 },
    effectText: '+1 reroll every run',
  },
  {
    id: 'banishNote',
    name: 'No-Thanks Note',
    icon: '🙅',
    blurb: 'Say "no thanks" to a card and never see it again that run.',
    maxLevel: 3,
    baseCost: 120,
    perLevel: { banishes: 1 },
    effectText: '+1 "no thanks" every run',
  },
  {
    id: 'starPower',
    name: 'Star Power',
    icon: '🌟',
    blurb: 'The most powerful thing in the shop. One extra of everything.',
    maxLevel: 1,
    baseCost: 2500,
    perLevel: { extraProjectiles: 1 },
    effectText: '+1 shot on every weapon',
  },
]

export const METAS: Readonly<Record<MetaId, MetaDef>> = Object.fromEntries(
  META_LIST.map((m) => [m.id, m]),
) as Record<MetaId, MetaDef>

export const META_IDS = META_LIST.map((m) => m.id)

/**
 * Cost of buying level `owned + 1`, rounded to something a kid can read.
 * Grows ~1.7x per level so early upgrades are quick wins and the last level of
 * anything is a real goal.
 */
export function metaCost(id: MetaId, owned: number): number {
  const def = METAS[id]
  const raw = def.baseCost * Math.pow(1.7, owned)
  return Math.round(raw / 5) * 5
}

/** Total sprinkles to take an upgrade from `owned` to max. */
export function metaCostToMax(id: MetaId, owned: number): number {
  let total = 0
  for (let i = owned; i < METAS[id].maxLevel; i++) total += metaCost(id, i)
  return total
}
