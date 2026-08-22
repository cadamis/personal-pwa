/**
 * The levels, as data.
 *
 * Everything that used to be a module constant in the GameScene — the wave
 * table, when the bosses arrive, how fast the Grumps toughen up, which backdrop
 * to tile — lives here, so a new level is a new entry rather than new code. The
 * one exception is obstacles, which need a physics group and a streamer.
 */
import { RUN_END, type EnemyId, type Wave } from './enemies'
import { P } from '../art/palette'

export type LevelId = 'meadow' | 'forest'

/** How much tougher Grumps get per minute of a run. */
export interface DifficultyRamp {
  hp: number
  speed: number
  damage: number
}

/** Scripted moments, on top of the steady wave spawning. */
export type LevelEvent =
  | { at: number; kind: 'ring'; enemy: EnemyId; count: number }
  | { at: number; kind: 'miniboss' }
  | { at: number; kind: 'boss' }
  | { at: number; kind: 'banner'; text: string; color: number }

/**
 * A field of static obstacles, streamed around the player as they move.
 *
 * Placement is a deterministic hash of the grid cell, so the same patch of
 * forest always has the same bushes however many times you walk past it — with
 * an endless world there's nowhere to store a generated layout.
 */
export interface ObstacleDef {
  texture: string
  /** Grid cell size in world px. At most one obstacle per cell. */
  cell: number
  /** 0..1 chance that a given cell contains one. */
  chance: number
  /** Collision radius in world px. */
  radius: number
  /** Sprite scale, before ART_SCALE. */
  scale: number
}

export interface LevelDef {
  id: LevelId
  name: string
  icon: string
  blurb: string
  /** Tiled backdrop texture and how large to draw it. */
  backdrop: string
  tileScale: number
  waves: readonly Wave[]
  events: readonly LevelEvent[]
  miniBoss: EnemyId
  boss: EnemyId
  /** When the boss arrives, which is also what the HUD counts towards. */
  bossTime: number
  ramp: DifficultyRamp
  /** Cap on live Grumps for this level. */
  maxLive: number
  /**
   * Multiplies every sprinkle this level pays out. The meadow is deliberately
   * stingy; clearing it and moving on is how you speed the shop up.
   */
  sprinkleMult: number
  obstacles?: ObstacleDef
  /** Beat this level's boss to unlock this one. */
  unlockedBy?: LevelId
}

const LEVEL_LIST: readonly LevelDef[] = [
  {
    id: 'meadow',
    name: 'Snuggle Meadow',
    icon: '🌼',
    blurb: 'Open, flowery, full of Grumps.',
    backdrop: 'bg-meadow',
    tileScale: 1,
    waves: [
      { from: 0, to: RUN_END, enemies: ['grumpySnail'], rate: 0.7 },
      { from: 25, to: RUN_END, enemies: ['bumblingBee'], rate: 0.5 },
      { from: 55, to: RUN_END, enemies: ['moodyMoth'], rate: 0.45 },
      { from: 85, to: RUN_END, enemies: ['poutySlime'], rate: 0.35 },
      { from: 115, to: RUN_END, enemies: ['crankyAcorn'], rate: 0.4 },
      { from: 150, to: RUN_END, enemies: ['sadCloud'], rate: 0.3 },
      { from: 180, to: RUN_END, enemies: ['grumpySnail', 'bumblingBee', 'poutySlime'], rate: 0.6 },
      { from: 220, to: RUN_END, enemies: ['crankyAcorn', 'moodyMoth', 'sadCloud'], rate: 0.65 },
    ],
    events: [
      { at: 60, kind: 'ring', enemy: 'grumpySnail', count: 12 },
      { at: 120, kind: 'miniboss' },
      { at: 150, kind: 'ring', enemy: 'bumblingBee', count: 14 },
      { at: 185, kind: 'banner', text: 'The clouds are sulking!', color: P.sky },
      { at: 210, kind: 'ring', enemy: 'crankyAcorn', count: 10 },
      { at: 240, kind: 'boss' },
    ],
    miniBoss: 'grumpyGnome',
    boss: 'sirFluffington',
    bossTime: 240,
    ramp: { hp: 0.42, speed: 0.05, damage: 0.15 },
    maxLive: 140,
    sprinkleMult: 0.5,
  },
  {
    id: 'forest',
    name: 'Grumbly Forest',
    icon: '🌲',
    blurb: 'Darker, busier. Bushes block everything.',
    backdrop: 'bg-forest',
    tileScale: 1,
    // Denser from the start and everything arrives sooner than in the meadow.
    waves: [
      { from: 0, to: RUN_END, enemies: ['grumpySnail', 'moodyMoth'], rate: 0.9 },
      { from: 20, to: RUN_END, enemies: ['bumblingBee'], rate: 0.6 },
      { from: 45, to: RUN_END, enemies: ['poutySlime'], rate: 0.5 },
      { from: 75, to: RUN_END, enemies: ['crankyAcorn'], rate: 0.5 },
      { from: 110, to: RUN_END, enemies: ['sadCloud'], rate: 0.4 },
      { from: 150, to: RUN_END, enemies: ['grumpySnail', 'poutySlime', 'crankyAcorn'], rate: 0.7 },
      { from: 200, to: RUN_END, enemies: ['sadCloud', 'moodyMoth', 'bumblingBee'], rate: 0.8 },
    ],
    events: [
      { at: 50, kind: 'ring', enemy: 'moodyMoth', count: 12 },
      { at: 110, kind: 'miniboss' },
      { at: 160, kind: 'ring', enemy: 'poutySlime', count: 12 },
      { at: 190, kind: 'banner', text: 'Something is up a tree...', color: P.lemon },
      { at: 215, kind: 'ring', enemy: 'crankyAcorn', count: 12 },
      { at: 240, kind: 'boss' },
    ],
    miniBoss: 'grumpyGnome',
    boss: 'grumpyMonkey',
    bossTime: 240,
    ramp: { hp: 0.55, speed: 0.07, damage: 0.2 },
    maxLive: 150,
    // Twice the meadow's payout: the harder level is how you get rich.
    sprinkleMult: 1,
    obstacles: { texture: 'prop-bush', cell: 190, chance: 0.55, radius: 21, scale: 1 },
    unlockedBy: 'meadow',
  },
]

export const LEVELS: Readonly<Record<LevelId, LevelDef>> = Object.fromEntries(
  LEVEL_LIST.map((l) => [l.id, l]),
) as Record<LevelId, LevelDef>

export const LEVEL_IDS = LEVEL_LIST.map((l) => l.id)

export const STARTER_LEVEL: LevelId = 'meadow'

/** Narrows a persisted string back to a LevelId, falling back to the first level. */
export function toLevelId(value: unknown): LevelId {
  return typeof value === 'string' && value in LEVELS ? (value as LevelId) : STARTER_LEVEL
}
