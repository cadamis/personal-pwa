/**
 * The Sticker Book: achievements, each of which gives you something.
 *
 * This is the long game. A fresh save has six friends to buy, one level open,
 * thirteen weapons in the level-up pool and the basic shop; everything else —
 * three more weapons, four more friends, the reroll and banish helpers — comes
 * off a sticker. Each sticker's `check` reads only the save (lifetime records)
 * and, at the end of a run, that run's summary, so the whole thing is a pure
 * function and the tests can drive it directly.
 */
import type { CharacterId } from './characters'
import type { LevelId } from './levels'
import type { MetaId } from './meta'
import type { BaseWeaponId, WeaponId } from './weapons'
import { EVOLUTION_IDS } from './weapons'

/** What a finished run looked like, for the stickers that care about one run. */
export interface RunSummary {
  levelId: LevelId
  characterId: CharacterId
  won: boolean
  grumpier: boolean
  survivedSec: number
  kills: number
  level: number
  /** Evolutions held when the run ended. */
  evolutions: readonly WeaponId[]
  /** Most weapons held at once. */
  mostWeapons: number
  /** Whether any weapon reached its top level. */
  maxedWeapon: boolean
  usedMagnet: boolean
  usedBomb: boolean
  usedFreeze: boolean
  chestsOpened: number
}

/** The lifetime records a sticker can look at. A subset of the save. */
export interface StickerRecords {
  levelWins: Partial<Record<LevelId, number>>
  grumpierWins: Partial<Record<LevelId, number>>
  bestTimeSec: number
  bestKills: number
  bestLevel: number
  totalKills: number
  chestsOpened: number
  presentsPopped: number
  evolutionsFound: readonly WeaponId[]
  characterWins: readonly CharacterId[]
  shopBuys: number
}

export type StickerReward =
  | { kind: 'sprinkles'; amount: number }
  | { kind: 'weapon'; id: BaseWeaponId }
  | { kind: 'character'; id: CharacterId }
  | { kind: 'shop'; id: MetaId }

export interface StickerDef {
  id: StickerId
  name: string
  icon: string
  /** What you have to do, written for a kid. */
  desc: string
  reward: StickerReward
  check: (records: StickerRecords, run?: RunSummary) => boolean
}

export type StickerId =
  | 'meadowChamp'
  | 'forestChamp'
  | 'peaksChamp'
  | 'candyChamp'
  | 'dreamChamp'
  | 'grumpierWin'
  | 'grumpierAll'
  | 'survive5'
  | 'survive10'
  | 'survive20'
  | 'bedtime'
  | 'squish500'
  | 'squish1500'
  | 'total10k'
  | 'total50k'
  | 'evolve1'
  | 'evolve5'
  | 'evolve10'
  | 'evolveAll'
  | 'doubleEvolve'
  | 'superEvolved'
  | 'maxedOut'
  | 'fullHouse'
  | 'level30'
  | 'level60'
  | 'chest1'
  | 'chest25'
  | 'present25'
  | 'present100'
  | 'magnet'
  | 'bomb'
  | 'nap'
  | 'shopper'
  | 'winMochi'
  | 'winNimbus'
  | 'winWaffles'
  | 'winPip'
  | 'winBlobbo'
  | 'winPuddles'
  | 'winPillow'
  | 'winTwinkle'
  | 'winJellybean'
  | 'winFluffy'
  | 'allFriends'

const ALL_LEVELS: readonly LevelId[] = ['meadow', 'forest', 'peaks', 'candy', 'dream']
const ALL_FRIENDS: readonly CharacterId[] = [
  'mochi',
  'nimbus',
  'waffles',
  'pip',
  'blobbo',
  'puddles',
  'pillow',
  'twinkle',
  'jellybean',
  'fluffy',
]

const beat = (level: LevelId) => (r: StickerRecords) => (r.levelWins[level] ?? 0) > 0
const winAs = (id: CharacterId) => (r: StickerRecords) => r.characterWins.includes(id)

const STICKER_LIST: readonly StickerDef[] = [
  // ---------------------------------------------------------------- bosses
  { id: 'meadowChamp', name: 'Meadow Champion', icon: '🌼', desc: 'Beat Sir Fluffington in Snuggle Meadow.', reward: { kind: 'sprinkles', amount: 100 }, check: beat('meadow') },
  { id: 'forestChamp', name: 'Forest Champion', icon: '🌲', desc: 'Beat the Grumpy Monkey in Grumbly Forest.', reward: { kind: 'sprinkles', amount: 150 }, check: beat('forest') },
  { id: 'peaksChamp', name: 'Peak Performer', icon: '❄️', desc: 'Beat Admiral Waddles in Frosty Peaks.', reward: { kind: 'character', id: 'twinkle' }, check: beat('peaks') },
  { id: 'candyChamp', name: 'Sweet Victory', icon: '🍭', desc: 'Beat the Gingerbread Giant in Candy Carnival.', reward: { kind: 'sprinkles', amount: 300 }, check: beat('candy') },
  { id: 'dreamChamp', name: 'Sweet Dreams', icon: '🌙', desc: 'Beat King Grumbleton in Starlight Dreamland.', reward: { kind: 'character', id: 'fluffy' }, check: beat('dream') },
  {
    id: 'grumpierWin',
    name: 'Grumpy Pants',
    icon: '😠',
    desc: 'Beat any boss on Grumpier mode.',
    reward: { kind: 'sprinkles', amount: 250 },
    check: (r) => ALL_LEVELS.some((id) => (r.grumpierWins[id] ?? 0) > 0),
  },
  {
    id: 'grumpierAll',
    name: 'Grumpiest Champion',
    icon: '👑',
    desc: 'Beat every boss on Grumpier mode.',
    reward: { kind: 'sprinkles', amount: 1500 },
    check: (r) => ALL_LEVELS.every((id) => (r.grumpierWins[id] ?? 0) > 0),
  },

  // -------------------------------------------------------------- survival
  { id: 'survive5', name: 'Five Minute Friend', icon: '⏱️', desc: 'Keep going for 5 minutes in one run.', reward: { kind: 'sprinkles', amount: 50 }, check: (r) => r.bestTimeSec >= 300 },
  { id: 'survive10', name: 'Ten Minute Hero', icon: '🦸', desc: 'Keep going for 10 minutes in one run.', reward: { kind: 'character', id: 'pillow' }, check: (r) => r.bestTimeSec >= 600 },
  { id: 'survive20', name: 'Night Owl', icon: '🦉', desc: 'Keep going for 20 minutes in one run.', reward: { kind: 'sprinkles', amount: 400 }, check: (r) => r.bestTimeSec >= 1200 },
  { id: 'bedtime', name: 'Bedtime!', icon: '🛌', desc: 'Last all the way to bedtime: 30 minutes!', reward: { kind: 'sprinkles', amount: 1000 }, check: (r) => r.bestTimeSec >= 1800 },

  // ------------------------------------------------------------- squishing
  { id: 'squish500', name: 'Squish Squad', icon: '💥', desc: 'Squish 500 Grumps in one run.', reward: { kind: 'weapon', id: 'cuddleAura' }, check: (r) => r.bestKills >= 500 },
  { id: 'squish1500', name: 'Squish-a-palooza', icon: '🎉', desc: 'Squish 1,500 Grumps in one run.', reward: { kind: 'sprinkles', amount: 250 }, check: (r) => r.bestKills >= 1500 },
  { id: 'total10k', name: 'Ten Thousand Hugs', icon: '🤗', desc: 'Squish 10,000 Grumps altogether.', reward: { kind: 'sprinkles', amount: 300 }, check: (r) => r.totalKills >= 10000 },
  { id: 'total50k', name: 'Squish Legend', icon: '🏆', desc: 'Squish 50,000 Grumps altogether.', reward: { kind: 'sprinkles', amount: 1000 }, check: (r) => r.totalKills >= 50000 },

  // ------------------------------------------------------------ evolutions
  { id: 'evolve1', name: 'Glow Up!', icon: '✨', desc: 'Evolve a weapon. Max it, carry its buddy, open a chest!', reward: { kind: 'shop', id: 'rerollDice' }, check: (r) => r.evolutionsFound.length >= 1 },
  { id: 'evolve5', name: 'Evolution Expert', icon: '🧪', desc: 'Discover 5 different evolutions.', reward: { kind: 'character', id: 'jellybean' }, check: (r) => r.evolutionsFound.length >= 5 },
  { id: 'evolve10', name: 'Mad Scientist', icon: '🔬', desc: 'Discover 10 different evolutions.', reward: { kind: 'sprinkles', amount: 500 }, check: (r) => r.evolutionsFound.length >= 10 },
  {
    id: 'evolveAll',
    name: 'Recipe Book Complete',
    icon: '📖',
    desc: 'Discover every single evolution.',
    reward: { kind: 'sprinkles', amount: 2000 },
    check: (r) => EVOLUTION_IDS.every((id) => r.evolutionsFound.includes(id)),
  },
  {
    id: 'doubleEvolve',
    name: 'Double Trouble',
    icon: '🌟',
    desc: 'Have 2 evolved weapons in the same run.',
    reward: { kind: 'shop', id: 'banishNote' },
    check: (_r, run) => (run?.evolutions.length ?? 0) >= 2,
  },
  {
    id: 'superEvolved',
    name: 'Super Duper Evolved',
    icon: '🌠',
    desc: 'Have 4 evolved weapons in the same run.',
    reward: { kind: 'sprinkles', amount: 600 },
    check: (_r, run) => (run?.evolutions.length ?? 0) >= 4,
  },

  // ------------------------------------------------------------ collecting
  { id: 'maxedOut', name: 'Maxed Out', icon: '💯', desc: 'Get a weapon all the way to its top level.', reward: { kind: 'sprinkles', amount: 60 }, check: (_r, run) => run?.maxedWeapon === true },
  { id: 'fullHouse', name: 'Full House', icon: '🏠', desc: 'Carry 6 weapons at once.', reward: { kind: 'sprinkles', amount: 100 }, check: (_r, run) => (run?.mostWeapons ?? 0) >= 6 },
  { id: 'level30', name: 'Level Thirty', icon: '⬆️', desc: 'Reach level 30 in one run.', reward: { kind: 'sprinkles', amount: 100 }, check: (r) => r.bestLevel >= 30 },
  { id: 'level60', name: 'Level Sixty', icon: '🚀', desc: 'Reach level 60 in one run.', reward: { kind: 'weapon', id: 'pixieZap' }, check: (r) => r.bestLevel >= 60 },
  { id: 'chest1', name: 'Ooh, Treasure!', icon: '🎁', desc: 'Open a treasure chest. Big Grumps carry them!', reward: { kind: 'sprinkles', amount: 30 }, check: (r) => r.chestsOpened >= 1 },
  { id: 'chest25', name: 'Treasure Hunter', icon: '🗝️', desc: 'Open 25 treasure chests.', reward: { kind: 'sprinkles', amount: 250 }, check: (r) => r.chestsOpened >= 25 },
  { id: 'present25', name: 'Present Popper', icon: '🎀', desc: 'Pop 25 presents.', reward: { kind: 'weapon', id: 'jellyPuddle' }, check: (r) => r.presentsPopped >= 25 },
  { id: 'present100', name: 'Party Animal', icon: '🎊', desc: 'Pop 100 presents.', reward: { kind: 'sprinkles', amount: 300 }, check: (r) => r.presentsPopped >= 100 },
  { id: 'magnet', name: 'Magnetic Personality', icon: '🧲', desc: 'Grab a Friendship Magnet from a present.', reward: { kind: 'sprinkles', amount: 40 }, check: (_r, run) => run?.usedMagnet === true },
  { id: 'bomb', name: 'Cuddle Bomb!', icon: '💣', desc: 'Set off a Cuddle Bomb from a present.', reward: { kind: 'sprinkles', amount: 40 }, check: (_r, run) => run?.usedBomb === true },
  { id: 'nap', name: 'Nap Time', icon: '😴', desc: 'Send the Grumps to sleep with a Nap Time moon.', reward: { kind: 'sprinkles', amount: 40 }, check: (_r, run) => run?.usedFreeze === true },
  { id: 'shopper', name: 'Big Spender', icon: '🛍️', desc: 'Buy 25 things in the Sprinkle Shop.', reward: { kind: 'sprinkles', amount: 250 }, check: (r) => r.shopBuys >= 25 },

  // ------------------------------------------------------------ friends
  { id: 'winMochi', name: "Mochi's Big Day", icon: '🐶', desc: 'Beat any boss as Mochi.', reward: { kind: 'sprinkles', amount: 100 }, check: winAs('mochi') },
  { id: 'winNimbus', name: "Nimbus's Big Day", icon: '🐱', desc: 'Beat any boss as Nimbus.', reward: { kind: 'sprinkles', amount: 100 }, check: winAs('nimbus') },
  { id: 'winWaffles', name: "Waffles's Big Day", icon: '🦔', desc: 'Beat any boss as Waffles.', reward: { kind: 'sprinkles', amount: 100 }, check: winAs('waffles') },
  { id: 'winPip', name: "Pip's Big Day", icon: '🐰', desc: 'Beat any boss as Pip.', reward: { kind: 'sprinkles', amount: 100 }, check: winAs('pip') },
  { id: 'winBlobbo', name: "Blobbo's Big Day", icon: '🟢', desc: 'Beat any boss as Blobbo.', reward: { kind: 'sprinkles', amount: 100 }, check: winAs('blobbo') },
  { id: 'winPuddles', name: "Puddles's Big Day", icon: '🐤', desc: 'Beat any boss as Puddles.', reward: { kind: 'sprinkles', amount: 100 }, check: winAs('puddles') },
  { id: 'winPillow', name: "Pillow's Big Day", icon: '🐑', desc: 'Beat any boss as Pillow.', reward: { kind: 'sprinkles', amount: 150 }, check: winAs('pillow') },
  { id: 'winTwinkle', name: "Twinkle's Big Day", icon: '🐹', desc: 'Beat any boss as Twinkle.', reward: { kind: 'sprinkles', amount: 150 }, check: winAs('twinkle') },
  { id: 'winJellybean', name: "Jellybean's Big Day", icon: '🦎', desc: 'Beat any boss as Jellybean.', reward: { kind: 'sprinkles', amount: 150 }, check: winAs('jellybean') },
  { id: 'winFluffy', name: "Fluffy's Big Day", icon: '😼', desc: 'Beat any boss as the reformed Sir Fluffington.', reward: { kind: 'sprinkles', amount: 200 }, check: winAs('fluffy') },
  {
    id: 'allFriends',
    name: 'Best Friends Forever',
    icon: '💕',
    desc: 'Beat a boss with every single friend.',
    reward: { kind: 'sprinkles', amount: 1500 },
    check: (r) => ALL_FRIENDS.every((id) => r.characterWins.includes(id)),
  },
]

export const STICKERS: Readonly<Record<StickerId, StickerDef>> = Object.fromEntries(
  STICKER_LIST.map((s) => [s.id, s]),
) as Record<StickerId, StickerDef>

export const STICKER_IDS = STICKER_LIST.map((s) => s.id)

/** Every sticker whose condition is met and that isn't in `have` yet. */
export function newlyEarned(have: readonly StickerId[], records: StickerRecords, run?: RunSummary): StickerId[] {
  return STICKER_IDS.filter((id) => !have.includes(id) && STICKERS[id].check(records, run))
}

/** Which sticker unlocks a weapon, if one does. Weapons not listed are available from the start. */
export function weaponUnlockSticker(id: WeaponId): StickerId | undefined {
  return STICKER_LIST.find((s) => s.reward.kind === 'weapon' && s.reward.id === id)?.id
}

/** Which sticker unlocks a friend, if one does (the rest are bought with sprinkles). */
export function characterUnlockSticker(id: CharacterId): StickerId | undefined {
  return STICKER_LIST.find((s) => s.reward.kind === 'character' && s.reward.id === id)?.id
}

/** Which sticker opens a shop item, if one does. */
export function shopUnlockSticker(id: MetaId): StickerId | undefined {
  return STICKER_LIST.find((s) => s.reward.kind === 'shop' && s.reward.id === id)?.id
}

/** A one-line description of a reward, for the sticker book and results screen. */
export function rewardText(reward: StickerReward, names: { weapon: (id: BaseWeaponId) => string; character: (id: CharacterId) => string; shop: (id: MetaId) => string }): string {
  switch (reward.kind) {
    case 'sprinkles':
      return `🍬 ${reward.amount} sprinkles`
    case 'weapon':
      return `New weapon: ${names.weapon(reward.id)}`
    case 'character':
      return `New friend: ${names.character(reward.id)}`
    case 'shop':
      return `New in the shop: ${names.shop(reward.id)}`
  }
}
