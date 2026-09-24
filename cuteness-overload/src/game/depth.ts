/**
 * Draw order for everything in a run, bottom to top, in one place so the
 * layering is a decision rather than an accident of scattered numbers.
 *
 * The rule that matters: **Grumps and their shots are on top of everything
 * else.** Obstacles, weapon effects and particles all sit below them, so
 * however busy a fight gets, the things that can hurt you are never hidden.
 * Enemy shots are the very top layer.
 *
 * The one exception is the player, drawn over the Grumps (but under their
 * shots): with Grumps on top, a crowd buries you completely and you lose track
 * of where you are, which is worse than a Grump being partly covered by one
 * small friend.
 */
export const DEPTH = {
  backdrop: -10,
  decals: -9,

  // On the ground
  puddle: 11,
  pickup: 12,
  /** Cuddle Aura and the Rainbow Parasol's dome: big, faint, under the player. */
  aura: 13,
  turret: 14,
  obstacle: 15,
  present: 16,

  // The player's weapons
  shot: 25,
  orbiter: 26,
  weaponFx: 27,
  puffs: 28,
  sparkles: 29,
  bolt: 33,
  shockwave: 34,

  // Grumps and what they throw, above all of that
  telegraph: 39,
  /** Bosses and elites sit under ordinary Grumps: they're big enough to see round them. */
  bigGrump: 40,
  grump: 41,
  crown: 42,
  twinkle: 43,
  zzz: 44,
  // The player, and the Brolly held over them (see above)
  player: 45,
  shield: 46,
  foeShot: 47,
} as const
