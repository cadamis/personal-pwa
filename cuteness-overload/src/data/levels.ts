/**
 * The levels, as data.
 *
 * Everything that used to be a module constant in the GameScene — the wave
 * table, when the bosses arrive, how fast the Grumps toughen up, which backdrop
 * to tile — lives here, so a new level is a new entry rather than new code. The
 * one exception is obstacles, which need a physics group and a streamer.
 *
 * Every level has the same shape, borrowed from Vampire Survivors: the enemy
 * mix changes every minute or so, an elite (a big version of an ordinary Grump)
 * or a mini-boss turns up every couple of minutes carrying a treasure chest,
 * and the boss arrives at `bossTime`. Beating the boss wins the level — and then
 * you can keep going (endless) for as long as you last, up to bedtime.
 */
import { RUN_END, type EnemyId, type Wave } from './enemies'
import { P } from '../art/palette'

export type LevelId = 'meadow' | 'forest' | 'peaks' | 'candy' | 'dream'

/** How much tougher Grumps get per minute of a run. */
export interface DifficultyRamp {
  hp: number
  speed: number
  damage: number
}

/** Scripted moments, on top of the steady wave spawning. */
export type LevelEvent =
  /** A ring of Grumps all round the player at once. */
  | { at: number; kind: 'ring'; enemy: EnemyId; count: number }
  /** A line of Grumps charging across the screen from one side. */
  | { at: number; kind: 'stampede'; enemy: EnemyId; count: number }
  /** A big, tough version of an ordinary Grump. Drops a chest. */
  | { at: number; kind: 'elite'; enemy: EnemyId }
  | { at: number; kind: 'miniboss'; enemy: EnemyId }
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
  /** One is picked per cell, deterministically, so a forest isn't all one bush. */
  textures: readonly string[]
  /** Grid cell size in world px. At most one obstacle per cell. */
  cell: number
  /** 0..1 chance that a given cell contains one. */
  chance: number
  /** Collision radius in world px. */
  radius: number
  /** Sprite scale, before ART_SCALE. */
  scale: number
}

/**
 * Ground decoration: flowers, leaves and so on, streamed like obstacles but
 * with no collision. Kept sparse and low-contrast so fights stay readable.
 */
export interface DecalDef {
  textures: readonly string[]
  /** Grid cell size in world px. At most one decal per cell. */
  cell: number
  /** 0..1 chance that a given cell has one. */
  chance: number
  alpha: number
}

export interface LevelDef {
  id: LevelId
  name: string
  icon: string
  blurb: string
  /** Colour for this level's card on the stage picker. */
  accent: number
  /** Tiled backdrop texture and how large to draw it. */
  backdrop: string
  tileScale: number
  waves: readonly Wave[]
  events: readonly LevelEvent[]
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
  decals: DecalDef
  /** Breakable presents: one grid cell of this size in world px, this likely to hold one. */
  presents: { cell: number; chance: number }
  /** Beat this level's boss to unlock this one. */
  unlockedBy?: LevelId
}

/**
 * Grumpier mode, unlocked per level by beating its boss: everything is tougher
 * and more numerous, and it pays a lot better.
 */
export const GRUMPIER = {
  hp: 1.6,
  speed: 1.12,
  damage: 1.25,
  spawnRate: 1.4,
  sprinkles: 1.6,
} as const

/** After the boss falls, spawn rates keep climbing by this fraction per minute. */
export const ENDLESS_RATE_PER_MIN = 0.45
/**
 * After the boss falls, Grumps also toughen up faster than the level's own ramp,
 * by this fraction per minute — so endless always ends eventually, and lasting
 * to bedtime is a genuine feat rather than a matter of patience.
 */
export const ENDLESS_TOUGHEN_PER_MIN = 0.16
/** In endless, a mini-boss or elite turns up this often. */
export const ENDLESS_MINIBOSS_EVERY = 110
/** A run can't go on past this, however well it's going. Bedtime! */
export const BEDTIME = RUN_END

const LEVEL_LIST: readonly LevelDef[] = [
  {
    id: 'meadow',
    name: 'Snuggle Meadow',
    icon: '🌼',
    blurb: 'Open, flowery, full of Grumps.',
    accent: 0x9be27a,
    backdrop: 'bg-meadow',
    tileScale: 1,
    waves: [
      { from: 0, to: 180, enemies: ['grumpySnail'], rate: 0.7 },
      { from: 20, to: 260, enemies: ['bumblingBee'], rate: 0.5 },
      { from: 50, to: 360, enemies: ['moodyMoth'], rate: 0.45 },
      { from: 80, to: RUN_END, enemies: ['poutySlime'], rate: 0.35 },
      { from: 110, to: RUN_END, enemies: ['crankyAcorn'], rate: 0.4 },
      { from: 150, to: RUN_END, enemies: ['sadCloud'], rate: 0.3 },
      { from: 180, to: RUN_END, enemies: ['grumpySnail', 'bumblingBee', 'poutySlime'], rate: 0.7 },
      { from: 240, to: RUN_END, enemies: ['crankyAcorn', 'moodyMoth', 'sadCloud'], rate: 0.65 },
      { from: 330, to: RUN_END, enemies: ['bumblingBee', 'moodyMoth', 'grumpySnail'], rate: 0.7 },
    ],
    events: [
      { at: 40, kind: 'ring', enemy: 'grumpySnail', count: 12 },
      { at: 95, kind: 'elite', enemy: 'grumpySnail' },
      { at: 150, kind: 'miniboss', enemy: 'grumpyGnome' },
      { at: 200, kind: 'stampede', enemy: 'bumblingBee', count: 14 },
      { at: 240, kind: 'ring', enemy: 'poutySlime', count: 12 },
      { at: 270, kind: 'elite', enemy: 'poutySlime' },
      { at: 300, kind: 'banner', text: 'The clouds are sulking!', color: P.sky },
      { at: 330, kind: 'miniboss', enemy: 'grumpyGnome' },
      { at: 370, kind: 'ring', enemy: 'crankyAcorn', count: 14 },
      { at: 420, kind: 'boss' },
    ],
    boss: 'sirFluffington',
    bossTime: 420,
    ramp: { hp: 0.42, speed: 0.045, damage: 0.14 },
    maxLive: 150,
    sprinkleMult: 0.5,
    decals: {
      textures: ['decal-daisies', 'decal-pink', 'decal-clover', 'decal-tuft', 'decal-tuft', 'decal-pebbles'],
      cell: 150,
      chance: 0.42,
      alpha: 0.9,
    },
    presents: { cell: 560, chance: 0.3 },
  },
  {
    id: 'forest',
    name: 'Grumbly Forest',
    icon: '🌲',
    blurb: 'Darker, busier. Bushes block everything.',
    accent: 0x5fae6a,
    backdrop: 'bg-forest',
    tileScale: 1,
    // Denser from the start and everything arrives sooner than in the meadow.
    waves: [
      { from: 0, to: 200, enemies: ['grumpySnail', 'moodyMoth'], rate: 0.9 },
      { from: 20, to: RUN_END, enemies: ['bumblingBee'], rate: 0.6 },
      { from: 45, to: RUN_END, enemies: ['poutySlime'], rate: 0.5 },
      { from: 75, to: RUN_END, enemies: ['crankyAcorn'], rate: 0.5 },
      { from: 110, to: RUN_END, enemies: ['sadCloud'], rate: 0.4 },
      { from: 150, to: RUN_END, enemies: ['grumpySnail', 'poutySlime', 'crankyAcorn'], rate: 0.75 },
      { from: 200, to: RUN_END, enemies: ['sadCloud', 'moodyMoth', 'bumblingBee'], rate: 0.8 },
      { from: 320, to: RUN_END, enemies: ['crankyAcorn', 'poutySlime'], rate: 0.7 },
    ],
    events: [
      { at: 35, kind: 'ring', enemy: 'moodyMoth', count: 12 },
      { at: 90, kind: 'elite', enemy: 'crankyAcorn' },
      { at: 140, kind: 'miniboss', enemy: 'grumpyGnome' },
      { at: 190, kind: 'stampede', enemy: 'moodyMoth', count: 16 },
      { at: 230, kind: 'ring', enemy: 'poutySlime', count: 14 },
      { at: 270, kind: 'elite', enemy: 'sadCloud' },
      { at: 320, kind: 'miniboss', enemy: 'grumpyGnome' },
      { at: 380, kind: 'stampede', enemy: 'bumblingBee', count: 18 },
      { at: 420, kind: 'banner', text: 'Something is up a tree...', color: P.lemon },
      { at: 440, kind: 'ring', enemy: 'crankyAcorn', count: 16 },
      { at: 480, kind: 'boss' },
    ],
    boss: 'grumpyMonkey',
    bossTime: 480,
    ramp: { hp: 0.55, speed: 0.06, damage: 0.18 },
    maxLive: 160,
    // Twice the meadow's payout: the harder level is how you get rich.
    sprinkleMult: 1,
    obstacles: {
      textures: ['prop-bush', 'prop-bush', 'prop-bush-plain', 'prop-bush-plain', 'prop-stump'],
      cell: 190,
      chance: 0.55,
      radius: 21,
      scale: 1,
    },
    decals: {
      textures: ['decal-leaves', 'decal-leaves', 'decal-mushrooms', 'decal-fern', 'decal-tuft', 'decal-pebbles'],
      cell: 150,
      chance: 0.45,
      alpha: 0.85,
    },
    presents: { cell: 560, chance: 0.32 },
    unlockedBy: 'meadow',
  },
  {
    id: 'peaks',
    name: 'Frosty Peaks',
    icon: '❄️',
    blurb: 'Snowy, slidey, and very chilly Grumps.',
    accent: 0x9ad8ff,
    backdrop: 'bg-peaks',
    tileScale: 1,
    waves: [
      { from: 0, to: 220, enemies: ['snowball', 'frostyFox'], rate: 0.95 },
      { from: 25, to: RUN_END, enemies: ['chillyPenguin'], rate: 0.55 },
      { from: 60, to: RUN_END, enemies: ['frostyFox'], rate: 0.5 },
      { from: 100, to: RUN_END, enemies: ['icyOwl'], rate: 0.24 },
      { from: 150, to: RUN_END, enemies: ['yetiCub'], rate: 0.3 },
      { from: 200, to: RUN_END, enemies: ['snowball', 'chillyPenguin', 'yetiCub'], rate: 0.75 },
      { from: 300, to: RUN_END, enemies: ['frostyFox', 'chillyPenguin', 'snowball'], rate: 0.8 },
      { from: 420, to: RUN_END, enemies: ['yetiCub', 'snowball'], rate: 0.7 },
    ],
    events: [
      { at: 40, kind: 'ring', enemy: 'snowball', count: 12 },
      { at: 100, kind: 'elite', enemy: 'chillyPenguin' },
      { at: 170, kind: 'miniboss', enemy: 'grumpySnowman' },
      { at: 220, kind: 'stampede', enemy: 'frostyFox', count: 16 },
      { at: 270, kind: 'elite', enemy: 'yetiCub' },
      { at: 310, kind: 'ring', enemy: 'chillyPenguin', count: 14 },
      { at: 360, kind: 'miniboss', enemy: 'grumpySnowman' },
      { at: 420, kind: 'stampede', enemy: 'frostyFox', count: 20 },
      { at: 460, kind: 'elite', enemy: 'icyOwl' },
      { at: 500, kind: 'banner', text: 'Somebody important is waddling this way...', color: P.sky },
      { at: 510, kind: 'ring', enemy: 'yetiCub', count: 10 },
      { at: 540, kind: 'boss' },
    ],
    boss: 'admiralWaddles',
    bossTime: 540,
    ramp: { hp: 0.62, speed: 0.06, damage: 0.2 },
    maxLive: 165,
    sprinkleMult: 1.3,
    obstacles: {
      textures: ['prop-snowrock', 'prop-snowrock', 'prop-snowpine', 'prop-icecrystal'],
      cell: 220,
      chance: 0.45,
      radius: 20,
      scale: 1,
    },
    decals: {
      textures: ['decal-snowflakes', 'decal-snowdrift', 'decal-pawprints', 'decal-icecrack', 'decal-snowdrift'],
      cell: 150,
      chance: 0.42,
      alpha: 0.9,
    },
    presents: { cell: 560, chance: 0.32 },
    unlockedBy: 'forest',
  },
  {
    id: 'candy',
    name: 'Candy Carnival',
    icon: '🍭',
    blurb: 'Sweet, sticky, and swarming with sugar.',
    accent: 0xff9ecb,
    backdrop: 'bg-candy',
    tileScale: 1,
    waves: [
      { from: 0, to: 240, enemies: ['gummyBear', 'candyCorn'], rate: 0.95 },
      { from: 25, to: RUN_END, enemies: ['sourJelly'], rate: 0.5 },
      { from: 60, to: RUN_END, enemies: ['candyCorn'], rate: 0.5 },
      { from: 100, to: RUN_END, enemies: ['cottonCloud'], rate: 0.24 },
      { from: 140, to: RUN_END, enemies: ['peppermint'], rate: 0.35 },
      { from: 200, to: RUN_END, enemies: ['gummyBear', 'sourJelly', 'candyCorn'], rate: 0.85 },
      { from: 300, to: RUN_END, enemies: ['peppermint', 'gummyBear', 'sourJelly'], rate: 0.8 },
      { from: 420, to: RUN_END, enemies: ['sourJelly', 'gummyBear'], rate: 0.8 },
    ],
    events: [
      { at: 40, kind: 'ring', enemy: 'gummyBear', count: 12 },
      { at: 100, kind: 'elite', enemy: 'gummyBear' },
      { at: 160, kind: 'stampede', enemy: 'peppermint', count: 16 },
      { at: 180, kind: 'miniboss', enemy: 'gumballGolem' },
      { at: 240, kind: 'ring', enemy: 'sourJelly', count: 14 },
      { at: 280, kind: 'elite', enemy: 'cottonCloud' },
      { at: 330, kind: 'stampede', enemy: 'peppermint', count: 22 },
      { at: 370, kind: 'miniboss', enemy: 'gumballGolem' },
      { at: 440, kind: 'elite', enemy: 'sourJelly' },
      { at: 480, kind: 'stampede', enemy: 'peppermint', count: 26 },
      { at: 500, kind: 'banner', text: 'Can you smell gingerbread?', color: P.gold },
      { at: 510, kind: 'ring', enemy: 'candyCorn', count: 16 },
      { at: 540, kind: 'boss' },
    ],
    boss: 'gingerbreadGiant',
    bossTime: 540,
    ramp: { hp: 0.7, speed: 0.065, damage: 0.22 },
    maxLive: 170,
    sprinkleMult: 1.6,
    obstacles: {
      textures: ['prop-gumdrop', 'prop-gumdrop', 'prop-lollipop', 'prop-cupcakehill'],
      cell: 210,
      chance: 0.48,
      radius: 20,
      scale: 1,
    },
    decals: {
      textures: ['decal-sprinkles', 'decal-sprinkles', 'decal-candies', 'decal-frosting', 'decal-hearts'],
      cell: 150,
      chance: 0.45,
      alpha: 0.9,
    },
    presents: { cell: 540, chance: 0.34 },
    unlockedBy: 'peaks',
  },
  {
    id: 'dream',
    name: 'Starlight Dreamland',
    icon: '🌙',
    blurb: 'The land of dreams. Home of the grumpiest Grump of all.',
    accent: 0xb9a6ff,
    backdrop: 'bg-dream',
    tileScale: 1,
    waves: [
      { from: 0, to: 240, enemies: ['sulkyStar', 'dreamSheep'], rate: 1 },
      { from: 25, to: RUN_END, enemies: ['cometPup'], rate: 0.55 },
      { from: 60, to: RUN_END, enemies: ['dreamSheep'], rate: 0.5 },
      { from: 100, to: RUN_END, enemies: ['grumpyUfo'], rate: 0.28 },
      { from: 150, to: RUN_END, enemies: ['shootingStar'], rate: 0.35 },
      { from: 210, to: RUN_END, enemies: ['sulkyStar', 'cometPup', 'dreamSheep'], rate: 0.9 },
      { from: 320, to: RUN_END, enemies: ['shootingStar', 'sulkyStar', 'cometPup'], rate: 0.85 },
      { from: 450, to: RUN_END, enemies: ['cometPup', 'dreamSheep'], rate: 0.85 },
    ],
    events: [
      { at: 40, kind: 'ring', enemy: 'sulkyStar', count: 12 },
      { at: 100, kind: 'elite', enemy: 'dreamSheep' },
      { at: 150, kind: 'stampede', enemy: 'shootingStar', count: 16 },
      { at: 190, kind: 'miniboss', enemy: 'ursaGrumpus' },
      { at: 250, kind: 'ring', enemy: 'cometPup', count: 14 },
      { at: 300, kind: 'elite', enemy: 'grumpyUfo' },
      { at: 350, kind: 'stampede', enemy: 'shootingStar', count: 22 },
      { at: 400, kind: 'miniboss', enemy: 'ursaGrumpus' },
      { at: 460, kind: 'elite', enemy: 'cometPup' },
      { at: 520, kind: 'stampede', enemy: 'shootingStar', count: 28 },
      { at: 560, kind: 'banner', text: 'The King of all Grumps is awake!', color: P.lavender },
      { at: 570, kind: 'ring', enemy: 'dreamSheep', count: 16 },
      { at: 600, kind: 'boss' },
    ],
    boss: 'kingGrumbleton',
    bossTime: 600,
    ramp: { hp: 0.8, speed: 0.07, damage: 0.24 },
    maxLive: 170,
    sprinkleMult: 2,
    obstacles: {
      textures: ['prop-moonrock', 'prop-moonrock', 'prop-dreamcloud', 'prop-starlamp'],
      cell: 220,
      chance: 0.42,
      radius: 20,
      scale: 1,
    },
    decals: {
      textures: ['decal-stars', 'decal-stars', 'decal-moonflower', 'decal-sparkles', 'decal-crater'],
      cell: 150,
      chance: 0.45,
      alpha: 0.9,
    },
    presents: { cell: 540, chance: 0.34 },
    unlockedBy: 'candy',
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

/** Every mini-boss and elite a level uses, in the order they turn up. Endless mode cycles these. */
export function levelChampions(level: LevelDef): { kind: 'elite' | 'miniboss'; enemy: EnemyId }[] {
  const out: { kind: 'elite' | 'miniboss'; enemy: EnemyId }[] = []
  for (const event of level.events) {
    if (event.kind === 'elite' || event.kind === 'miniboss') out.push({ kind: event.kind, enemy: event.enemy })
  }
  return out
}
