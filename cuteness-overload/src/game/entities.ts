/**
 * Pooled game objects. These are deliberately dumb: they hold state and know
 * how to reset themselves, but all steering, collision response and lifetime
 * logic lives in {@link GameScene}, which is the only thing with the whole
 * picture. That keeps the hot per-frame loops in one readable place.
 */
import Phaser from 'phaser'
import { ART_SCALE } from '../art/textures'
import { ENEMIES, type EnemyDef } from '../data/enemies'
import type { WeaponId } from '../data/weapons'

let uidCounter = 1
/** Monotonic id used to remember "this shot already hit that Grump". */
export function nextUid(): number {
  return uidCounter++
}

/**
 * Gives `sprite` a circular body of `worldRadius` px, centred on the sprite.
 *
 * Arcade bodies are sized in *texture* pixels and then multiplied by the
 * sprite's scale, and the offset is measured from the frame's top-left — so
 * neither value is the world radius you actually want. This converts once,
 * here, instead of at every call site.
 */
export function setCircleBody(sprite: Phaser.Physics.Arcade.Sprite, worldRadius: number): void {
  const body = sprite.body as Phaser.Physics.Arcade.Body | null
  if (!body) return
  const scale = Math.abs(sprite.scaleX) || 1
  const sourceRadius = worldRadius / scale
  body.setCircle(sourceRadius, sprite.frame.width / 2 - sourceRadius, sprite.frame.height / 2 - sourceRadius)
}

// ------------------------------------------------------------------- Grumps

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body

  uid = 0
  def: EnemyDef = ENEMIES.grumpySnail
  hp = 1
  maxHp = 1
  /** Pixels per second, after difficulty scaling. */
  speed = 0
  contactDamage = 0
  xpValue = 0
  /** Counts down the behaviour beat (dash wind-up, shot cooldown). */
  behaviorTimer = 0
  /** True while a dasher is mid-lunge. */
  dashing = false
  driftAngle = 0
  /** ms of knockback left; steering is suspended while it runs. */
  knockTimer = 0
  /** Game time before which this Grump can't bump the player again. */
  nextTouchAt = 0
  /** ms left of sidestepping around an obstacle it walked into. */
  detourTimer = 0
  /** Which way it sidesteps, so a crowd splits around a bush instead of piling. */
  detourSign = 1
  flashTimer = 0
  worldRadius = 10

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'foe-snail')
    this.setOrigin(0.5, 0.5)
  }

  spawn(def: EnemyDef, x: number, y: number, diff: { hp: number; speed: number; damage: number }): void {
    this.uid = nextUid()
    this.def = def
    this.setTexture(def.texture)
    this.setScale(def.scale * ART_SCALE)
    this.setRotation(0)
    this.setAlpha(1)
    this.clearTint()
    this.setDepth(20)
    this.maxHp = Math.round(def.hp * diff.hp)
    this.hp = this.maxHp
    this.speed = def.speed * diff.speed
    this.contactDamage = Math.round(def.damage * diff.damage)
    this.xpValue = def.xp
    this.behaviorTimer = def.behavior === 'dash' ? (def.dashInterval ?? 1800) * Math.random() : 0
    this.dashing = false
    this.driftAngle = Math.random() * Math.PI * 2
    this.knockTimer = 0
    this.nextTouchAt = 0
    this.detourTimer = 0
    this.flashTimer = 0
    this.worldRadius = def.radius * def.scale

    this.enableBody(true, x, y, true, true)
    setCircleBody(this, this.worldRadius)
    this.body.setVelocity(0, 0)
    this.body.setBounce(0, 0)
    this.body.setDrag(0, 0)
  }

  retire(): void {
    this.disableBody(true, true)
  }
}

// ------------------------------------------------------------------- shots

export type ShotMode = 'straight' | 'homing' | 'boomerang' | 'bounce' | 'rain'

export class Shot extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body

  mode: ShotMode = 'straight'
  damage = 0
  pierceLeft = 0
  /** ms of life left. */
  lifespan = 0
  speed = 0
  /** Visual spin, degrees per second. */
  spin = 0
  /** Radians per second a homing shot can turn. */
  turnRate = 2.6
  target: Enemy | null = null
  /** Boomerangs travel this far before turning around. */
  outRange = 0
  outTravelled = 0
  returning = false
  /** True once the shot should face its direction of travel. */
  faceTravel = false
  hitUids = new Set<number>()

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'proj-bubble')
    this.setOrigin(0.5, 0.5)
  }

  launch(cfg: {
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
    depth?: number
  }): void {
    this.mode = cfg.mode
    this.damage = cfg.damage
    this.pierceLeft = cfg.pierce
    this.lifespan = cfg.lifespan
    this.speed = Math.hypot(cfg.vx, cfg.vy)
    this.spin = cfg.spin ?? 0
    this.faceTravel = cfg.faceTravel ?? false
    this.outRange = cfg.outRange ?? 0
    this.outTravelled = 0
    this.returning = false
    this.target = cfg.target ?? null
    this.hitUids.clear()

    this.setTexture(cfg.texture)
    this.setScale(cfg.scale * ART_SCALE)
    this.setAlpha(1)
    this.setDepth(cfg.depth ?? 25)
    this.setRotation(this.faceTravel ? Math.atan2(cfg.vy, cfg.vx) : 0)

    this.enableBody(true, cfg.x, cfg.y, true, true)
    setCircleBody(this, Math.max(5, this.displayWidth * 0.42))
    this.body.setVelocity(cfg.vx, cfg.vy)
  }

  retire(): void {
    this.target = null
    this.disableBody(true, true)
  }
}

// ----------------------------------------------------------------- pickups

export type PickupKind = 'heart' | 'sprinkle' | 'snack'

const PICKUP_TEXTURE: Record<PickupKind, string> = {
  heart: 'pick-heart',
  sprinkle: 'pick-sprinkle',
  snack: 'pick-snack',
}

export class Pickup extends Phaser.GameObjects.Sprite {
  kind: PickupKind = 'heart'
  value = 1
  /** ms until it fades away, so the meadow doesn't fill up with litter. */
  lifespan = 0
  bobPhase = 0
  homeX = 0
  homeY = 0
  /** True once it's flying to the player and can't be un-magnetised. */
  chasing = false

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'pick-heart')
    this.setOrigin(0.5, 0.5)
  }

  drop(kind: PickupKind, x: number, y: number, value: number): void {
    this.kind = kind
    this.value = value
    this.lifespan = kind === 'sprinkle' ? 30000 : 22000
    this.bobPhase = Math.random() * Math.PI * 2
    this.chasing = false
    this.homeX = x
    this.homeY = y
    this.setTexture(PICKUP_TEXTURE[kind])
    this.setScale(ART_SCALE)
    this.setPosition(x, y)
    this.setAlpha(1)
    this.setDepth(12)
    this.setActive(true)
    this.setVisible(true)
  }

  retire(): void {
    this.setActive(false)
    this.setVisible(false)
  }
}

// ---------------------------------------------------------------- orbiters

/** A satellite circling the player: spike rings, geese, cone-nados. */
export class Orbiter extends Phaser.GameObjects.Sprite {
  weaponId: WeaponId = 'snuggleSpikes'
  orbitAngle = 0
  /** Angle at the start of this frame, for the swept-arc hit test. */
  prevAngle = 0
  orbitRadius = 60
  /** Radians per second. */
  angularSpeed = 2
  damage = 0
  /** ms of life; Infinity for the permanent ones. */
  lifespan = Infinity
  spin = 0
  hitRadius = 12
  /** ms before this satellite can hit the same Grump again. */
  hitCooldown = 320
  /** uid -> game time when this satellite may hit that Grump again. */
  private nextHit = new Map<number, number>()

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'proj-spike')
    this.setOrigin(0.5, 0.5)
  }

  start(cfg: {
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
  }): void {
    this.weaponId = cfg.weaponId
    this.hitCooldown = cfg.hitCooldown
    this.orbitAngle = cfg.angle
    this.prevAngle = cfg.angle
    this.orbitRadius = cfg.radius
    this.angularSpeed = cfg.angularSpeed
    this.damage = cfg.damage
    this.lifespan = cfg.lifespan
    this.spin = cfg.spin ?? 0
    this.setTexture(cfg.texture)
    this.setScale(cfg.scale * ART_SCALE)
    this.hitRadius = Math.max(9, this.displayWidth * 0.5)
    this.setAlpha(1)
    this.setDepth(26)
    this.setActive(true)
    this.setVisible(true)
    this.nextHit.clear()
  }

  /** True if this satellite is allowed to hit `uid` right now. */
  canHit(uid: number, now: number): boolean {
    const ready = this.nextHit.get(uid) ?? 0
    return now >= ready
  }

  markHit(uid: number, now: number): void {
    this.nextHit.set(uid, now + this.hitCooldown)
    // The map only ever holds Grumps this satellite touched recently; a hard cap
    // keeps a 5-minute run from growing it forever.
    if (this.nextHit.size > 64) {
      for (const [key, time] of this.nextHit) {
        if (time < now) this.nextHit.delete(key)
      }
    }
  }

  retire(): void {
    this.nextHit.clear()
    this.setActive(false)
    this.setVisible(false)
  }
}

// ------------------------------------------------------------------ shields

/**
 * The umbrella: a timed blocker carried behind the player.
 *
 * Deals no damage — it exists to eat incoming enemy projectiles. It is *not* a
 * wall: it never blocks the player's own shots, which would make it a downgrade
 * rather than a treat.
 */
export class Shield extends Phaser.GameObjects.Sprite {
  weaponId: WeaponId = 'braveBrolly'
  /** ms of life left. */
  lifespan = 0
  /** How far behind the player the canopy sits. */
  offset = 26
  /** Enemy shots within this radius of the canopy are stopped. */
  blockRadius = 34

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'prop-umbrella')
    this.setOrigin(0.5, 0.5)
  }

  open(cfg: {
    weaponId: WeaponId
    texture: string
    lifespan: number
    blockRadius: number
    offset: number
    scale: number
  }): void {
    this.weaponId = cfg.weaponId
    this.lifespan = cfg.lifespan
    this.blockRadius = cfg.blockRadius
    this.offset = cfg.offset
    this.setTexture(cfg.texture)
    this.setScale(cfg.scale * ART_SCALE)
    this.setAlpha(1)
    this.setDepth(31)
    this.setActive(true)
    this.setVisible(true)
  }

  retire(): void {
    this.setActive(false)
    this.setVisible(false)
  }
}

// ----------------------------------------------------------------- turrets

/** A cupcake left on the ground that shoots frosting for a while. */
export class Turret extends Phaser.GameObjects.Sprite {
  lifespan = 0
  cooldown = 900
  timer = 0
  damage = 0
  shotSpeed = 240
  shotScale = 1
  pierce = 0

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'prop-cupcake')
    this.setOrigin(0.5, 0.85)
  }

  place(cfg: {
    x: number
    y: number
    lifespan: number
    cooldown: number
    damage: number
    shotSpeed: number
    shotScale: number
    pierce: number
  }): void {
    this.lifespan = cfg.lifespan
    this.cooldown = cfg.cooldown
    this.timer = 250
    this.damage = cfg.damage
    this.shotSpeed = cfg.shotSpeed
    this.shotScale = cfg.shotScale
    this.pierce = cfg.pierce
    this.setPosition(cfg.x, cfg.y)
    this.setScale(ART_SCALE)
    this.setAlpha(1)
    this.setDepth(14)
    this.setActive(true)
    this.setVisible(true)
  }

  retire(): void {
    this.setActive(false)
    this.setVisible(false)
  }
}
