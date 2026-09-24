/**
 * Runs the player's weapons: ticks cooldowns and turns each cast into requests
 * on a {@link WeaponHost} (in practice, the GameScene).
 *
 * The host interface exists so this file never has to know about Phaser groups,
 * cameras or pooling — it just says "fire a homing shot like this" and the scene
 * works out where that sprite comes from.
 */
import type Phaser from 'phaser'
import type { Stats } from './stats'
import type { Enemy, ShotMode } from './entities'
import type { Inventory } from './loadout'
import { WEAPONS, weaponLevel, type WeaponBehavior, type WeaponId, type WeaponLevel } from '../data/weapons'

export interface ShotRequest {
  texture: string
  x: number
  y: number
  vx: number
  vy: number
  damage: number
  pierce: number
  lifespan: number
  scale: number
  mode: ShotMode
  spin?: number
  faceTravel?: boolean
  outRange?: number
  target?: Enemy | null
}

export interface OrbiterRequest {
  weaponId: WeaponId
  texture: string
  angle: number
  radius: number
  angularSpeed: number
  damage: number
  lifespan: number
  scale: number
  spin?: number
  hitCooldown: number
}

export interface ShieldRequest {
  weaponId: WeaponId
  texture: string
  lifespan: number
  blockRadius: number
  offset: number
  scale: number
  /** Domes only: damage per pulse to Grumps inside. */
  damage: number
  dome: boolean
}

export interface TurretRequest {
  x: number
  y: number
  lifespan: number
  cooldown: number
  damage: number
  shotSpeed: number
  shotScale: number
  pierce: number
  texture: string
  shotTexture: string
}

export interface PuddleRequest {
  x: number
  y: number
  radius: number
  damage: number
  lifespan: number
  texture: string
}

export interface WeaponHost {
  readonly stats: Stats
  readonly playerX: number
  readonly playerY: number
  /** Unit vector of the way the player is facing (last movement direction). */
  readonly facing: { x: number; y: number }
  /** The camera's world view, used for rain and off-screen aiming. */
  readonly view: Phaser.Geom.Rectangle
  /** Up to `count` live Grumps, nearest first. */
  nearestEnemies(x: number, y: number, count: number, maxDist?: number): Enemy[]
  /** Up to `count` different live Grumps on screen, in no particular order. */
  randomEnemiesInView(count: number): Enemy[]
  fireShot(req: ShotRequest): void
  addOrbiter(req: OrbiterRequest): void
  clearOrbiters(weaponId: WeaponId): void
  addTurret(req: TurretRequest): void
  addShield(req: ShieldRequest): void
  addPuddle(req: PuddleRequest): void
  /** Instant damage in a cone: `spread` radians either side of `angle`. */
  castArc(x: number, y: number, angle: number, radius: number, spread: number, damage: number, texture: string): void
  castNova(x: number, y: number, radius: number, damage: number, texture: string): void
  castBeam(x: number, y: number, angle: number, length: number, halfWidth: number, damage: number, texture: string): void
  /** Damages everything within `radius` of the player; heals `heal` if it touched anything. */
  castAura(radius: number, damage: number, heal: number): void
  castStrike(x: number, y: number, radius: number, damage: number, texture: string): void
  /** Shows (or hides, with radius 0) the persistent glow for an aura weapon. */
  setAura(weaponId: WeaponId, radius: number, texture: string): void
  /** Schedules `fn` after `delay` ms, cancelled automatically if the scene ends. */
  later(delay: number, fn: () => void): void
}

interface Runtime {
  id: WeaponId
  level: number
  /** ms until the next cast. */
  timer: number
}

/** Area upgrades are dampened for projectile *sprites* so shots stay readable. */
function projScale(base: number, areaMult: number): number {
  return base * (1 + (areaMult - 1) * 0.55)
}

const TAU = Math.PI * 2

/**
 * Cast-to-cast time. A shield's `cooldown` is the wait *after* it closes, so its
 * cycle also has to cover the time it spends open.
 */
function cycleMs(behavior: WeaponBehavior, level: WeaponLevel, durationMult: number): number {
  return behavior === 'shield' ? level.cooldown + (level.duration ?? 0) * durationMult : level.cooldown
}

export class WeaponSystem {
  private runtimes: Runtime[] = []

  constructor(private readonly host: WeaponHost) {}

  /**
   * Rebuilds the runtime list from the inventory, keeping cooldown progress for
   * weapons that were already there, and re-forms the permanent orbit rings and
   * aura glows so they pick up new levels, evolutions and area upgrades.
   */
  sync(inventory: Inventory): void {
    const previous = new Map(this.runtimes.map((r) => [r.id, r]))
    for (const old of this.runtimes) {
      const stillOwned = inventory.weapons.some((w) => w.id === old.id)
      if (stillOwned) continue
      // Evolved away: take down whatever the old weapon left running.
      if (WEAPONS[old.id].behavior === 'orbit') this.host.clearOrbiters(old.id)
      if (WEAPONS[old.id].behavior === 'aura') this.host.setAura(old.id, 0, '')
    }
    this.runtimes = inventory.weapons.map((owned) => ({
      id: owned.id,
      level: owned.level,
      timer: previous.get(owned.id)?.timer ?? 120,
    }))
    const { stats } = this.host
    for (const runtime of this.runtimes) {
      const def = WEAPONS[runtime.id]
      if (def.behavior === 'orbit') this.formOrbit(runtime)
      if (def.behavior === 'aura') {
        const level = weaponLevel(runtime.id, runtime.level)
        this.host.setAura(runtime.id, level.area * stats.areaMult, def.fx ?? 'fx-aura')
      }
    }
  }

  update(deltaMs: number): void {
    const haste = Math.max(0.2, this.host.stats.hasteMult)
    const durationMult = this.host.stats.durationMult
    for (const runtime of this.runtimes) {
      if (WEAPONS[runtime.id].behavior === 'orbit') continue
      runtime.timer -= deltaMs
      if (runtime.timer > 0) continue
      const level = weaponLevel(runtime.id, runtime.level)
      const cycle = cycleMs(WEAPONS[runtime.id].behavior, level, durationMult) / haste
      runtime.timer += cycle
      // A very long pause (tab hidden, level-up screen) shouldn't fire a dozen
      // casts the instant play resumes.
      if (runtime.timer < 0) runtime.timer = cycle
      this.cast(runtime)
    }
  }

  private cast(runtime: Runtime): void {
    const def = WEAPONS[runtime.id]
    const level = weaponLevel(runtime.id, runtime.level)
    const { stats, playerX: px, playerY: py, facing } = this.host
    const damage = level.damage * stats.damageMult
    const speed = level.speed * stats.projSpeedMult
    const facingAngle = Math.atan2(facing.y, facing.x)
    const extra = stats.extraProjectiles
    const isKitten = def.texture.startsWith('proj-kitten')
    /**
     * Directional weapons point at the nearest Grump rather than wherever the
     * player last walked — standing still shouldn't mean swiping at thin air,
     * and nobody aims manually in this game.
     */
    const aimAngle = (): number => {
      const [nearest] = this.host.nearestEnemies(px, py, 1, 420)
      return nearest ? Math.atan2(nearest.y - py, nearest.x - px) : facingAngle
    }

    switch (def.behavior) {
      case 'homing': {
        const count = level.count + extra
        const targets = this.host.nearestEnemies(px, py, count, 330)
        for (let i = 0; i < count; i++) {
          const target = targets.length > 0 ? targets[i % targets.length] : null
          const angle = target
            ? Math.atan2(target.y - py, target.x - px)
            : facingAngle + (i - count / 2) * 0.22
          this.host.fireShot({
            texture: def.texture,
            x: px,
            y: py,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            damage,
            pierce: level.pierce,
            lifespan: 3200,
            scale: projScale(level.area, stats.areaMult),
            mode: 'homing',
            faceTravel: isKitten,
            spin: isKitten ? 0 : 90,
            target,
          })
        }
        break
      }

      case 'aimed': {
        const count = level.count + extra
        const targets = this.host.nearestEnemies(px, py, count, 330)
        for (let i = 0; i < count; i++) {
          const target = targets.length > 0 ? targets[i % targets.length] : null
          // Fanned out slightly when there's nothing to aim at, so a volley
          // fired into empty meadow still covers some ground.
          const angle = target
            ? Math.atan2(target.y - py, target.x - px)
            : facingAngle + (i - (count - 1) / 2) * 0.2
          this.host.fireShot({
            texture: def.texture,
            x: px,
            y: py,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            damage,
            pierce: level.pierce,
            // Shorter-lived than a homing shot: it can't correct, so letting it
            // fly forever would just add clutter.
            lifespan: 1800,
            scale: projScale(level.area, stats.areaMult),
            mode: 'straight',
            spin: 90,
          })
        }
        break
      }

      case 'arc': {
        const radius = level.area * stats.areaMult
        const aim = aimAngle()
        for (let i = 0; i < level.count; i++) {
          this.host.castArc(px, py, aim + (i * TAU) / level.count, radius, 0.75, damage, def.fx ?? 'fx-swipe')
        }
        break
      }

      case 'orbit':
        // Handled entirely by formOrbit(); satellites never expire.
        break

      case 'spin': {
        const count = level.count + extra
        const radius = level.area * stats.areaMult
        // A spin lasts its duration, but never longer than the gap to the next
        // cast: once duration catches up with the cooldown the ring simply
        // stays up (like Vampire Survivors' bible), rather than stacking copies
        // that would crowd every other orbiting weapon out of the pool.
        const cycle = level.cooldown / Math.max(0.2, stats.hasteMult)
        const lifespan = Math.min((level.duration ?? 1600) * stats.durationMult, cycle) + 60
        for (let i = 0; i < count; i++) {
          this.host.addOrbiter({
            weaponId: runtime.id,
            texture: def.texture,
            angle: (i / count) * TAU,
            radius,
            angularSpeed: (level.speed * Math.PI) / 180,
            damage,
            // The +60 overlaps the next cast slightly, so a ring that's always
            // up never flickers off between casts.
            lifespan,
            scale: 1,
            spin: 220,
            hitCooldown: 300,
          })
        }
        break
      }

      case 'boomerang': {
        const count = level.count + extra
        const aim = aimAngle()
        for (let i = 0; i < count; i++) {
          const angle = aim + (i - (count - 1) / 2) * 0.42
          this.host.fireShot({
            texture: def.texture,
            x: px,
            y: py,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            damage,
            pierce: level.pierce,
            lifespan: 5000,
            scale: projScale(level.area, stats.areaMult),
            mode: 'boomerang',
            spin: 420,
            outRange: (level.duration ?? 200) * stats.areaMult,
          })
        }
        break
      }

      case 'nova': {
        const radius = level.area * stats.areaMult
        const texture = def.fx ?? 'fx-nova'
        this.host.castNova(px, py, radius, damage, texture)
        for (let i = 1; i < level.count; i++) {
          this.host.later(200 * i, () => this.host.castNova(this.host.playerX, this.host.playerY, radius, damage, texture))
        }
        break
      }

      case 'beam': {
        const count = level.count + extra
        const targets = this.host.nearestEnemies(px, py, count, 900)
        const length = 620 * (1 + (stats.areaMult - 1) * 0.4)
        const halfWidth = level.area * stats.areaMult
        for (let i = 0; i < count; i++) {
          const target = targets.length > 0 ? targets[i % targets.length] : null
          const angle = target
            ? Math.atan2(target.y - py, target.x - px)
            : facingAngle + (i - (count - 1) / 2) * 0.5
          this.host.castBeam(px, py, angle, length, halfWidth, damage, def.fx ?? 'fx-beam')
        }
        break
      }

      case 'turret': {
        for (let i = 0; i < level.count; i++) {
          const angle = Math.random() * TAU
          this.host.addTurret({
            x: px + Math.cos(angle) * 26 * i,
            y: py + Math.sin(angle) * 26 * i,
            lifespan: (level.duration ?? 5000) * stats.durationMult,
            cooldown: (level.rate ?? 820) / Math.max(0.2, stats.hasteMult),
            damage,
            shotSpeed: speed,
            shotScale: projScale(level.area, stats.areaMult),
            pierce: level.pierce,
            texture: def.prop ?? 'prop-cupcake',
            shotTexture: def.texture,
          })
        }
        break
      }

      case 'bounce': {
        const count = level.count + extra
        const aim = aimAngle()
        for (let i = 0; i < count; i++) {
          const angle = aim + (i / count) * TAU + Math.random() * 0.3
          this.host.fireShot({
            texture: def.texture,
            x: px,
            y: py,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            damage,
            pierce: level.pierce,
            lifespan: (level.duration ?? 4000) * stats.durationMult,
            scale: projScale(level.area, stats.areaMult),
            mode: 'bounce',
            spin: 160,
          })
        }
        break
      }

      case 'shield': {
        // Always exactly one umbrella: extra projectiles would scatter it into
        // several, which isn't what an umbrella is for.
        const dome = def.dome === true
        this.host.addShield({
          weaponId: runtime.id,
          texture: def.texture,
          lifespan: (level.duration ?? 1000) * stats.durationMult,
          blockRadius: level.area * stats.areaMult,
          offset: dome ? 0 : 26 * Math.min(1.4, stats.areaMult),
          scale: dome ? (level.area * stats.areaMult) / 40 : Math.min(1.5, stats.areaMult),
          damage: dome ? damage : 0,
          dome,
        })
        break
      }

      case 'rain': {
        const count = level.count + extra
        const view = this.host.view
        for (let i = 0; i < count; i++) {
          const x = view.x + Math.random() * view.width
          const y = view.y - 40 - Math.random() * 140
          this.host.fireShot({
            texture: def.texture,
            x,
            y,
            vx: (Math.random() - 0.5) * 50,
            vy: speed,
            damage,
            pierce: level.pierce,
            lifespan: 6000,
            scale: projScale(level.area, stats.areaMult),
            mode: 'rain',
            spin: 260,
          })
        }
        break
      }

      case 'aura':
        this.host.castAura(level.area * stats.areaMult, damage, def.heal ?? 0)
        break

      case 'strike': {
        const count = level.count + extra
        const radius = level.area * stats.areaMult
        const texture = def.fx ?? 'fx-zap'
        const targets = this.host.randomEnemiesInView(count)
        targets.forEach((target, i) => {
          // Staggered a touch so a volley crackles rather than landing as one flash.
          this.host.later(i * 70, () => {
            if (target.active) this.host.castStrike(target.x, target.y, radius, damage, texture)
          })
        })
        break
      }

      case 'puddle': {
        const count = level.count + extra
        const radius = level.area * stats.areaMult
        const near = this.host.nearestEnemies(px, py, count, 260)
        for (let i = 0; i < count; i++) {
          const target = near[i]
          const angle = Math.random() * TAU
          const dist = 60 + Math.random() * 120
          this.host.addPuddle({
            x: target ? target.x : px + Math.cos(angle) * dist,
            y: target ? target.y : py + Math.sin(angle) * dist,
            radius,
            damage,
            lifespan: (level.duration ?? 2500) * stats.durationMult,
            texture: def.fx ?? 'fx-puddle',
          })
        }
        break
      }
    }
  }

  /** (Re)builds the permanent satellites for an orbit weapon. */
  private formOrbit(runtime: Runtime): void {
    const def = WEAPONS[runtime.id]
    const level = weaponLevel(runtime.id, runtime.level)
    const { stats } = this.host
    const count = level.count + stats.extraProjectiles
    const rings = def.rings ?? 1
    this.host.clearOrbiters(runtime.id)
    for (let i = 0; i < count; i++) {
      // With two rings, odd satellites go on a tighter inner ring spinning the
      // other way, which covers far more ground than one bigger ring would.
      const ring = rings > 1 ? i % 2 : 0
      const onRing = rings > 1 ? Math.ceil((count - ring) / 2) : count
      const index = rings > 1 ? Math.floor(i / 2) : i
      this.host.addOrbiter({
        weaponId: runtime.id,
        texture: def.texture,
        angle: (index / onRing) * TAU + ring * 0.4,
        radius: level.area * stats.areaMult * (ring === 1 ? 0.58 : 1),
        angularSpeed: ((level.speed * Math.PI) / 180) * (ring === 1 ? -1.25 : 1),
        damage: level.damage * stats.damageMult,
        lifespan: Infinity,
        scale: 1,
        spin: def.texture.startsWith('proj-spike') ? 180 : 0,
        hitCooldown: level.cooldown / Math.max(0.2, stats.hasteMult),
      })
    }
  }
}
