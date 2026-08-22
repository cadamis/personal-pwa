/**
 * Persistence for everything that outlives a run: sprinkles, shop upgrades,
 * unlocked friends, best scores.
 *
 * Reads are defensive — this is the one place untrusted (persisted) data enters
 * the game, so it gets narrowed here and everything downstream can trust it.
 * Mutating helpers are pure and return a new save, which keeps the shop's
 * "can I afford this?" logic testable without touching localStorage.
 */
import { CHARACTERS, STARTER_CHARACTER, toCharacterId, type CharacterId } from '../data/characters'
import { LEVELS, LEVEL_IDS, STARTER_LEVEL, toLevelId, type LevelId } from '../data/levels'
import { METAS, META_IDS, metaCost, type MetaId } from '../data/meta'

const STORAGE_KEY = 'cuteness-overload/save/v1'

export interface SaveData {
  sprinkles: number
  /** Owned level per shop upgrade. Missing = 0. */
  upgrades: Partial<Record<MetaId, number>>
  unlocked: CharacterId[]
  lastCharacter: CharacterId
  /** Longest survival in seconds. */
  bestTimeSec: number
  bestKills: number
  /** Total boss defeats, across every level. */
  wins: number
  /** Boss defeats per level. This is what unlocks later levels. */
  levelWins: Partial<Record<LevelId, number>>
  lastLevel: LevelId
  runs: number
  muted: boolean
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
    lastLevel: STARTER_LEVEL,
    runs: 0,
    muted: false,
  }
}

const num = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

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
  if (typeof parsed !== 'object' || parsed === null) return base
  const data = parsed as Record<string, unknown>

  base.sprinkles = Math.max(0, Math.floor(num(data.sprinkles, 0)))
  base.bestTimeSec = Math.max(0, num(data.bestTimeSec, 0))
  base.bestKills = Math.max(0, Math.floor(num(data.bestKills, 0)))
  base.wins = Math.max(0, Math.floor(num(data.wins, 0)))
  base.runs = Math.max(0, Math.floor(num(data.runs, 0)))
  base.muted = data.muted === true

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

  const levelWins = data.levelWins
  if (typeof levelWins === 'object' && levelWins !== null) {
    for (const id of LEVEL_IDS) {
      const count = Math.max(0, Math.floor(num((levelWins as Record<string, unknown>)[id], 0)))
      if (count > 0) base.levelWins[id] = count
    }
  } else if (base.wins > 0) {
    // Saves from before there was more than one level: every win was the meadow.
    base.levelWins[STARTER_LEVEL] = base.wins
  }

  base.lastLevel = toLevelId(data.lastLevel)
  if (!isLevelUnlocked(base, base.lastLevel)) base.lastLevel = STARTER_LEVEL

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

/** Price of the next level, or null when it's already maxed. */
export function nextMetaCost(save: SaveData, id: MetaId): number | null {
  const owned = metaLevel(save, id)
  return owned >= METAS[id].maxLevel ? null : metaCost(id, owned)
}

/** Returns an updated save, or null if it's maxed or unaffordable. */
export function tryBuyMeta(save: SaveData, id: MetaId): SaveData | null {
  const cost = nextMetaCost(save, id)
  if (cost === null || save.sprinkles < cost) return null
  return {
    ...save,
    sprinkles: save.sprinkles - cost,
    upgrades: { ...save.upgrades, [id]: metaLevel(save, id) + 1 },
  }
}

/** Returns an updated save, or null if already owned or unaffordable. */
export function tryUnlockCharacter(save: SaveData, id: CharacterId): SaveData | null {
  if (save.unlocked.includes(id)) return null
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

export interface RunResult {
  levelId: LevelId
  sprinkles: number
  survivedSec: number
  kills: number
  won: boolean
}

/** Folds a finished run's takings and records into the save. */
export function applyRunResult(save: SaveData, result: RunResult): SaveData {
  const levelWins = { ...save.levelWins }
  if (result.won) levelWins[result.levelId] = (levelWins[result.levelId] ?? 0) + 1
  return {
    ...save,
    sprinkles: save.sprinkles + Math.max(0, Math.floor(result.sprinkles)),
    bestTimeSec: Math.max(save.bestTimeSec, result.survivedSec),
    bestKills: Math.max(save.bestKills, result.kills),
    wins: save.wins + (result.won ? 1 : 0),
    levelWins,
    lastLevel: result.levelId,
    runs: save.runs + 1,
  }
}
