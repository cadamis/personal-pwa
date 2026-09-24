/** The playable friends. Each starts with one weapon and bends the stat block. */
import type { StatMod } from '../game/stats'
import type { WeaponId } from './weapons'

export type CharacterId =
  | 'mochi'
  | 'nimbus'
  | 'waffles'
  | 'pip'
  | 'blobbo'
  | 'puddles'
  | 'pillow'
  | 'twinkle'
  | 'jellybean'
  | 'fluffy'

export interface CharacterDef {
  id: CharacterId
  name: string
  /** Little subtitle under the name on the select screen. */
  title: string
  blurb: string
  texture: string
  startWeapon: WeaponId
  /**
   * Sprinkles to unlock. Mochi is free. Friends that come off a sticker (see
   * `characterUnlockSticker`) have 0 here and can't be bought at all.
   */
  unlockCost: number
  mods: StatMod
  /** Short "what makes them different" line, already written for a kid. */
  perk: string
}

const CHARACTER_LIST: readonly CharacterDef[] = [
  {
    id: 'mochi',
    name: 'Mochi',
    title: 'the Corgi Puff',
    blurb: 'A very round dog with very short legs and enormous confidence.',
    texture: 'char-mochi',
    startWeapon: 'bubbleBark',
    unlockCost: 0,
    mods: {},
    perk: 'Good at everything. Excellent at wagging.',
  },
  {
    id: 'nimbus',
    name: 'Nimbus',
    title: 'the Cloud Kitten',
    blurb: 'Half kitten, half weather. Naps in the sky, wakes up cranky.',
    texture: 'char-nimbus',
    startWeapon: 'sparkleSwipe',
    unlockCost: 250,
    mods: { moveSpeed: 38, maxHp: -14, hasteMult: 0.12 },
    perk: 'Zoomy and quick-pawed, but a bit delicate.',
  },
  {
    id: 'waffles',
    name: 'Waffles',
    title: 'the Cosy Hedgehog',
    blurb: 'Built like a cushion with opinions. Refuses to be rushed.',
    texture: 'char-waffles',
    startWeapon: 'snuggleSpikes',
    unlockCost: 450,
    mods: { maxHp: 55, moveSpeed: -18, armor: 3 },
    perk: 'Tough and spiky. Slower than a Sunday.',
  },
  {
    id: 'pip',
    name: 'Pip',
    title: 'the Lucky Bunny',
    blurb: 'Carries a four-leaf clover in each ear. It is working.',
    texture: 'char-pip',
    startWeapon: 'carrotBoomerang',
    unlockCost: 700,
    mods: { critChance: 0.13, moveSpeed: 14, maxHp: -10, luck: 0.25 },
    perk: 'Lots of BIG hits, and better level-up cards.',
  },
  {
    id: 'blobbo',
    name: 'Blobbo',
    title: 'the Friendly Blob',
    blurb: 'Nobody is sure what Blobbo is. Blobbo is not telling.',
    texture: 'char-blobbo',
    startWeapon: 'glitterBomb',
    unlockCost: 1000,
    mods: { maxHp: 30, regen: 1.2, moveSpeed: -10, areaMult: 0.18 },
    perk: 'Heals over time and takes up more room.',
  },
  {
    id: 'puddles',
    name: 'Puddles',
    title: 'the Dabbling Duck',
    blurb: 'Small, round and permanently unbothered. The goose is a friend of hers.',
    texture: 'char-puddles',
    startWeapon: 'sassyGoose',
    unlockCost: 1250,
    // A forager rather than a fighter: she snaffles hearts from further off and
    // turns them into levels quicker, which pairs with a starting weapon that
    // guards her while she waddles about picking things up.
    mods: { pickupRadius: 34, xpMult: 0.14, maxHp: -6 },
    perk: 'Grabs hearts from further away and levels up quicker.',
  },
  {
    id: 'pillow',
    name: 'Pillow',
    title: 'the Snuggly Lamb',
    blurb: 'Made almost entirely of wool. Gives the best hugs in the meadow.',
    texture: 'char-pillow',
    startWeapon: 'cuddleAura',
    unlockCost: 0,
    mods: { maxHp: 24, armor: 1, moveSpeed: -8, areaMult: 0.08 },
    perk: 'Soft, sturdy, and warm enough to hurt.',
  },
  {
    id: 'twinkle',
    name: 'Twinkle',
    title: 'the Fairy Hamster',
    blurb: 'Found a wand in a sunflower seed. Has been unbearable ever since.',
    texture: 'char-twinkle',
    startWeapon: 'pixieZap',
    unlockCost: 0,
    mods: { critChance: 0.08, hasteMult: 0.1, maxHp: -12, moveSpeed: 10 },
    perk: 'Quick, lucky and sparkly, but small.',
  },
  {
    id: 'jellybean',
    name: 'Jellybean',
    title: 'the Axolotl',
    blurb: 'Always smiling. Nobody knows why. Possibly the jelly.',
    texture: 'char-jellybean',
    startWeapon: 'jellyPuddle',
    unlockCost: 0,
    mods: { regen: 0.6, durationMult: 0.15, areaMult: 0.08 },
    perk: 'Heals slowly, and everything lingers longer.',
  },
  {
    id: 'fluffy',
    name: 'Fluffington',
    title: 'the Reformed',
    blurb: 'Used to be the grumpiest cat in the meadow. Now he just wants friends.',
    texture: 'char-fluffy',
    startWeapon: 'sparkleSwipe',
    unlockCost: 0,
    mods: { maxHp: 60, damageMult: 0.18, moveSpeed: -14, areaMult: 0.1, luck: 0.15 },
    perk: 'Big, strong and royal. A little slow.',
  },
]

export const CHARACTERS: Readonly<Record<CharacterId, CharacterDef>> = Object.fromEntries(
  CHARACTER_LIST.map((c) => [c.id, c]),
) as Record<CharacterId, CharacterDef>

export const CHARACTER_IDS = CHARACTER_LIST.map((c) => c.id)

export const STARTER_CHARACTER: CharacterId = 'mochi'

/** Narrows a persisted string back to a CharacterId, falling back to the starter. */
export function toCharacterId(value: unknown): CharacterId {
  return typeof value === 'string' && value in CHARACTERS ? (value as CharacterId) : STARTER_CHARACTER
}
