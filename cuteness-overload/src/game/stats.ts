/**
 * The single stat block everything in a run reads from.
 *
 * Multiplier stats are 1 = "normal", so every source of upgrades — characters,
 * shop upgrades, in-run passives — can be expressed as the same thing: a bag of
 * additive deltas (`StatMod`). That keeps ordering irrelevant and means no
 * source needs to know about any other.
 */
export interface Stats {
  /** Hit points at full health. */
  maxHp: number
  /** Pixels per second at full tilt. */
  moveSpeed: number
  /** All outgoing damage is multiplied by this. */
  damageMult: number
  /** Weapon cooldowns are *divided* by this, so bigger = faster. */
  hasteMult: number
  /** Scales weapon radii, blast sizes and projectile sprites. */
  areaMult: number
  /** Scales projectile travel speed. */
  projSpeedMult: number
  /** Extra shots per volley, on top of the weapon's own count. */
  extraProjectiles: number
  /** Radius in pixels from which hearts/sprinkles fly to the player. */
  pickupRadius: number
  /** 0..1 chance for a hit to crit. */
  critChance: number
  /** Damage multiplier on a crit. */
  critMult: number
  /** HP regained per second. */
  regen: number
  /** Flat damage subtracted from each hit taken (never below 1 damage). */
  armor: number
  /** Multiplies sprinkles (the meta currency) picked up. */
  sprinkleMult: number
  /** Multiplies XP from hearts. */
  xpMult: number
  /** Extra level-up cards offered, as a fractional chance. */
  luck: number
  /** Free second chances after being squished. */
  revives: number
  /** Level the run starts at. */
  startLevel: number
  /** Multiplies how long lingering things last: turrets, spins, puddles, umbrellas. */
  durationMult: number
  /** Level-up rerolls per run. */
  rerolls: number
  /** Level-up "no thanks" banishes per run. */
  banishes: number
  /** Multiplies how many presents turn up on the floor. */
  presentLuck: number
  /** Better odds of a 3- or 5-prize treasure chest. */
  chestLuck: number
}

/** An additive change to any subset of {@link Stats}. */
export type StatMod = Partial<Record<keyof Stats, number>>

export function baseStats(): Stats {
  return {
    maxHp: 100,
    moveSpeed: 170,
    damageMult: 1,
    hasteMult: 1,
    areaMult: 1,
    projSpeedMult: 1,
    extraProjectiles: 0,
    pickupRadius: 58,
    critChance: 0.05,
    critMult: 2,
    regen: 0,
    armor: 0,
    sprinkleMult: 1,
    xpMult: 1,
    luck: 0,
    revives: 0,
    startLevel: 1,
    durationMult: 1,
    rerolls: 0,
    banishes: 0,
    presentLuck: 1,
    chestLuck: 0,
  }
}

/** Adds every delta in `mods` into `stats`, in place. */
export function applyMods(stats: Stats, ...mods: (StatMod | undefined)[]): Stats {
  for (const mod of mods) {
    if (!mod) continue
    for (const key of Object.keys(mod) as (keyof Stats)[]) {
      stats[key] += mod[key] ?? 0
    }
  }
  return stats
}

/** Sums the first `level` entries of a per-level table into one mod. */
export function modsUpToLevel(perLevel: readonly StatMod[], level: number): StatMod {
  const total: StatMod = {}
  for (let i = 0; i < Math.min(level, perLevel.length); i++) {
    for (const key of Object.keys(perLevel[i]) as (keyof Stats)[]) {
      total[key] = (total[key] ?? 0) + (perLevel[i][key] ?? 0)
    }
  }
  return total
}

/** Clamps stats that would break the game if a stacking combo went too far. */
export function clampStats(stats: Stats): Stats {
  stats.critChance = Math.min(stats.critChance, 0.9)
  stats.hasteMult = Math.min(stats.hasteMult, 4)
  stats.moveSpeed = Math.min(stats.moveSpeed, 420)
  stats.areaMult = Math.min(stats.areaMult, 3)
  stats.durationMult = Math.min(stats.durationMult, 3)
  stats.extraProjectiles = Math.min(stats.extraProjectiles, 6)
  return stats
}

/**
 * XP needed to go from `level` to `level + 1`. Deliberately gentle early on —
 * the first card should land within the first few seconds, because waiting a
 * minute for your first choice is a miserable way to start a run.
 *
 * Tuned so a decent run is somewhere in the high thirties by the boss: enough
 * level-ups to max a weapon *and* find its buddy passive, which is what lets
 * the mid-run chests turn into evolutions.
 */
export function xpToNext(level: number): number {
  return Math.round(4 + level * 3 + level * level * 0.42)
}

/**
 * How much tougher Grumps are at `seconds` into a run, given a level's ramp.
 * Applied as a multiplier when one is spawned, so a level's difficulty arc needs
 * no per-wave stat tables.
 */
export function difficultyAt(
  seconds: number,
  ramp: { hp: number; speed: number; damage: number },
): { hp: number; speed: number; damage: number } {
  const minutes = seconds / 60
  return {
    hp: 1 + minutes * ramp.hp,
    speed: 1 + minutes * ramp.speed,
    damage: 1 + minutes * ramp.damage,
  }
}
