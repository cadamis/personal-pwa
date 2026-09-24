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
  /**
   * Aims at where the player was when it appeared, then keeps going in a
   * straight line — a stampede you step out of the way of, not a chaser.
   */
  | 'swarm'
  /** Doesn't move or hurt. Presents are this. */
  | 'still'

export type EnemyId =
  // meadow & forest
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
  // frosty peaks
  | 'chillyPenguin'
  | 'snowball'
  | 'tinySnowball'
  | 'frostyFox'
  | 'icyOwl'
  | 'yetiCub'
  | 'grumpySnowman'
  | 'admiralWaddles'
  // candy carnival
  | 'gummyBear'
  | 'sourJelly'
  | 'tinyJelly'
  | 'candyCorn'
  | 'cottonCloud'
  | 'peppermint'
  | 'gumballGolem'
  | 'gingerbreadGiant'
  // starlight dreamland
  | 'sulkyStar'
  | 'twinkle'
  | 'dreamSheep'
  | 'grumpyUfo'
  | 'cometPup'
  | 'shootingStar'
  | 'ursaGrumpus'
  | 'kingGrumbleton'
  // not really Grumps
  | 'present'

/**
 * A boss's special attacks, each on its own timer. Every one is telegraphed —
 * the boss flashes and wobbles for a moment first — because a surprise attack
 * a small child couldn't have seen coming isn't a challenge, it's just unfair.
 */
export type BossMove =
  /** A ring of shots in every direction. */
  | { kind: 'burst'; every: number; count: number; speed: number; damage: number; texture: string }
  /** A fan of shots aimed at the player. `arc` is the total spread in radians. */
  | { kind: 'spread'; every: number; count: number; arc: number; speed: number; damage: number; texture: string }
  /** Calls friends. They appear in a ring round the boss. */
  | { kind: 'summon'; every: number; enemy: EnemyId; count: number }
  /** A straight-line charge at where the player was when the telegraph ended. */
  | { kind: 'charge'; every: number; speed: number; duration: number }

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
  /** Sprite scale — 1 is the design size the painter drew it at. */
  scale: number
  behavior: EnemyBehavior
  /** Chance 0..1 of also dropping a sprinkle. */
  sprinkleChance: number
  /** Chance 0..1 of dropping a snack (heal). */
  snackChance?: number
  isBoss?: boolean
  /** Drops a treasure chest when squished. Mini-bosses and bosses. */
  chest?: boolean
  /** Flies over bushes and rocks instead of walking round them. */
  flies?: boolean
  /** For `split`: what it breaks into, and how many. */
  splitInto?: EnemyId
  splitCount?: number
  /** For `shooter`: how it attacks at range. */
  shootCooldown?: number
  shootSpeed?: number
  shootDamage?: number
  /** Shots per volley, fanned `shootSpread` radians apart. */
  shootCount?: number
  shootSpread?: number
  shootTexture?: string
  /** For `dash`: burst multiplier and rhythm. */
  dashSpeed?: number
  dashInterval?: number
  /** Special attacks. See {@link BossMove}. */
  moves?: readonly BossMove[]
}

const ENEMY_LIST: readonly EnemyDef[] = [
  // ------------------------------------------------------------------ meadow
  { id: 'grumpySnail', name: 'Grumpy Snail', texture: 'foe-snail', hp: 17, speed: 34, damage: 6, xp: 2, radius: 15, scale: 1, behavior: 'chase', sprinkleChance: 0.07 },
  { id: 'bumblingBee', name: 'Bumbling Bee', texture: 'foe-bee', hp: 8, speed: 82, damage: 5, xp: 1, radius: 11, scale: 0.9, behavior: 'drift', sprinkleChance: 0.05, flies: true },
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
  { id: 'tinySlime', name: 'Tiny Slime', texture: 'foe-slime', hp: 8, speed: 62, damage: 4, xp: 1, radius: 9, scale: 0.6, behavior: 'chase', sprinkleChance: 0.04 },
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
    flies: true,
    shootCooldown: 2100,
    shootSpeed: 175,
    shootDamage: 8,
    shootTexture: 'proj-raindrop',
  },
  { id: 'moodyMoth', name: 'Moody Moth', texture: 'foe-moth', hp: 11, speed: 70, damage: 5, xp: 2, radius: 12, scale: 0.95, behavior: 'drift', sprinkleChance: 0.07, flies: true },
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
    chest: true,
    moves: [{ kind: 'summon', every: 7000, enemy: 'crankyAcorn', count: 3 }],
  },
  {
    id: 'grumpyMonkey',
    name: 'Grumpy Monkey',
    texture: 'foe-monkey',
    hp: 2000,
    speed: 46,
    damage: 16,
    xp: 110,
    radius: 38,
    scale: 2.3,
    // Monkeys leap. It also gives the fight a rhythm to dodge rather than a
    // constant chase, which matters more when the forest is full of bushes.
    behavior: 'dash',
    sprinkleChance: 1,
    snackChance: 1,
    isBoss: true,
    chest: true,
    dashSpeed: 255,
    dashInterval: 2600,
    moves: [
      { kind: 'spread', every: 4200, count: 5, arc: 0.9, speed: 190, damage: 10, texture: 'proj-banana' },
      { kind: 'summon', every: 10000, enemy: 'crankyAcorn', count: 5 },
    ],
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
    chest: true,
    moves: [
      { kind: 'burst', every: 5500, count: 12, speed: 150, damage: 9, texture: 'proj-fluff' },
      { kind: 'summon', every: 9000, enemy: 'grumpySnail', count: 6 },
    ],
  },

  // ------------------------------------------------------------ frosty peaks
  {
    id: 'chillyPenguin',
    name: 'Chilly Penguin',
    texture: 'foe-penguin',
    hp: 16,
    speed: 38,
    damage: 7,
    xp: 3,
    radius: 13,
    scale: 1,
    behavior: 'dash',
    sprinkleChance: 0.08,
    dashSpeed: 290,
    dashInterval: 1800,
  },
  {
    id: 'snowball',
    name: 'Sniffly Snowball',
    texture: 'foe-snowball',
    hp: 22,
    speed: 44,
    damage: 6,
    xp: 3,
    radius: 15,
    scale: 1,
    behavior: 'split',
    sprinkleChance: 0.09,
    splitInto: 'tinySnowball',
    splitCount: 2,
  },
  { id: 'tinySnowball', name: 'Tiny Snowball', texture: 'foe-snowball', hp: 7, speed: 68, damage: 4, xp: 1, radius: 9, scale: 0.6, behavior: 'chase', sprinkleChance: 0.04 },
  { id: 'frostyFox', name: 'Frosty Fox', texture: 'foe-fox', hp: 10, speed: 92, damage: 5, xp: 2, radius: 12, scale: 1, behavior: 'drift', sprinkleChance: 0.07 },
  {
    id: 'icyOwl',
    name: 'Icy Owl',
    texture: 'foe-owl',
    hp: 22,
    speed: 32,
    damage: 6,
    xp: 4,
    radius: 15,
    scale: 1,
    behavior: 'shooter',
    sprinkleChance: 0.13,
    snackChance: 0.05,
    flies: true,
    shootCooldown: 2900,
    shootSpeed: 165,
    shootDamage: 7,
    shootCount: 2,
    shootSpread: 0.36,
    shootTexture: 'proj-snowflake',
  },
  { id: 'yetiCub', name: 'Yeti Cub', texture: 'foe-yeti', hp: 48, speed: 34, damage: 10, xp: 7, radius: 17, scale: 1.1, behavior: 'chase', sprinkleChance: 0.15, snackChance: 0.04 },
  {
    id: 'grumpySnowman',
    name: 'Grumpy Snowman',
    texture: 'foe-snowman',
    hp: 950,
    speed: 36,
    damage: 18,
    xp: 40,
    radius: 26,
    scale: 1.8,
    behavior: 'chase',
    sprinkleChance: 1,
    snackChance: 1,
    chest: true,
    moves: [
      { kind: 'summon', every: 6000, enemy: 'snowball', count: 4 },
      { kind: 'burst', every: 5000, count: 8, speed: 150, damage: 8, texture: 'proj-snowflake' },
    ],
  },
  {
    id: 'admiralWaddles',
    name: 'Admiral Waddles',
    texture: 'foe-waddles',
    hp: 2400,
    speed: 44,
    damage: 18,
    xp: 130,
    radius: 40,
    scale: 2.4,
    behavior: 'chase',
    sprinkleChance: 1,
    snackChance: 1,
    isBoss: true,
    chest: true,
    moves: [
      { kind: 'charge', every: 4200, speed: 380, duration: 700 },
      { kind: 'burst', every: 5200, count: 14, speed: 160, damage: 9, texture: 'proj-snowflake' },
      { kind: 'summon', every: 9000, enemy: 'chillyPenguin', count: 4 },
    ],
  },

  // ---------------------------------------------------------- candy carnival
  { id: 'gummyBear', name: 'Gummy Bear', texture: 'foe-gummy', hp: 21, speed: 42, damage: 7, xp: 4, radius: 15, scale: 1, behavior: 'chase', sprinkleChance: 0.1 },
  {
    id: 'sourJelly',
    name: 'Sour Jelly',
    texture: 'foe-jelly',
    hp: 24,
    speed: 46,
    damage: 7,
    xp: 4,
    radius: 15,
    scale: 1,
    behavior: 'split',
    sprinkleChance: 0.1,
    splitInto: 'tinyJelly',
    splitCount: 3,
  },
  { id: 'tinyJelly', name: 'Tiny Jelly', texture: 'foe-jelly', hp: 7, speed: 66, damage: 4, xp: 1, radius: 9, scale: 0.55, behavior: 'chase', sprinkleChance: 0.04 },
  {
    id: 'candyCorn',
    name: 'Candy Corn',
    texture: 'foe-candycorn',
    hp: 15,
    speed: 34,
    damage: 8,
    xp: 3,
    radius: 12,
    scale: 1,
    behavior: 'dash',
    sprinkleChance: 0.08,
    dashSpeed: 310,
    dashInterval: 1500,
  },
  {
    id: 'cottonCloud',
    name: 'Cotton Candy Cloud',
    texture: 'foe-cotton',
    hp: 24,
    speed: 30,
    damage: 6,
    xp: 5,
    radius: 17,
    scale: 1,
    behavior: 'shooter',
    sprinkleChance: 0.14,
    snackChance: 0.05,
    flies: true,
    shootCooldown: 2800,
    shootSpeed: 180,
    shootDamage: 7,
    shootCount: 2,
    shootSpread: 0.4,
    shootTexture: 'proj-sprinkleshot',
  },
  { id: 'peppermint', name: 'Peppermint Roller', texture: 'foe-peppermint', hp: 12, speed: 115, damage: 7, xp: 2, radius: 12, scale: 1, behavior: 'swarm', sprinkleChance: 0.06 },
  {
    id: 'gumballGolem',
    name: 'Gumball Golem',
    texture: 'foe-gumball',
    hp: 1100,
    speed: 36,
    damage: 20,
    xp: 45,
    radius: 28,
    scale: 1.8,
    behavior: 'chase',
    sprinkleChance: 1,
    snackChance: 1,
    chest: true,
    moves: [
      { kind: 'burst', every: 5500, count: 10, speed: 165, damage: 8, texture: 'proj-gumball' },
      { kind: 'summon', every: 7000, enemy: 'gummyBear', count: 3 },
    ],
  },
  {
    id: 'gingerbreadGiant',
    name: 'Gingerbread Giant',
    texture: 'foe-gingerbread',
    hp: 2600,
    speed: 42,
    damage: 19,
    xp: 150,
    radius: 42,
    scale: 2.5,
    behavior: 'chase',
    sprinkleChance: 1,
    snackChance: 1,
    isBoss: true,
    chest: true,
    moves: [
      { kind: 'spread', every: 3800, count: 5, arc: 0.7, speed: 200, damage: 9, texture: 'proj-gumball' },
      { kind: 'summon', every: 8000, enemy: 'gummyBear', count: 5 },
      { kind: 'burst', every: 6500, count: 16, speed: 150, damage: 8, texture: 'proj-gumball' },
      { kind: 'charge', every: 7000, speed: 360, duration: 650 },
    ],
  },

  // ----------------------------------------------------- starlight dreamland
  {
    id: 'sulkyStar',
    name: 'Sulky Star',
    texture: 'foe-star',
    hp: 22,
    speed: 50,
    damage: 7,
    xp: 4,
    radius: 14,
    scale: 1,
    behavior: 'split',
    sprinkleChance: 0.1,
    flies: true,
    splitInto: 'twinkle',
    splitCount: 2,
  },
  { id: 'twinkle', name: 'Twinkle', texture: 'foe-star', hp: 7, speed: 76, damage: 4, xp: 1, radius: 9, scale: 0.55, behavior: 'chase', sprinkleChance: 0.04, flies: true },
  { id: 'dreamSheep', name: 'Dream Sheep', texture: 'foe-sheep', hp: 28, speed: 58, damage: 8, xp: 4, radius: 16, scale: 1, behavior: 'drift', sprinkleChance: 0.1, flies: true },
  {
    id: 'grumpyUfo',
    name: 'Grumpy UFO',
    texture: 'foe-ufo',
    hp: 26,
    speed: 34,
    damage: 7,
    xp: 5,
    radius: 16,
    scale: 1,
    behavior: 'shooter',
    sprinkleChance: 0.14,
    snackChance: 0.05,
    flies: true,
    shootCooldown: 2600,
    shootSpeed: 200,
    shootDamage: 8,
    shootCount: 1,
    shootSpread: 0.2,
    shootTexture: 'proj-starshot',
  },
  {
    id: 'cometPup',
    name: 'Comet Pup',
    texture: 'foe-comet',
    hp: 20,
    speed: 38,
    damage: 8,
    xp: 4,
    radius: 13,
    scale: 1,
    behavior: 'dash',
    sprinkleChance: 0.09,
    dashSpeed: 350,
    dashInterval: 1700,
  },
  { id: 'shootingStar', name: 'Shooting Star', texture: 'foe-shooting', hp: 12, speed: 140, damage: 7, xp: 2, radius: 12, scale: 1, behavior: 'swarm', sprinkleChance: 0.06, flies: true },
  {
    id: 'ursaGrumpus',
    name: 'Ursa Grumpus',
    texture: 'foe-ursa',
    hp: 1200,
    speed: 40,
    damage: 22,
    xp: 50,
    radius: 30,
    scale: 1.9,
    behavior: 'chase',
    sprinkleChance: 1,
    snackChance: 1,
    chest: true,
    flies: true,
    moves: [
      { kind: 'burst', every: 4500, count: 12, speed: 170, damage: 9, texture: 'proj-starshot' },
      { kind: 'summon', every: 6500, enemy: 'twinkle', count: 5 },
    ],
  },
  {
    id: 'kingGrumbleton',
    name: 'King Grumbleton',
    texture: 'foe-king',
    hp: 2800,
    speed: 44,
    damage: 20,
    xp: 200,
    radius: 44,
    scale: 2.6,
    behavior: 'chase',
    sprinkleChance: 1,
    snackChance: 1,
    isBoss: true,
    chest: true,
    flies: true,
    moves: [
      { kind: 'burst', every: 5000, count: 18, speed: 160, damage: 9, texture: 'proj-starshot' },
      { kind: 'spread', every: 3200, count: 7, arc: 0.9, speed: 210, damage: 9, texture: 'proj-starshot' },
      { kind: 'summon', every: 8000, enemy: 'sulkyStar', count: 4 },
      { kind: 'charge', every: 6000, speed: 380, duration: 700 },
    ],
  },

  // -------------------------------------------------------------- presents
  // A present is an "enemy" so that every weapon can already hit it; the game
  // skips anything `still` when aiming, counting, chasing or bumping.
  { id: 'present', name: 'Present', texture: 'prop-present-pink', hp: 1, speed: 0, damage: 0, xp: 0, radius: 12, scale: 1, behavior: 'still', sprinkleChance: 0 },
]

export const ENEMIES: Readonly<Record<EnemyId, EnemyDef>> = Object.fromEntries(
  ENEMY_LIST.map((e) => [e.id, e]),
) as Record<EnemyId, EnemyDef>

export const ENEMY_IDS = ENEMY_LIST.map((e) => e.id)

/**
 * Waves run to the hard end of a run rather than to the boss, so a player who
 * beats the boss and keeps going (endless) isn't left wandering an empty level.
 */
export const RUN_END = 1800

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
export const MAX_LIVE_ENEMIES = 170

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
