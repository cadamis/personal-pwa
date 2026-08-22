/**
 * What lives in the wood.
 *
 * Two shapes to start with, deliberately contrasting so the forest can't be
 * fought one way: the husk punishes standing still, the stalker punishes
 * backing off in a straight line.
 */
import type { EnemyType } from '../world/areas'

export interface EnemyStats {
  type: EnemyType
  name: string
  /** Texture key. */
  texture: string
  health: number
  /** Chase speed, world px/sec. */
  speed: number
  damage: number
  /** How close the player has to get before it wakes up. */
  aggroRadius: number
  /** How far it will chase from where it woke up before giving up. */
  leash: number
  /** Physics body radius, px. */
  bodyRadius: number
  /** Knockback taken per hit, px/sec. */
  knockback: number
  displayHeight: number
  /**
   * Lunge behaviour, for the ones that have it: every `everyMs` while chasing,
   * commit to a burst toward wherever the player was standing.
   */
  lunge?: { everyMs: number; speed: number; durationMs: number; windupMs: number }
}

export const ENEMY_STATS: Record<EnemyType, EnemyStats> = {
  husk: {
    type: 'husk',
    name: 'Husk',
    texture: 'husk',
    health: 6,
    speed: 66,
    damage: 1,
    aggroRadius: 200,
    leash: 420,
    bodyRadius: 13,
    knockback: 190,
    displayHeight: 56,
  },
  stalker: {
    type: 'stalker',
    name: 'Stalker',
    texture: 'stalker',
    health: 4,
    speed: 118,
    damage: 1,
    aggroRadius: 300,
    leash: 620,
    bodyRadius: 15,
    knockback: 260,
    displayHeight: 46,
    lunge: { everyMs: 2400, speed: 430, durationMs: 260, windupMs: 260 },
  },
}
