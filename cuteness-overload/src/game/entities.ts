/**
 * Pooled game objects. These are deliberately dumb: they hold state and know
 * how to reset themselves, but all steering, collision response and lifetime
 * logic lives in {@link GameScene}, which is the only thing with the whole
 * picture. That keeps the hot per-frame loops in one readable place.
 */
import Phaser from 'phaser'
import { ART_SCALE, animKey, artScale, artWidth } from '../art/textures'
import { DEPTH } from './depth'
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

/** How much bigger and tougher an elite is than the ordinary Grump it's based on. */
export const ELITE = { scale: 1.85, hp: 14, speed: 0.9, damage: 1.4, xp: 12 } as const

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
  /** Sprite scale at rest; squash-and-stretch effects return to this. */
  baseScale = ART_SCALE
  /** A big, tough version of an ordinary Grump that carries a chest. */
  elite = false
  /** Drops a treasure chest when squished. */
  carriesChest = false
  /** What the HUD calls it, e.g. "Big Grumpy Snail". */
  displayName = ''
  /** For `swarm`: the fixed direction it's charging in. */
  swarmX = 0
  swarmY = 0
  /** ms per special move until it's next due. See {@link BossMove}. */
  moveTimers: number[] = []
  /** Index of the move being telegraphed, or -1. */
  pendingMove = -1
  telegraphLeft = 0
  /** ms of charge left, and its velocity. */
  chargeLeft = 0
  chargeX = 0
  chargeY = 0
  /** For presents: which streamed cell this one belongs to. */
  propKey = ''

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'foe-snail')
    this.setOrigin(0.5, 0.5)
  }

  spawn(
    def: EnemyDef,
    x: number,
    y: number,
    diff: { hp: number; speed: number; damage: number },
    opts: { elite?: boolean; texture?: string } = {},
  ): void {
    this.uid = nextUid()
    this.def = def
    const texture = opts.texture ?? def.texture
    const elite = opts.elite === true
    this.elite = elite
    this.carriesChest = elite || def.chest === true
    this.displayName = elite ? `Big ${def.name}` : def.name
    this.setTexture(texture, 0)
    // Elites are drawn at up to twice their design size, which is still no
    // bigger than the supersampled texture, so they stay crisp.
    this.baseScale = def.scale * artScale(texture) * (elite ? ELITE.scale : 1)
    this.setScale(this.baseScale)
    this.setRotation(0)
    this.setFlipX(false)
    // Every Grump has a waddle/flap loop. A random start frame and a slightly
    // different speed each stop a crowd from marching in lockstep.
    const loop = animKey(texture)
    if (this.scene.anims.exists(loop)) {
      this.play({ key: loop, randomFrame: true, timeScale: 0.85 + Math.random() * 0.3 })
    } else {
      this.anims.stop()
    }
    this.setAlpha(1)
    this.clearTint()
    this.setDepth(def.isBoss || elite ? DEPTH.bigGrump : DEPTH.grump)
    this.maxHp = Math.round(def.hp * diff.hp * (elite ? ELITE.hp : 1))
    this.hp = this.maxHp
    this.speed = def.speed * diff.speed * (elite ? ELITE.speed : 1)
    this.contactDamage = Math.round(def.damage * diff.damage * (elite ? ELITE.damage : 1))
    this.xpValue = def.xp * (elite ? ELITE.xp : 1)
    this.swarmX = 0
    this.swarmY = 0
    this.moveTimers = (def.moves ?? []).map((move) => move.every * (0.55 + Math.random() * 0.35))
    this.pendingMove = -1
    this.telegraphLeft = 0
    this.chargeLeft = 0
    this.propKey = ''
    this.behaviorTimer = def.behavior === 'dash' ? (def.dashInterval ?? 1800) * Math.random() : 0
    this.dashing = false
    this.driftAngle = Math.random() * Math.PI * 2
    this.knockTimer = 0
    this.nextTouchAt = 0
    this.detourTimer = 0
    this.flashTimer = 0
    this.worldRadius = def.radius * def.scale * (elite ? ELITE.scale : 1)

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
  /** uid of `target` when it was chosen, so a recycled pool object isn't chased. */
  targetUid = 0
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
    this.targetUid = this.target?.uid ?? 0
    this.hitUids.clear()

    this.setTexture(cfg.texture)
    this.setScale(cfg.scale * ART_SCALE)
    this.setAlpha(1)
    this.setDepth(cfg.depth ?? DEPTH.shot)
    this.setRotation(this.faceTravel ? Math.atan2(cfg.vy, cfg.vx) : 0)

    this.enableBody(true, cfg.x, cfg.y, true, true)
    setCircleBody(this, Math.max(5, artWidth(this) * 0.42))
    this.body.setVelocity(cfg.vx, cfg.vy)
  }

  retire(): void {
    this.target = null
    this.disableBody(true, true)
  }
}

// ----------------------------------------------------------------- pickups

export type PickupKind = 'heart' | 'sprinkle' | 'snack' | 'chest' | 'magnet' | 'bomb' | 'freeze' | 'bag'

const PICKUP_TEXTURE: Record<PickupKind, string> = {
  heart: 'pick-heart',
  sprinkle: 'pick-sprinkle',
  snack: 'pick-snack',
  chest: 'pick-chest',
  magnet: 'pick-magnet',
  bomb: 'pick-bomb',
  freeze: 'pick-freeze',
  bag: 'pick-bag',
}

/** Hearts get bigger and change colour as they carry more XP. */
export function heartTexture(value: number): string {
  if (value >= 25) return 'pick-heart3'
  if (value >= 6) return 'pick-heart2'
  return 'pick-heart'
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
  /** Pulled in by a Friendship Magnet, from anywhere, fast. */
  magnetised = false

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'pick-heart')
    this.setOrigin(0.5, 0.5)
  }

  drop(kind: PickupKind, x: number, y: number, value: number): void {
    this.kind = kind
    this.value = value
    // Chests never time out: walking away from treasure shouldn't lose it.
    this.lifespan = kind === 'chest' ? Infinity : kind === 'heart' ? 22000 : 30000
    this.bobPhase = Math.random() * Math.PI * 2
    this.chasing = false
    this.magnetised = false
    this.homeX = x
    this.homeY = y
    this.setTexture(kind === 'heart' ? heartTexture(value) : PICKUP_TEXTURE[kind], 0)
    this.setScale(ART_SCALE * (kind === 'chest' ? 1.15 : 1))
    if (kind === 'chest' && this.scene.anims.exists(animKey('pick-chest'))) this.play(animKey('pick-chest'))
    else this.anims.stop()
    this.setPosition(x, y)
    this.setAlpha(1)
    this.setDepth(DEPTH.pickup)
    this.setActive(true)
    this.setVisible(true)
  }

  /** Adds XP to a heart already on the floor, re-picking its art for the new size. */
  absorb(value: number): void {
    this.value += value
    this.setTexture(heartTexture(this.value))
    this.lifespan = Math.max(this.lifespan, 12000)
  }

  retire(): void {
    this.anims.stop()
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
    this.hitRadius = Math.max(9, artWidth(this) * 0.5)
    this.setAlpha(1)
    this.setDepth(DEPTH.orbiter)
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
  /** Domes also shove and hurt Grumps inside them, this much per pulse. */
  damage = 0
  pulseTimer = 0
  dome = false

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
    damage: number
    dome: boolean
  }): void {
    this.weaponId = cfg.weaponId
    this.lifespan = cfg.lifespan
    this.blockRadius = cfg.blockRadius
    this.offset = cfg.offset
    this.damage = cfg.damage
    this.dome = cfg.dome
    this.pulseTimer = 0
    this.setTexture(cfg.texture)
    this.setScale(cfg.scale * ART_SCALE)
    this.setAlpha(1)
    this.setDepth(cfg.dome ? DEPTH.aura : DEPTH.shield)
    this.setRotation(0)
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
  shotTexture = 'proj-frosting'

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
    texture: string
    shotTexture: string
  }): void {
    this.setTexture(cfg.texture)
    this.shotTexture = cfg.shotTexture
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
    this.setDepth(DEPTH.turret)
    this.setActive(true)
    this.setVisible(true)
  }

  retire(): void {
    this.setActive(false)
    this.setVisible(false)
  }
}

// ------------------------------------------------------------------ puddles

/** A patch of wobbly jelly on the floor that hurts every Grump standing in it. */
export class Puddle extends Phaser.GameObjects.Image {
  radius = 40
  damage = 0
  lifespan = 0
  /** Total lifetime, for the fade in and out. */
  maxLife = 1
  tickTimer = 0
  tick = 350

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'fx-puddle')
    this.setOrigin(0.5, 0.5)
  }

  place(cfg: { x: number; y: number; radius: number; damage: number; lifespan: number; texture: string }): void {
    this.radius = cfg.radius
    this.damage = cfg.damage
    this.lifespan = cfg.lifespan
    this.maxLife = cfg.lifespan
    this.tickTimer = 0
    this.setTexture(cfg.texture)
    this.setPosition(cfg.x, cfg.y)
    // The art's puddle is drawn with a 30px radius on its canvas.
    this.setScale((cfg.radius / 30) * ART_SCALE)
    this.setAlpha(0)
    this.setDepth(DEPTH.puddle)
    this.setRotation(Math.random() * Math.PI * 2)
    this.setActive(true)
    this.setVisible(true)
  }

  retire(): void {
    this.setActive(false)
    this.setVisible(false)
  }
}
