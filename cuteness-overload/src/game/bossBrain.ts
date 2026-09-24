/**
 * Special attacks for bosses and mini-bosses.
 *
 * Each {@link BossMove} on a Grump's def runs on its own timer. When one comes
 * due it is *telegraphed* first — the Grump puffs up and wobbles and a ring
 * pulses out of it — and only fires once the telegraph finishes. That wind-up
 * is the whole design: a boss fight for small children has to be a rhythm you
 * can learn, not a surprise.
 *
 * Kept free of Phaser groups: it asks a {@link BossHost} to do the actual
 * spawning, the same way the weapon system does.
 */
import type { EnemyId } from '../data/enemies'
import type { Enemy } from './entities'

/** How long a move is telegraphed before it happens. */
export const TELEGRAPH_MS = 650

export interface BossHost {
  readonly playerX: number
  readonly playerY: number
  fireFoeShot(from: Enemy, angle: number, speed: number, damage: number, texture: string): void
  summon(enemy: EnemyId, count: number, x: number, y: number, radius: number): void
  /** Visual/audio cue that `enemy` is winding up a move. */
  telegraph(enemy: Enemy): void
}

/**
 * Advances `enemy`'s special moves by `dt` ms. Returns true while it's mid-
 * charge, in which case the caller should leave its velocity alone.
 */
export function updateBossMoves(enemy: Enemy, dt: number, host: BossHost): boolean {
  const moves = enemy.def.moves
  if (!moves || moves.length === 0) return false

  if (enemy.chargeLeft > 0) {
    enemy.chargeLeft -= dt
    enemy.body.velocity.set(enemy.chargeX, enemy.chargeY)
    return true
  }

  if (enemy.pendingMove >= 0) {
    enemy.telegraphLeft -= dt
    // Puff up and wobble while winding up.
    const t = 1 - enemy.telegraphLeft / TELEGRAPH_MS
    enemy.setScale(enemy.baseScale * (1 + Math.sin(t * Math.PI * 5) * 0.05 + t * 0.06))
    if (enemy.telegraphLeft <= 0) {
      const move = moves[enemy.pendingMove]
      enemy.pendingMove = -1
      enemy.setScale(enemy.baseScale)
      perform(enemy, move, host)
      return enemy.chargeLeft > 0
    }
    // Stand still to wind up: a charge you can see coming is one you can dodge.
    enemy.body.velocity.scale(0.2)
    return true
  }

  for (let i = 0; i < moves.length; i++) {
    enemy.moveTimers[i] -= dt
    if (enemy.moveTimers[i] > 0 || enemy.pendingMove >= 0) continue
    enemy.moveTimers[i] = moves[i].every
    enemy.pendingMove = i
    enemy.telegraphLeft = TELEGRAPH_MS
    host.telegraph(enemy)
  }
  return false
}

function perform(enemy: Enemy, move: NonNullable<Enemy['def']['moves']>[number], host: BossHost): void {
  const toPlayer = Math.atan2(host.playerY - enemy.y, host.playerX - enemy.x)
  switch (move.kind) {
    case 'burst': {
      const offset = Math.random() * Math.PI * 2
      for (let i = 0; i < move.count; i++) {
        host.fireFoeShot(enemy, offset + (i / move.count) * Math.PI * 2, move.speed, move.damage, move.texture)
      }
      break
    }
    case 'spread': {
      for (let i = 0; i < move.count; i++) {
        const t = move.count === 1 ? 0 : i / (move.count - 1) - 0.5
        host.fireFoeShot(enemy, toPlayer + t * move.arc, move.speed, move.damage, move.texture)
      }
      break
    }
    case 'summon':
      host.summon(move.enemy, move.count, enemy.x, enemy.y, enemy.worldRadius + 24)
      break
    case 'charge':
      enemy.chargeLeft = move.duration
      enemy.chargeX = Math.cos(toPlayer) * move.speed
      enemy.chargeY = Math.sin(toPlayer) * move.speed
      break
  }
}
