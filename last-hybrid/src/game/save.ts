/**
 * Three save slots, in the shape of the file select on the original Zelda.
 *
 * Everything here is pure and Phaser-free so it can be tested directly. That
 * matters more than usual: this is the one part of the game that reads data it
 * didn't write. Anything can be in local storage — a half-finished write, a
 * slot from an older build, or something a person typed into devtools — and a
 * save screen that throws on load is a game nobody can get into.
 * {@link sanitizeSlot} is the single door that data comes through.
 */
import { AREA_IDS, type AreaId } from '../world/areas'
import { PLAYER_MAX_HEALTH } from './constants'
import { HUMANOID_IDS, type HumanoidId } from './forms'

const KEY = 'last-hybrid:saves'

export const SLOT_COUNT = 3
export const NAME_MAX = 10

export interface SaveSlot {
  name: string
  humanoid: HumanoidId
  /**
   * Where they were standing when the game last saved, or null for a character
   * who hasn't played yet.
   *
   * Null rather than NaN: `JSON.stringify(NaN)` is `null` anyway, so a NaN
   * sentinel comes back as something the validator rightly rejects — which
   * silently emptied the slot of every character the moment they were created.
   */
  area: AreaId
  x: number | null
  y: number | null
  health: number
  createdAt: number
  updatedAt: number
}

export type SlotList = Array<SaveSlot | null>

/**
 * The characters a name may contain.
 *
 * A deliberately small set, because the name is drawn with the game's own
 * letter grid — anything not on that grid can't be typed and shouldn't be
 * accepted from a keyboard either.
 */
export const NAME_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-' "

/**
 * Folds arbitrary text into something that fits on the grid and in the slot:
 * upper case, known characters only, single-spaced, trimmed, and capped.
 */
export function normalizeName(raw: string): string {
  const allowed = raw
    .toUpperCase()
    .split('')
    .filter((ch) => NAME_ALPHABET.includes(ch))
    .join('')
  return allowed.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX)
}

/** Whether a name is good enough to save under. */
export function isValidName(raw: string): boolean {
  return normalizeName(raw).length > 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Form ids that have been renamed, mapped to what they're called now.
 *
 * Without this, a save written before the rename fails validation and the whole
 * slot comes back empty — the character silently gone. Renaming an id is cheap;
 * losing somebody's character to it is not.
 */
const LEGACY_HUMANOIDS: Readonly<Record<string, HumanoidId>> = {
  human_m: 'mmc',
  human_f: 'fmc',
}

/**
 * Validates one slot's worth of parsed JSON, or gives back null.
 *
 * Every field is checked rather than trusted: an out-of-range `area` would
 * throw when the world scene looked it up, and a NaN position would put the
 * player nowhere at all with no clue as to why.
 */
export function sanitizeSlot(raw: unknown): SaveSlot | null {
  if (typeof raw !== 'object' || raw === null) return null
  const value = raw as Record<string, unknown>

  const name = typeof value.name === 'string' ? normalizeName(value.name) : ''
  if (!name) return null
  if (typeof value.humanoid !== 'string') return null
  const humanoid = LEGACY_HUMANOIDS[value.humanoid] ?? (value.humanoid as HumanoidId)
  if (!HUMANOID_IDS.includes(humanoid)) return null
  if (typeof value.area !== 'string') return null
  if (!AREA_IDS.includes(value.area as AreaId)) return null
  // A position is either a real pair of numbers or absent entirely; half of one
  // would put the player somewhere nobody chose.
  const placed = isFiniteNumber(value.x) && isFiniteNumber(value.y)

  const health = isFiniteNumber(value.health)
    ? Math.max(1, Math.min(PLAYER_MAX_HEALTH, Math.round(value.health)))
    : PLAYER_MAX_HEALTH
  const createdAt = isFiniteNumber(value.createdAt) ? value.createdAt : 0
  const updatedAt = isFiniteNumber(value.updatedAt) ? value.updatedAt : createdAt

  return {
    name,
    humanoid,
    area: value.area as AreaId,
    x: placed ? (value.x as number) : null,
    y: placed ? (value.y as number) : null,
    health,
    createdAt,
    updatedAt,
  }
}

/** Pads or truncates whatever was stored to exactly {@link SLOT_COUNT} slots. */
export function sanitizeSlots(raw: unknown): SlotList {
  const list = Array.isArray(raw) ? raw : []
  return Array.from({ length: SLOT_COUNT }, (_, i) => sanitizeSlot(list[i]))
}

/** A brand new character, standing where the intro drops them. */
export function newSlot(name: string, humanoid: HumanoidId, now: number): SaveSlot {
  return {
    name: normalizeName(name),
    humanoid,
    area: 'clearing',
    // No position yet: the world scene reads that as "use the area's spawn".
    x: null,
    y: null,
    health: PLAYER_MAX_HEALTH,
    createdAt: now,
    updatedAt: now,
  }
}

/** True when the slot has never been played, so it needs the intro. */
export function isFreshSlot(slot: SaveSlot): boolean {
  return slot.x === null || slot.y === null
}

// ------------------------------------------------------------------ storage

export function loadSlots(): SlotList {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return sanitizeSlots(null)
    return sanitizeSlots(JSON.parse(raw))
  } catch {
    // Unreadable or unparseable — start from three empty slots rather than
    // leaving the player staring at a screen that won't load.
    return sanitizeSlots(null)
  }
}

export function saveSlots(slots: SlotList): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(slots))
  } catch {
    // Storage unavailable or full — play continues, it just won't persist.
  }
}

export function writeSlot(index: number, slot: SaveSlot): SlotList {
  const slots = loadSlots()
  if (index < 0 || index >= SLOT_COUNT) return slots
  slots[index] = slot
  saveSlots(slots)
  return slots
}

export function eraseSlot(index: number): SlotList {
  const slots = loadSlots()
  if (index < 0 || index >= SLOT_COUNT) return slots
  slots[index] = null
  saveSlots(slots)
  return slots
}

export function readSlot(index: number): SaveSlot | null {
  return loadSlots()[index] ?? null
}
