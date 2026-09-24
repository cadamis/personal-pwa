/**
 * Persistence for everything that outlives a run: sprinkles, shop upgrades,
 * unlocked friends, stickers, lifetime records.
 *
 * Reads are defensive — this is the one place untrusted (persisted) data enters
 * the game, so it gets narrowed here and everything downstream can trust it.
 * Mutating helpers are pure and return a new save, which keeps the shop's
 * "can I afford this?" logic testable without touching localStorage.
 *
 * Every field added since the first version is optional in storage and falls
 * back to a sensible default, so an old save loads with everything it had.
 * {@link awardStickers} then back-fills any sticker the old records already
 * earn, so a returning player opens the book to a page of stickers rather than
 * an empty one.
 */
import { CHARACTERS, STARTER_CHARACTER, toCharacterId, type CharacterId } from '../data/characters'
import { LEVELS, LEVEL_IDS, STARTER_LEVEL, toLevelId, type LevelId } from '../data/levels'
import { METAS, META_IDS, metaCost, type MetaId } from '../data/meta'
import {
  STICKERS,
  STICKER_IDS,
  characterUnlockSticker,
  newlyEarned,
  shopUnlockSticker,
  weaponUnlockSticker,
  type RunSummary,
  type StickerId,
  type StickerRecords,
} from '../data/stickers'
import { BASE_WEAPON_IDS, EVOLUTION_IDS, WEAPONS, type BaseWeaponId, type WeaponId } from '../data/weapons'

const STORAGE_KEY = 'cuteness-overload/save/v1'

export interface SaveData {
  sprinkles: number
  /** Owned level per shop upgrade. Missing = 0. */
  upgrades: Partial<Record<MetaId, number>>
  unlocked: CharacterId[]
  lastCharacter: CharacterId
  /** Longest survival in seconds, on any level. */
  bestTimeSec: number
  bestKills: number
  /** Total boss defeats, across every level. */
  wins: number
  /** Boss defeats per level. This is what unlocks later levels. */
  levelWins: Partial<Record<LevelId, number>>
  /** Boss defeats per level on Grumpier mode. */
  grumpierWins: Partial<Record<LevelId, number>>
  /** Longest survival per level. */
  bestTimes: Partial<Record<LevelId, number>>
  lastLevel: LevelId
  /** Whether Grumpier mode was switched on last time, so it stays on. */
  grumpier: boolean
  runs: number
  muted: boolean
  // --- lifetime records, for stickers
  bestLevel: number
  totalKills: number
  chestsOpened: number
  presentsPopped: number
  evolutionsFound: WeaponId[]
  /** Friends who have beaten at least one boss. */
  characterWins: CharacterId[]
  shopBuys: number
  // --- stickers
  stickers: StickerId[]
  /** Earned but not yet looked at in the Sticker Book. */
  newStickers: StickerId[]
}

export function defaultSave(): SaveData {
  return {
    sprinkles: 0,
    upgrades: {},
    unlocked: [STARTER_CHARACTER],
    lastCharacter: STARTER_CHARACTER,
    bestTimeSec: 0,
    bestKills: 0,
    wins: 0,
    levelWins: {},
    grumpierWins: {},
    bestTimes: {},
    lastLevel: STARTER_LEVEL,
    grumpier: false,
    runs: 0,
    muted: false,
    bestLevel: 0,
    totalKills: 0,
    chestsOpened: 0,
    presentsPopped: 0,
    evolutionsFound: [],
    characterWins: [],
    shopBuys: 0,
    stickers: [],
    newStickers: [],
  }
}

const num = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const count = (value: unknown): number => Math.max(0, Math.floor(num(value, 0)))

/** A per-level record, keeping only real levels and positive counts. */
function perLevel(value: unknown, keep: (raw: unknown) => number = count): Partial<Record<LevelId, number>> {
  const out: Partial<Record<LevelId, number>> = {}
  if (typeof value !== 'object' || value === null) return out
  for (const id of LEVEL_IDS) {
    const n = keep((value as Record<string, unknown>)[id])
    if (n > 0) out[id] = n
  }
  return out
}

/** Keeps only the entries of `value` that are in `valid`, deduplicated, in `valid`'s order. */
function subsetOf<T extends string>(value: unknown, valid: readonly T[]): T[] {
  if (!Array.isArray(value)) return []
  const set = new Set(value.filter((v): v is string => typeof v === 'string'))
  return valid.filter((id) => set.has(id))
}

/** Turns whatever was in storage into a valid SaveData. Never throws. */
export function parseSave(raw: string | null): SaveData {
  const base = defaultSave()
  if (!raw) return base

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return base
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return base
  const data = parsed as Record<string, unknown>

  base.sprinkles = count(data.sprinkles)
  base.bestTimeSec = Math.max(0, num(data.bestTimeSec, 0))
  base.bestKills = count(data.bestKills)
  base.wins = count(data.wins)
  base.runs = count(data.runs)
  base.muted = data.muted === true
  base.grumpier = data.grumpier === true
  base.bestLevel = count(data.bestLevel)
  base.totalKills = count(data.totalKills)
  base.chestsOpened = count(data.chestsOpened)
  base.presentsPopped = count(data.presentsPopped)
  base.shopBuys = count(data.shopBuys)

  const upgrades = data.upgrades
  if (typeof upgrades === 'object' && upgrades !== null) {
    for (const id of META_IDS) {
      const level = (upgrades as Record<string, unknown>)[id]
      const clamped = Math.max(0, Math.min(METAS[id].maxLevel, Math.floor(num(level, 0))))
      if (clamped > 0) base.upgrades[id] = clamped
    }
  }

  if (Array.isArray(data.unlocked)) {
    const ids = new Set<CharacterId>([STARTER_CHARACTER])
    for (const entry of data.unlocked) {
      if (typeof entry === 'string' && entry in CHARACTERS) ids.add(entry as CharacterId)
    }
    base.unlocked = [...ids]
  }

  base.lastCharacter = toCharacterId(data.lastCharacter)
  if (!base.unlocked.includes(base.lastCharacter)) base.lastCharacter = STARTER_CHARACTER

  if (typeof data.levelWins === 'object' && data.levelWins !== null) {
    base.levelWins = perLevel(data.levelWins)
  } else if (base.wins > 0) {
    // Saves from before there was more than one level: every win was the meadow.
    base.levelWins[STARTER_LEVEL] = base.wins
  }
  base.grumpierWins = perLevel(data.grumpierWins)
  base.bestTimes = perLevel(data.bestTimes, (v) => Math.max(0, num(v, 0)))

  base.lastLevel = toLevelId(data.lastLevel)
  if (!isLevelUnlocked(base, base.lastLevel)) base.lastLevel = STARTER_LEVEL

  base.evolutionsFound = subsetOf(data.evolutionsFound, EVOLUTION_IDS)
  base.characterWins = subsetOf(data.characterWins, Object.keys(CHARACTERS) as CharacterId[])
  base.stickers = subsetOf(data.stickers, STICKER_IDS)
  base.newStickers = subsetOf(data.newStickers, STICKER_IDS).filter((id) => base.stickers.includes(id))

  return base
}

export function loadSave(storage: Storage | undefined = safeStorage()): SaveData {
  try {
    return parseSave(storage?.getItem(STORAGE_KEY) ?? null)
  } catch {
    return defaultSave()
  }
}

export function writeSave(data: SaveData, storage: Storage | undefined = safeStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Private browsing / storage full: the game still plays, it just forgets.
  }
}

export function clearSave(storage: Storage | undefined = safeStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEY)
  } catch {
    /* nothing we can do, and nothing that should stop the game */
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

// ------------------------------------------------------------- pure mutations

export function metaLevel(save: SaveData, id: MetaId): number {
  return save.upgrades[id] ?? 0
}

/** Shop items can be locked behind a sticker. */
export function isShopItemAvailable(save: SaveData, id: MetaId): boolean {
  const sticker = shopUnlockSticker(id)
  return sticker === undefined || save.stickers.includes(sticker)
}

/** Price of the next level, or null when it's already maxed. */
export function nextMetaCost(save: SaveData, id: MetaId): number | null {
  const owned = metaLevel(save, id)
  return owned >= METAS[id].maxLevel ? null : metaCost(id, owned)
}

/** Returns an updated save, or null if it's maxed, locked or unaffordable. */
export function tryBuyMeta(save: SaveData, id: MetaId): SaveData | null {
  if (!isShopItemAvailable(save, id)) return null
  const cost = nextMetaCost(save, id)
  if (cost === null || save.sprinkles < cost) return null
  return {
    ...save,
    sprinkles: save.sprinkles - cost,
    upgrades: { ...save.upgrades, [id]: metaLevel(save, id) + 1 },
    shopBuys: save.shopBuys + 1,
  }
}

/** Friends that come off a sticker can't be bought. */
export function isCharacterForSale(id: CharacterId): boolean {
  return characterUnlockSticker(id) === undefined
}

/** Returns an updated save, or null if already owned, not for sale, or unaffordable. */
export function tryUnlockCharacter(save: SaveData, id: CharacterId): SaveData | null {
  if (save.unlocked.includes(id) || !isCharacterForSale(id)) return null
  const cost = CHARACTERS[id].unlockCost
  if (save.sprinkles < cost) return null
  return {
    ...save,
    sprinkles: save.sprinkles - cost,
    unlocked: [...save.unlocked, id],
    lastCharacter: id,
  }
}

/**
 * A level is playable once its prerequisite level's boss has been beaten. Levels
 * without a prerequisite are always available.
 */
export function isLevelUnlocked(save: SaveData, id: LevelId): boolean {
  const required = LEVELS[id].unlockedBy
  if (!required) return true
  return (save.levelWins[required] ?? 0) > 0
}

/** Every level the player can currently choose. */
export function unlockedLevels(save: SaveData): LevelId[] {
  return LEVEL_IDS.filter((id) => isLevelUnlocked(save, id))
}

/** Grumpier mode opens up per level once you've beaten that level's boss. */
export function isGrumpierUnlocked(save: SaveData, id: LevelId): boolean {
  return (save.levelWins[id] ?? 0) > 0
}

/** Weapons can be locked behind a sticker; locked ones never appear on a card. */
export function isWeaponUnlocked(save: SaveData, id: WeaponId): boolean {
  const sticker = weaponUnlockSticker(id)
  return sticker === undefined || save.stickers.includes(sticker)
}

/** The base weapons that can currently turn up on a level-up card. */
export function unlockedWeapons(save: SaveData): BaseWeaponId[] {
  return BASE_WEAPON_IDS.filter((id) => isWeaponUnlocked(save, id))
}

export interface RunResult {
  levelId: LevelId
  characterId: CharacterId
  sprinkles: number
  survivedSec: number
  kills: number
  won: boolean
  grumpier: boolean
  level: number
  chestsOpened: number
  presentsPopped: number
  /** Evolutions obtained this run. */
  evolutions: readonly WeaponId[]
}

/** Folds a finished run's takings and records into the save. */
export function applyRunResult(save: SaveData, result: RunResult): SaveData {
  const levelWins = { ...save.levelWins }
  const grumpierWins = { ...save.grumpierWins }
  if (result.won) {
    levelWins[result.levelId] = (levelWins[result.levelId] ?? 0) + 1
    if (result.grumpier) grumpierWins[result.levelId] = (grumpierWins[result.levelId] ?? 0) + 1
  }
  const bestTimes = { ...save.bestTimes }
  bestTimes[result.levelId] = Math.max(bestTimes[result.levelId] ?? 0, result.survivedSec)
  const evolutionsFound = [...save.evolutionsFound]
  for (const id of result.evolutions) {
    if (WEAPONS[id].evolvedFrom && !evolutionsFound.includes(id)) evolutionsFound.push(id)
  }
  const characterWins =
    result.won && !save.characterWins.includes(result.characterId)
      ? [...save.characterWins, result.characterId]
      : save.characterWins
  return {
    ...save,
    sprinkles: save.sprinkles + Math.max(0, Math.floor(result.sprinkles)),
    bestTimeSec: Math.max(save.bestTimeSec, result.survivedSec),
    bestKills: Math.max(save.bestKills, result.kills),
    bestLevel: Math.max(save.bestLevel, result.level),
    wins: save.wins + (result.won ? 1 : 0),
    levelWins,
    grumpierWins,
    bestTimes,
    lastLevel: result.levelId,
    runs: save.runs + 1,
    totalKills: save.totalKills + Math.max(0, result.kills),
    chestsOpened: save.chestsOpened + Math.max(0, result.chestsOpened),
    presentsPopped: save.presentsPopped + Math.max(0, result.presentsPopped),
    evolutionsFound,
    characterWins,
  }
}

/** The part of the save the stickers read. */
export function stickerRecords(save: SaveData): StickerRecords {
  return {
    levelWins: save.levelWins,
    grumpierWins: save.grumpierWins,
    bestTimeSec: save.bestTimeSec,
    bestKills: save.bestKills,
    bestLevel: save.bestLevel,
    totalKills: save.totalKills,
    chestsOpened: save.chestsOpened,
    presentsPopped: save.presentsPopped,
    evolutionsFound: save.evolutionsFound,
    characterWins: save.characterWins,
    shopBuys: save.shopBuys,
  }
}

/**
 * Hands out every sticker the save (and optionally a just-finished run) has
 * earned, along with its reward. Returns the new save and the stickers earned,
 * in book order, so the results screen can show them off.
 */
export function awardStickers(save: SaveData, run?: RunSummary): { save: SaveData; earned: StickerId[] } {
  const earned = newlyEarned(save.stickers, stickerRecords(save), run)
  if (earned.length === 0) return { save, earned }
  let sprinkles = save.sprinkles
  const unlocked = [...save.unlocked]
  for (const id of earned) {
    const reward = STICKERS[id].reward
    if (reward.kind === 'sprinkles') sprinkles += reward.amount
    if (reward.kind === 'character' && !unlocked.includes(reward.id)) unlocked.push(reward.id)
  }
  return {
    save: {
      ...save,
      sprinkles,
      unlocked,
      stickers: [...save.stickers, ...earned],
      newStickers: [...save.newStickers, ...earned],
    },
    earned,
  }
}

/** Marks every sticker as seen, once the Sticker Book has been opened. */
export function markStickersSeen(save: SaveData): SaveData {
  return save.newStickers.length === 0 ? save : { ...save, newStickers: [] }
}
