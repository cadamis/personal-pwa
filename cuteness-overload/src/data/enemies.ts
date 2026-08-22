/**
 * The Grumps: cute creatures having a bad day. Stats here are the level-1
 * baseline; {@link difficultyAt} scales them as the run goes on.
 */

export type EnemyBehavior =
  /** Beelines for the player. */
  | 'chase'
  /** Pauses, then dashes in a straight line. */
  | 'dash'
  /** Keeps its distance and lobs a projectile. */
  | 'shooter'
  /** Chases, and breaks into smaller Grumps when squished. */
  | 'split'
  /** Wanders vaguely playerwards, never quite committing. */
  | 'drift'

export type EnemyId =
  | 'grumpySnail'
  | 'bumblingBee'
  | 'poutySlime'
  | 'tinySlime'
  | 'crankyAcorn'
  | 'sadCloud'
  | 'moodyMoth'
  | 'grumpyGnome'
  | 'sirFluffington'
  | 'grumpyMonkey'

export interface EnemyDef {
  id: EnemyId
  name: string
  texture: string
  hp: number
  /** Pixels per second. */
  speed: number
  /** Damage dealt on contact. */
  damage: number
  /** XP dropped as a Friendship Heart. */
  xp: number
  /** Physics body radius, before `scale`. */
  radius: number
  /** Sprite scale — the art is drawn at 2x and displayed at 0.5, so 1 = normal. */
  scale: number
  behavior: EnemyBehavior
  /** Chance 0..1 of also dropping a sprinkle. */
  sprinkleChance: number
  /** Chance 0..1 of dropping a snack (heal). */
  snackChance?: number
  isBoss?: boolean
  /** For `split`: what it breaks into, and how many. */
  splitInto?: EnemyId
  splitCount?: number
  /** For `shooter`: how it attacks at range. */
  shootCooldown?: number
  shootSpeed?: number
  shootDamage?: number
  /** For `dash`: burst multiplier and rhythm. */
  dashSpeed?: number
  dashInterval?: number
}

const ENEMY_LIST: readonly EnemyDef[] = [
  {
    id: 'grumpySnail',
    name: 'Grumpy Snail',
    texture: 'foe-snail',
    hp: 17,
    speed: 34,
    damage: 6,
    xp: 2,
    radius: 15,
    scale: 1,
    behavior: 'chase',
    sprinkleChance: 0.07,
  },
  {
    id: 'bumblingBee',
    name: 'Bumbling Bee',
    texture: 'foe-bee',
    hp: 8,
    speed: 82,
    damage: 5,
    xp: 1,
    radius: 11,
    scale: 0.9,
    behavior: 'drift',
    sprinkleChance: 0.05,
  },
  {
    id: 'poutySlime',
    name: 'Pouty Slime',
    texture: 'foe-slime',
    hp: 24,
    speed: 46,
    damage: 7,
    xp: 3,
    radius: 16,
    scale: 1.05,
    behavior: 'split',
    sprinkleChance: 0.1,
    splitInto: 'tinySlime',
    splitCount: 2,
  },
  {
    id: 'tinySlime',
    name: 'Tiny Slime',
    texture: 'foe-slime',
    hp: 8,
    speed: 62,
    damage: 4,
    xp: 1,
    radius: 9,
    scale: 0.6,
    behavior: 'chase',
    sprinkleChance: 0.04,
  },
  {
    id: 'crankyAcorn',
    name: 'Cranky Acorn',
    texture: 'foe-acorn',
    hp: 14,
    speed: 30,
    damage: 8,
    xp: 3,
    radius: 12,
    scale: 0.95,
    behavior: 'dash',
    sprinkleChance: 0.08,
    dashSpeed: 235,
    dashInterval: 1700,
  },
  {
    id: 'sadCloud',
    name: 'Sad Cloud',
    texture: 'foe-cloud',
    hp: 26,
    speed: 30,
    damage: 6,
    xp: 4,
    radius: 17,
    scale: 1.05,
    behavior: 'shooter',
    sprinkleChance: 0.14,
    snackChance: 0.05,
    shootCooldown: 2100,
    shootSpeed: 175,
    shootDamage: 8,
  },
  {
    id: 'moodyMoth',
    name: 'Moody Moth',
    texture: 'foe-moth',
    hp: 11,
    speed: 70,
    damage: 5,
    xp: 2,
    radius: 12,
    scale: 0.95,
    behavior: 'drift',
    sprinkleChance: 0.07,
  },
  {
    id: 'grumpyGnome',
    name: 'Grumpy Gnome',
    texture: 'foe-gnome',
    hp: 340,
    speed: 44,
    damage: 14,
    xp: 30,
    radius: 26,
    scale: 1.7,
    behavior: 'chase',
    sprinkleChance: 1,
    snackChance: 1,
  },
  {
    id: 'grumpyMonkey',
    name: 'Grumpy Monkey',
    texture: 'foe-monkey',
    hp: 2600,
    speed: 46,
    damage: 20,
    xp: 110,
    radius: 38,
    scale: 2.3,
    // Monkeys leap. It also gives the fight a rhythm to dodge rather than a
    // constant chase, which matters more when the forest is full of bushes.
    behavior: 'dash',
    sprinkleChance: 1,
    snackChance: 1,
    isBoss: true,
    dashSpeed: 290,
    dashInterval: 2100,
  },
  {
    id: 'sirFluffington',
    name: 'Sir Fluffington',
    texture: 'foe-fluffington',
    hp: 1700,
    speed: 42,
    damage: 18,
    xp: 90,
    radius: 40,
    scale: 2.4,
    behavior: 'chase',
    sprinkleChance: 1,
    snackChance: 1,
    isBoss: true,
  },
]

export const ENEMIES: Readonly<Record<EnemyId, EnemyDef>> = Object.fromEntries(
  ENEMY_LIST.map((e) => [e.id, e]),
) as Record<EnemyId, EnemyDef>

export const ENEMY_IDS = ENEMY_LIST.map((e) => e.id)

/**
 * Waves run to the hard end of a run rather than to the boss, so a player who
 * doesn't beat the boss isn't left wandering an empty level.
 */
export const RUN_END = 600

export interface Wave {
  /** Seconds into the run this wave starts and stops contributing spawns. */
  from: number
  to: number
  enemies: readonly EnemyId[]
  /** Spawns per second across the whole wave. */
  rate: number
}

/**
 * The most Grumps any level may have alive at once — a tablet has to draw them
 * all. Individual levels can ask for fewer.
 */
export const MAX_LIVE_ENEMIES = 150

/** Total spawn rate at `seconds` for one level's wave table, and its pool. */
export function activeWaves(seconds: number, waves: readonly Wave[]): { rate: number; pool: EnemyId[] } {
  let rate = 0
  const pool: EnemyId[] = []
  for (const wave of waves) {
    if (seconds >= wave.from && seconds < wave.to) {
      rate += wave.rate
      pool.push(...wave.enemies)
    }
  }
  return { rate, pool }
}
