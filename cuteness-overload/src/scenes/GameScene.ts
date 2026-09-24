import Phaser from 'phaser'
import { WORLD_VIEW } from '../game/constants'
import { ART_SCALE, artScale } from '../art/textures'
import { P } from '../art/palette'
import { sfx } from '../audio/sfx'
import { CHARACTERS, toCharacterId, type CharacterId } from '../data/characters'
import { ENEMIES, MAX_LIVE_ENEMIES, activeWaves, type EnemyDef, type EnemyId } from '../data/enemies'
import {
  BEDTIME,
  ENDLESS_MINIBOSS_EVERY,
  ENDLESS_RATE_PER_MIN,
  ENDLESS_TOUGHEN_PER_MIN,
  GRUMPIER,
  LEVELS,
  LEVEL_IDS,
  levelChampions,
  toLevelId,
  type LevelDef,
} from '../data/levels'
import { PASSIVES } from '../data/passives'
import { WEAPONS, isEvolution, maxWeaponLevel, type BaseWeaponId, type WeaponId } from '../data/weapons'
import {
  ELITE,
  Enemy,
  Orbiter,
  Pickup,
  Puddle,
  Shield,
  Shot,
  Turret,
  setCircleBody,
  type PickupKind,
} from '../game/entities'
import { computeStats, emptyInventory, evolveWeapon, grantPassive, grantWeapon, type Inventory } from '../game/loadout'
import {
  applyRunResult,
  awardStickers,
  isLevelUnlocked,
  loadSave,
  unlockedWeapons,
  writeSave,
  type SaveData,
} from '../game/save'
import { difficultyAt, xpToNext, type Stats } from '../game/stats'
import {
  SNACK_HEAL,
  STASH_SPRINKLES,
  choiceCount,
  choiceKey,
  chestSize,
  rollChest,
  rollChoices,
  type ChestPrize,
  type Choice,
} from '../game/upgradePool'
import {
  WeaponSystem,
  type OrbiterRequest,
  type PuddleRequest,
  type ShieldRequest,
  type ShotRequest,
  type TurretRequest,
  type WeaponHost,
} from '../game/weaponSystem'
import { updateBossMoves, type BossHost } from '../game/bossBrain'
import { DEPTH } from '../game/depth'
import { ObstacleField } from '../game/obstacles'
import { DecalField } from '../game/decor'
import { PresentField } from '../game/props'
import type { RunSummary, StickerId } from '../data/stickers'
import { wakeLock } from '../lib/wakeLock'
import type { HudScene } from './HudScene'

/** Everything the HUD needs to draw itself, refreshed every frame. */
export interface RunUiState {
  hp: number
  maxHp: number
  level: number
  xpFrac: number
  xp: number
  xpNeeded: number
  timeSec: number
  kills: number
  sprinkles: number
  weapons: { icon: string; level: number; max: number; evolved: boolean }[]
  passives: { icon: string; level: number; max: number }[]
  boss: BossUiState | null
  /** When the level's boss turns up. */
  bossTime: number
  bossBeaten: boolean
  endless: boolean
  grumpier: boolean
  /** ms of Nap Time left, 0 when the Grumps are awake. */
  napLeft: number
}

/**
 * Where the current boss is, in *screen* pixels. The HUD renders unzoomed on the
 * same canvas, so it can use these directly to point at a boss that has wandered
 * off the edge of a play field much bigger than the screen.
 */
export interface BossUiState {
  name: string
  texture: string
  frac: number
  onScreen: boolean
  screenX: number
  screenY: number
}

/** What the results screen is told about a finished run. */
export interface ResultData {
  won: boolean
  quit: boolean
  bedtime: boolean
  levelId: string
  levelName: string
  grumpier: boolean
  /** Name of a level this win just opened up, if any. */
  unlockedLevel: string | null
  survivedSec: number
  kills: number
  earned: number
  level: number
  characterId: string
  newBestTime: boolean
  endlessSec: number
  inventory: { icon: string; name: string; level: number; evolved: boolean }[]
  stickers: StickerId[]
  /** Evolutions discovered for the first time this run. */
  evolutions: WeaponId[]
}

interface TimedEvent {
  at: number
  fn: () => void
}

/** How long one Grump waits before it can bump you again. */
const ENEMY_TOUCH_COOLDOWN = 800
/**
 * Shortest gap between any two hits. Without this, walking into a wall of Grumps
 * would land a dozen bumps in a single frame; with it, a crowd is about five
 * times as dangerous as a single Grump rather than infinitely so.
 */
const HURT_GATE = 200
/** How long the player blinks after being bumped. Cosmetic only. */
const HURT_FLASH = 350
const DESPAWN_DISTANCE = 1750
/** Chest-carriers that wander this far away are brought back into play. */
const CHAMPION_LEASH = 1300
/** Above this many pickups on the floor, new hearts merge into their neighbours. */
const HEART_MERGE_ABOVE = 140
const NAP_MS = 6000
const NAP_TINT = 0xbcd6ff

/** What a present can contain, and how likely each is. */
const PRESENT_TABLE: readonly { kind: PickupKind | 'bigheart'; weight: number }[] = [
  { kind: 'snack', weight: 30 },
  { kind: 'bag', weight: 22 },
  { kind: 'magnet', weight: 12 },
  { kind: 'bomb', weight: 12 },
  { kind: 'freeze', weight: 11 },
  { kind: 'bigheart', weight: 13 },
]

export class GameScene extends Phaser.Scene implements WeaponHost, BossHost {
  // --- run state
  private characterId: CharacterId = 'mochi'
  private levelDef: LevelDef = LEVELS.meadow
  private grumpier = false
  private save: SaveData = loadSave()
  private available: BaseWeaponId[] = []
  private inventory: Inventory = emptyInventory()
  private statBlock!: Stats
  private hp = 1
  private level = 1
  private xp = 0
  private xpNeeded = 10
  private kills = 0
  private sprinklesCollected = 0
  private elapsedMs = 0
  private runOver = false
  private modalOpen = false
  private readonly modalQueue: (() => void)[] = []
  private pendingLevelUps = 0
  private hurtGateUntil = 0
  private invulnUntil = 0
  private hurtFlashUntil = 0
  private revivesLeft = 0
  private rerollsLeft = 0
  private banishesLeft = 0
  private readonly banished = new Set<string>()
  private bossBeaten = false
  private bossBeatenAt = 0
  private endless = false
  private nextEndlessChampion = 0
  private championCycle = 0
  private napUntil = 0
  private nextNapZzz = 0
  // --- run records, for stickers and the results screen
  private chestsOpened = 0
  private presentsPopped = 0
  private evolutionsThisRun: WeaponId[] = []
  private mostWeapons = 0
  private maxedWeapon = false
  private usedMagnet = false
  private usedBomb = false
  private usedFreeze = false

  // --- objects
  private player!: Phaser.Physics.Arcade.Sprite
  private backdrop!: Phaser.GameObjects.TileSprite
  private enemyGroup!: Phaser.Physics.Arcade.Group
  private shotGroup!: Phaser.Physics.Arcade.Group
  private foeShotGroup!: Phaser.Physics.Arcade.Group
  private pickupGroup!: Phaser.GameObjects.Group
  private orbiterGroup!: Phaser.GameObjects.Group
  private turretGroup!: Phaser.GameObjects.Group
  private shieldGroup!: Phaser.GameObjects.Group
  private puddleGroup!: Phaser.GameObjects.Group
  private obstacleGroup?: Phaser.Physics.Arcade.StaticGroup
  private obstacles?: ObstacleField
  private decals?: DecalField
  private presents?: PresentField
  /** Pooled "poof" clouds left where a Grump was squished. */
  private poofs!: Phaser.GameObjects.Group
  private twinkles!: Phaser.GameObjects.Group
  private puffs!: Phaser.GameObjects.Particles.ParticleEmitter
  private sparkles!: Phaser.GameObjects.Particles.ParticleEmitter
  private confetti!: Phaser.GameObjects.Particles.ParticleEmitter
  private zzz!: Phaser.GameObjects.Particles.ParticleEmitter
  private readonly auras = new Map<WeaponId, Phaser.GameObjects.Image>()
  /** Crowns floating over elites, so a big Grump reads as special. */
  private readonly crowns = new Map<Enemy, Phaser.GameObjects.Image>()
  private weapons!: WeaponSystem
  private keys!: {
    up: Phaser.Input.Keyboard.Key[]
    down: Phaser.Input.Keyboard.Key[]
    left: Phaser.Input.Keyboard.Key[]
    right: Phaser.Input.Keyboard.Key[]
  }

  private facingVec = { x: 1, y: 0 }
  /** Every live mini-boss, elite and boss. The HUD shows the most important one. */
  private champions: Enemy[] = []
  private timedEvents: TimedEvent[] = []
  private nextEventIndex = 0
  private spawnAccumulator = 0
  private viewRect = new Phaser.Geom.Rectangle(0, 0, 100, 100)
  /** Reused rather than reallocated: syncUi runs every frame. */
  private readonly bossUi: BossUiState = {
    name: '',
    texture: '',
    frac: 0,
    onScreen: true,
    screenX: 0,
    screenY: 0,
  }

  /** Read by the HUD scene every frame. */
  readonly ui: RunUiState = {
    hp: 1,
    maxHp: 1,
    level: 1,
    xpFrac: 0,
    xp: 0,
    xpNeeded: 1,
    timeSec: 0,
    kills: 0,
    sprinkles: 0,
    weapons: [],
    passives: [],
    boss: null,
    bossTime: 0,
    bossBeaten: false,
    endless: false,
    grumpier: false,
    napLeft: 0,
  }

  constructor() {
    super('Game')
  }

  init(data: { characterId?: string; levelId?: string; grumpier?: boolean }): void {
    this.characterId = toCharacterId(data?.characterId)
    this.save = loadSave()
    const levelId = toLevelId(data?.levelId)
    this.levelDef = LEVELS[isLevelUnlocked(this.save, levelId) ? levelId : 'meadow']
    this.grumpier = data?.grumpier === true
    this.available = unlockedWeapons(this.save)
    this.inventory = emptyInventory()
    this.hp = 1
    this.level = 1
    this.xp = 0
    this.kills = 0
    this.sprinklesCollected = 0
    this.elapsedMs = 0
    this.runOver = false
    this.modalOpen = false
    this.modalQueue.length = 0
    this.pendingLevelUps = 0
    this.levelUpQueued = false
    this.hurtGateUntil = 0
    this.invulnUntil = 0
    this.hurtFlashUntil = 0
    this.banished.clear()
    this.bossBeaten = false
    this.bossBeatenAt = 0
    this.endless = false
    this.nextEndlessChampion = 0
    this.championCycle = 0
    this.napUntil = 0
    this.nextNapZzz = 0
    this.chestsOpened = 0
    this.presentsPopped = 0
    this.evolutionsThisRun = []
    this.mostWeapons = 0
    this.maxedWeapon = false
    this.usedMagnet = false
    this.usedBomb = false
    this.usedFreeze = false
    this.champions = []
    this.nextEventIndex = 0
    this.spawnAccumulator = 0
    this.facingVec = { x: 1, y: 0 }
    this.auras.clear()
    this.crowns.clear()
  }

  create(): void {
    const character = CHARACTERS[this.characterId]

    // ---------------------------------------------------------------- world
    this.backdrop = this.add.tileSprite(0, 0, 100, 100, this.levelDef.backdrop).setDepth(DEPTH.backdrop)
    this.backdrop.setTileScale(this.levelDef.tileScale, this.levelDef.tileScale)

    const playerScale = artScale(character.texture)
    this.player = this.physics.add.sprite(0, 0, character.texture).setScale(playerScale).setDepth(DEPTH.player)
    setCircleBody(this.player, 13)
    this.player.body?.reset(0, 0)
    this.tweens.add({
      targets: this.player,
      scaleY: playerScale * 1.05,
      scaleX: playerScale * 0.97,
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    this.cameras.main.startFollow(this.player, true, 0.14, 0.14)
    this.applyZoom()
    this.scale.on(Phaser.Scale.Events.RESIZE, this.applyZoom, this)

    // ---------------------------------------------------------------- pools
    this.enemyGroup = this.physics.add.group({
      classType: Enemy,
      maxSize: MAX_LIVE_ENEMIES + 60,
      runChildUpdate: false,
    })
    this.shotGroup = this.physics.add.group({ classType: Shot, maxSize: 420, runChildUpdate: false })
    this.foeShotGroup = this.physics.add.group({ classType: Shot, maxSize: 220, runChildUpdate: false })
    this.pickupGroup = this.add.group({ classType: Pickup, maxSize: 340, runChildUpdate: false })
    this.orbiterGroup = this.add.group({ classType: Orbiter, maxSize: 90, runChildUpdate: false })
    this.turretGroup = this.add.group({ classType: Turret, maxSize: 14, runChildUpdate: false })
    this.shieldGroup = this.add.group({ classType: Shield, maxSize: 4, runChildUpdate: false })
    this.puddleGroup = this.add.group({ classType: Puddle, maxSize: 28, runChildUpdate: false })

    this.puffs = this.add.particles(0, 0, 'fx-puff', {
      lifespan: 380,
      speed: { min: 40, max: 150 },
      scale: { start: ART_SCALE * 1.1, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [P.pink, P.white, P.lavender],
      emitting: false,
    })
    this.puffs.setDepth(DEPTH.puffs)
    this.sparkles = this.add.particles(0, 0, 'fx-star', {
      lifespan: 520,
      speed: { min: 60, max: 190 },
      scale: { start: ART_SCALE * 0.9, end: 0 },
      rotate: { start: 0, end: 220 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    })
    this.sparkles.setDepth(DEPTH.sparkles)
    this.confetti = this.add.particles(0, 0, 'fx-heart', {
      lifespan: 620,
      speed: { min: 50, max: 160 },
      gravityY: 260,
      scale: { start: ART_SCALE * 1.1, end: ART_SCALE * 0.4 },
      rotate: { min: -40, max: 40 },
      alpha: { start: 1, end: 0 },
      tint: [P.pinkHot, P.pink, P.lemon, P.mint, P.lavender],
      emitting: false,
    })
    this.confetti.setDepth(DEPTH.sparkles)
    this.zzz = this.add.particles(0, 0, 'fx-zzz', {
      lifespan: 1400,
      speedY: { min: -40, max: -20 },
      speedX: { min: -12, max: 12 },
      scale: { start: ART_SCALE * 0.6, end: ART_SCALE * 1.2 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    })
    this.zzz.setDepth(DEPTH.zzz)
    this.poofs = this.add.group({ classType: Phaser.GameObjects.Image, maxSize: 48 })
    this.twinkles = this.add.group({ classType: Phaser.GameObjects.Image, maxSize: 40 })
    this.decals = new DecalField(this, this.levelDef.decals)

    // --------------------------------------------------------------- loadout
    grantWeapon(this.inventory, character.startWeapon)
    this.recomputeStats()
    this.level = this.statBlock.startLevel
    this.xpNeeded = xpToNext(this.level)
    this.hp = this.statBlock.maxHp
    this.revivesLeft = this.statBlock.revives
    this.rerollsLeft = this.statBlock.rerolls
    this.banishesLeft = this.statBlock.banishes
    this.weapons = new WeaponSystem(this)
    this.weapons.sync(this.inventory)
    this.mostWeapons = 1

    // ---------------------------------------------------------------- input
    const kb = this.input.keyboard
    const key = (code: number): Phaser.Input.Keyboard.Key[] => (kb ? [kb.addKey(code)] : [])
    const KC = Phaser.Input.Keyboard.KeyCodes
    this.keys = {
      up: [...key(KC.W), ...key(KC.UP)],
      down: [...key(KC.S), ...key(KC.DOWN)],
      left: [...key(KC.A), ...key(KC.LEFT)],
      right: [...key(KC.D), ...key(KC.RIGHT)],
    }
    kb?.on('keydown-ESC', () => this.requestPause())
    kb?.on('keydown-P', () => this.requestPause())

    // ------------------------------------------------------------ collisions
    this.physics.add.overlap(this.shotGroup, this.enemyGroup, this.onShotHitsEnemy, undefined, this)
    this.physics.add.overlap(this.player, this.enemyGroup, this.onEnemyTouchesPlayer, undefined, this)
    this.physics.add.overlap(this.player, this.foeShotGroup, this.onFoeShotHitsPlayer, undefined, this)

    // ------------------------------------------------------------- obstacles
    if (this.levelDef.obstacles) {
      this.obstacleGroup = this.physics.add.staticGroup()
      this.obstacles = new ObstacleField(this.obstacleGroup, this.levelDef.obstacles)
      this.physics.add.collider(this.player, this.obstacleGroup)
      // Flyers go over the top; everything else has to walk round.
      this.physics.add.collider(this.enemyGroup, this.obstacleGroup, undefined, (e) => !(e as Enemy).def.flies, this)
      this.physics.add.overlap(this.shotGroup, this.obstacleGroup, this.onShotHitsObstacle, undefined, this)
      this.physics.add.overlap(this.foeShotGroup, this.obstacleGroup, this.onShotHitsObstacle, undefined, this)
    }

    const presentDef = this.levelDef.presents
    this.presents = new PresentField(
      presentDef.cell,
      Math.min(0.9, presentDef.chance * this.statBlock.presentLuck),
      (x, y, texture, cellKey) => this.spawnPresent(x, y, texture, cellKey),
      (x, y) => this.obstacles?.occupied(x, y, 22) ?? false,
    )

    this.timedEvents = this.buildTimeline()
    this.scene.launch('Hud')
    wakeLock.acquire()

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.applyZoom, this)
      wakeLock.release()
      this.obstacles?.destroy()
      this.obstacles = undefined
      this.decals?.destroy()
      this.decals = undefined
      this.presents = undefined
      this.scene.stop('Hud')
    })
  }

  // ------------------------------------------------------------- WeaponHost

  get stats(): Stats {
    return this.statBlock
  }

  get playerX(): number {
    return this.player.x
  }

  get playerY(): number {
    return this.player.y
  }

  get facing(): { x: number; y: number } {
    return this.facingVec
  }

  get view(): Phaser.Geom.Rectangle {
    return this.viewRect
  }

  later(delay: number, fn: () => void): void {
    this.time.delayedCall(delay, () => {
      if (!this.runOver) fn()
    })
  }

  nearestEnemies(x: number, y: number, count: number, maxDist = Infinity): Enemy[] {
    const maxSq = maxDist * maxDist
    const found: { enemy: Enemy; distSq: number }[] = []
    for (const child of this.enemyGroup.getChildren()) {
      const enemy = child as Enemy
      if (!enemy.active || enemy.def.behavior === 'still') continue
      const distSq = (enemy.x - x) ** 2 + (enemy.y - y) ** 2
      if (distSq <= maxSq) found.push({ enemy, distSq })
    }
    found.sort((a, b) => a.distSq - b.distSq)
    return found.slice(0, count).map((f) => f.enemy)
  }

  randomEnemiesInView(count: number): Enemy[] {
    const inView: Enemy[] = []
    const view = this.viewRect
    for (const child of this.enemyGroup.getChildren()) {
      const enemy = child as Enemy
      if (!enemy.active || enemy.def.behavior === 'still') continue
      if (view.contains(enemy.x, enemy.y)) inView.push(enemy)
    }
    // Partial Fisher-Yates: only the first `count` need shuffling.
    for (let i = 0; i < Math.min(count, inView.length); i++) {
      const j = i + Math.floor(Math.random() * (inView.length - i))
      ;[inView[i], inView[j]] = [inView[j], inView[i]]
    }
    return inView.slice(0, count)
  }

  /** Single-target version with no allocation or sort — used by homing shots. */
  private nearestEnemy(x: number, y: number, maxDist: number): Enemy | null {
    let best: Enemy | null = null
    let bestSq = maxDist * maxDist
    for (const child of this.enemyGroup.getChildren()) {
      const enemy = child as Enemy
      if (!enemy.active || enemy.def.behavior === 'still') continue
      const distSq = (enemy.x - x) ** 2 + (enemy.y - y) ** 2
      if (distSq < bestSq) {
        bestSq = distSq
        best = enemy
      }
    }
    return best
  }

  fireShot(req: ShotRequest): void {
    const shot = this.shotGroup.get(req.x, req.y) as Shot | null
    if (!shot) return
    shot.launch(req)
  }

  addOrbiter(req: OrbiterRequest): void {
    const orbiter = this.orbiterGroup.get(this.player.x, this.player.y) as Orbiter | null
    if (!orbiter) return
    orbiter.start(req)
  }

  clearOrbiters(weaponId: string): void {
    for (const child of this.orbiterGroup.getChildren()) {
      const orbiter = child as Orbiter
      if (orbiter.active && orbiter.weaponId === weaponId) orbiter.retire()
    }
  }

  addShield(req: ShieldRequest): void {
    const shield = this.shieldGroup.get(this.player.x, this.player.y) as Shield | null
    if (!shield) return
    shield.open(req)
    this.positionShield(shield)
    // Pops open rather than blinking into existence, so it's obvious it's up.
    shield.setScale(shield.scale * 0.55)
    this.tweens.add({
      targets: shield,
      scale: req.scale * ART_SCALE,
      duration: 180,
      ease: 'Back.easeOut',
    })
    sfx.play('snack', 120)
  }

  addTurret(req: TurretRequest): void {
    const turret = this.turretGroup.get(req.x, req.y) as Turret | null
    if (!turret) return
    turret.place(req)
    this.puffs.emitParticleAt(req.x, req.y, 5)
  }

  addPuddle(req: PuddleRequest): void {
    const puddle = this.puddleGroup.get(req.x, req.y) as Puddle | null
    if (!puddle) return
    // Claim it now so a burst of casts can't hand the same puddle out twice.
    puddle.setActive(true).setVisible(false)
    puddle.lifespan = Infinity
    // A jelly blob arcs out of the player and splats where the puddle goes.
    const blob = this.add
      .image(this.player.x, this.player.y, req.texture)
      .setScale(ART_SCALE * 0.35)
      .setDepth(DEPTH.orbiter)
    const fromX = this.player.x
    const fromY = this.player.y
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 320,
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0
        blob.setPosition(fromX + (req.x - fromX) * t, fromY + (req.y - fromY) * t - Math.sin(t * Math.PI) * 60)
      },
      onComplete: () => {
        blob.destroy()
        if (this.runOver) return
        puddle.place(req)
        this.tweens.add({ targets: puddle, alpha: 0.62, duration: 160 })
        this.puffs.emitParticleAt(req.x, req.y, 4)
      },
    })
  }

  castArc(x: number, y: number, angle: number, radius: number, spread: number, damage: number, texture: string): void {
    const fx = this.add
      .image(x + Math.cos(angle) * radius * 0.45, y + Math.sin(angle) * radius * 0.45, texture)
      .setRotation(angle)
      .setScale((radius / 28) * ART_SCALE)
      .setDepth(DEPTH.weaponFx)
      .setAlpha(0.95)
    this.tweens.add({
      targets: fx,
      alpha: 0,
      scale: fx.scale * 1.25,
      duration: 190,
      onComplete: () => fx.destroy(),
    })
    sfx.play('pop', 60)

    for (const child of this.enemyGroup.getChildren()) {
      const enemy = child as Enemy
      if (!enemy.active) continue
      const dx = enemy.x - x
      const dy = enemy.y - y
      if (dx * dx + dy * dy > (radius + enemy.worldRadius) ** 2) continue
      const delta = Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - angle)
      if (Math.abs(delta) > spread) continue
      this.damageEnemy(enemy, damage, angle)
    }
  }

  castNova(x: number, y: number, radius: number, damage: number, texture: string): void {
    const fx = this.add.image(x, y, texture).setScale(0.15).setDepth(DEPTH.weaponFx).setAlpha(0.95)
    this.tweens.add({
      targets: fx,
      scale: (radius / 36) * ART_SCALE * 1.05,
      alpha: 0,
      duration: 340,
      ease: 'Quad.easeOut',
      onComplete: () => fx.destroy(),
    })
    this.sparkles.emitParticleAt(x, y, 10)
    sfx.play('squish', 80)

    for (const child of this.enemyGroup.getChildren()) {
      const enemy = child as Enemy
      if (!enemy.active) continue
      const dx = enemy.x - x
      const dy = enemy.y - y
      if (dx * dx + dy * dy > (radius + enemy.worldRadius) ** 2) continue
      this.damageEnemy(enemy, damage, Math.atan2(dy, dx))
    }
  }

  castBeam(x: number, y: number, angle: number, rawLength: number, halfWidth: number, damage: number, texture: string): void {
    // Bushes are opaque: a beam that carried on through one would look wrong and
    // would quietly ignore the level's cover.
    const length = this.obstacles?.rayDistance(x, y, angle, rawLength) ?? rawLength
    const fx = this.add
      .image(x, y, texture)
      .setOrigin(0, 0.5)
      .setRotation(angle)
      .setDisplaySize(length, halfWidth * 2)
      .setDepth(DEPTH.weaponFx)
      .setAlpha(0.9)
    this.tweens.add({
      targets: fx,
      alpha: 0,
      duration: 260,
      onComplete: () => fx.destroy(),
    })
    sfx.play('pop', 70)

    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    for (const child of this.enemyGroup.getChildren()) {
      const enemy = child as Enemy
      if (!enemy.active) continue
      const dx = enemy.x - x
      const dy = enemy.y - y
      // Project onto the beam; `along` is distance down the beam, `across` is
      // perpendicular distance from its centre line.
      const along = dx * cos + dy * sin
      if (along < -enemy.worldRadius || along > length) continue
      const across = Math.abs(-dx * sin + dy * cos)
      if (across > halfWidth + enemy.worldRadius) continue
      this.damageEnemy(enemy, damage, angle)
    }
  }

  castAura(radius: number, damage: number, heal: number): void {
    const px = this.player.x
    const py = this.player.y
    let touched = false
    for (const child of this.enemyGroup.getChildren()) {
      const enemy = child as Enemy
      if (!enemy.active) continue
      const dx = enemy.x - px
      const dy = enemy.y - py
      if (dx * dx + dy * dy > (radius + enemy.worldRadius) ** 2) continue
      touched = touched || enemy.def.behavior !== 'still'
      this.damageEnemy(enemy, damage, Math.atan2(dy, dx), false)
    }
    if (touched && heal > 0 && this.hp < this.statBlock.maxHp) {
      this.hp = Math.min(this.statBlock.maxHp, this.hp + heal)
    }
    // A soft pulse on the glow, so the rhythm is visible.
    for (const glow of this.auras.values()) {
      const base = glow.getData('scale') as number
      glow.setScale(base * 1.08)
      this.tweens.add({ targets: glow, scale: base, duration: 220, ease: 'Quad.easeOut' })
    }
  }

  castStrike(x: number, y: number, radius: number, damage: number, texture: string): void {
    const bolt = this.add.image(x, y, texture).setOrigin(0.5, 0.92).setScale(ART_SCALE).setDepth(DEPTH.bolt).setAlpha(1)
    this.tweens.add({ targets: bolt, alpha: 0, duration: 240, delay: 60, onComplete: () => bolt.destroy() })
    const flash = this.add.image(x, y, 'fx-hit').setScale(ART_SCALE * (radius / 14)).setDepth(DEPTH.bolt).setTint(P.lemon)
    this.tweens.add({ targets: flash, alpha: 0, scale: flash.scale * 1.4, duration: 200, onComplete: () => flash.destroy() })
    sfx.play('zap', 50)
    for (const child of this.enemyGroup.getChildren()) {
      const enemy = child as Enemy
      if (!enemy.active) continue
      const dx = enemy.x - x
      const dy = enemy.y - y
      if (dx * dx + dy * dy > (radius + enemy.worldRadius) ** 2) continue
      this.damageEnemy(enemy, damage, Math.atan2(dy, dx))
    }
  }

  setAura(weaponId: WeaponId, radius: number, texture: string): void {
    const existing = this.auras.get(weaponId)
    if (radius <= 0) {
      existing?.destroy()
      this.auras.delete(weaponId)
      return
    }
    const glow = existing ?? this.add.image(this.player.x, this.player.y, texture).setDepth(DEPTH.aura).setAlpha(0.75)
    // The aura art is drawn with a 60px radius.
    const scale = (radius / 60) * ART_SCALE
    glow.setTexture(texture).setScale(scale).setData('scale', scale)
    this.auras.set(weaponId, glow)
  }

  // --------------------------------------------------------------- BossHost

  fireFoeShot(from: Enemy, angle: number, speed: number, damage: number, texture: string): void {
    const shot = this.foeShotGroup.get(from.x, from.y) as Shot | null
    if (!shot) return
    // Shots only get half the level's damage ramp. Measured with the balance
    // harness, enemy shots were doing nearly all the damage in the later
    // levels — dodging a crowd is a skill kids have, dodging a hail of bullets
    // mostly isn't.
    const ramp = 1 + (this.difficulty().damage - 1) * 0.5
    const pointy = texture === 'proj-raindrop' || texture === 'proj-banana'
    shot.launch({
      texture,
      x: from.x,
      y: from.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: Math.round(damage * ramp),
      pierce: 0,
      lifespan: 5000,
      scale: 1,
      mode: 'straight',
      faceTravel: pointy,
      spin: pointy ? 0 : 200,
      depth: DEPTH.foeShot,
    })
    // Raindrops are drawn pointing down; turn them to face their travel.
    if (texture === 'proj-raindrop') shot.setRotation(angle - Math.PI / 2)
  }

  summon(enemy: EnemyId, count: number, x: number, y: number, radius: number): void {
    const def = ENEMIES[enemy]
    const diff = this.difficulty()
    for (let i = 0; i < count; i++) {
      if (this.liveEnemyCount() >= this.levelDef.maxLive + 20) break
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4
      const sx = x + Math.cos(angle) * radius
      const sy = y + Math.sin(angle) * radius
      const minion = this.enemyGroup.get(sx, sy) as Enemy | null
      if (!minion) break
      minion.spawn(def, sx, sy, diff)
      this.afterSpawn(minion)
      this.puffs.emitParticleAt(sx, sy, 3)
    }
  }

  telegraph(enemy: Enemy): void {
    const ring = this.add
      .image(enemy.x, enemy.y, 'fx-ring')
      .setDepth(DEPTH.telegraph)
      .setTint(P.grumpRed)
      .setScale(((enemy.worldRadius * 0.9) / 32) * ART_SCALE)
      .setAlpha(0.9)
    this.tweens.add({
      targets: ring,
      scale: ring.scale * 1.6,
      alpha: 0,
      duration: 620,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    })
    sfx.play('telegraph', 200)
  }

  // ------------------------------------------------------------------ update

  override update(time: number, delta: number): void {
    if (this.runOver) return
    const dt = Math.min(delta, 50) // a hidden tab shouldn't teleport the swarm
    this.elapsedMs += dt
    const seconds = this.elapsedMs / 1000

    this.updateView()
    this.obstacles?.update(this.viewRect)
    this.decals?.update(this.viewRect)
    this.presents?.update(this.viewRect)
    this.updatePlayer()
    this.runTimeline(seconds)
    this.runEndless(seconds)
    this.spawnWave(dt, seconds)
    this.updateNap()
    this.updateEnemies(dt, time)
    this.updateShots(dt)
    this.updateFoeShots(dt)
    this.updateOrbiters(dt, time)
    this.updateTurrets(dt)
    this.updateShields(dt)
    this.updatePuddles(dt)
    this.updateAuras(time)
    this.updateCrowns(time)
    this.updatePickups(dt, time)
    this.weapons.update(dt)

    if (this.statBlock.regen > 0 && this.hp < this.statBlock.maxHp) {
      this.hp = Math.min(this.statBlock.maxHp, this.hp + (this.statBlock.regen * dt) / 1000)
    }

    this.syncUi(seconds)
    if (seconds >= BEDTIME) {
      this.hud.showBanner('Bedtime! 🌙', P.lavender)
      this.endRun(this.bossBeaten, false, true)
    }
  }

  private applyZoom(): void {
    const zoom = Phaser.Math.Clamp(Math.min(this.scale.width, this.scale.height) / WORLD_VIEW, 0.55, 2.4)
    this.cameras.main.setZoom(zoom)
    const view = this.cameras.main.worldView
    this.backdrop.setSize(Math.ceil(view.width) + 8, Math.ceil(view.height) + 8)
  }

  private updateView(): void {
    const view = this.cameras.main.worldView
    this.viewRect.setTo(view.x, view.y, view.width, view.height)
    if (
      Math.abs(this.backdrop.width - view.width) > 4 ||
      Math.abs(this.backdrop.height - view.height) > 4
    ) {
      this.backdrop.setSize(Math.ceil(view.width) + 8, Math.ceil(view.height) + 8)
    }
    this.backdrop.setPosition(view.centerX, view.centerY)
    // tilePosition is in texture pixels, so the world offset has to be divided
    // by the tile scale to keep the meadow pinned to the world as it scrolls.
    this.backdrop.setTilePosition(view.x / this.levelDef.tileScale, view.y / this.levelDef.tileScale)
  }

  private get hud(): HudScene {
    return this.scene.get<HudScene>('Hud')
  }

  private updatePlayer(): void {
    const stick = this.hud.moveVector
    let vx = stick.x
    let vy = stick.y
    const down = (keys: Phaser.Input.Keyboard.Key[]): boolean => keys.some((k) => k.isDown)
    if (down(this.keys.left)) vx -= 1
    if (down(this.keys.right)) vx += 1
    if (down(this.keys.up)) vy -= 1
    if (down(this.keys.down)) vy += 1

    const magnitude = Math.hypot(vx, vy)
    if (magnitude > 1) {
      vx /= magnitude
      vy /= magnitude
    }
    const speed = this.statBlock.moveSpeed
    this.player.body?.velocity.set(vx * speed, vy * speed)

    if (magnitude > 0.08) {
      const len = Math.hypot(vx, vy) || 1
      this.facingVec = { x: vx / len, y: vy / len }
      if (Math.abs(vx) > 0.05) this.player.setFlipX(vx < 0)
      // A little side-to-side waddle while walking, faster when running.
      this.player.setRotation(Math.sin(this.time.now * (0.012 + magnitude * 0.008)) * 0.1 * Math.min(1, magnitude))
    } else if (this.player.rotation !== 0) {
      this.player.setRotation(this.player.rotation * 0.8)
    }

    // Blink after being bonked.
    if (this.time.now < this.hurtFlashUntil || this.elapsedMs < this.invulnUntil) {
      this.player.setAlpha(Math.sin(this.time.now / 45) > 0 ? 0.35 : 1)
    } else if (this.player.alpha !== 1) {
      this.player.setAlpha(1)
    }
  }

  // ----------------------------------------------------------------- spawning

  /** The level's difficulty right now, with Grumpier mode folded in. */
  private difficulty(): { hp: number; speed: number; damage: number } {
    const diff = difficultyAt(this.elapsedMs / 1000, this.levelDef.ramp)
    // Endless: an extra push on top, so a strong build can't coast forever.
    const extra = this.bossBeaten ? 1 + ((this.elapsedMs - this.bossBeatenAt) / 60000) * ENDLESS_TOUGHEN_PER_MIN : 1
    const hp = diff.hp * extra * (this.grumpier ? GRUMPIER.hp : 1)
    const damage = diff.damage * extra * (this.grumpier ? GRUMPIER.damage : 1)
    const speed = diff.speed * (this.grumpier ? GRUMPIER.speed : 1)
    return { hp, speed, damage }
  }

  /** Turns the level's scripted moments into callbacks, in time order. */
  private buildTimeline(): TimedEvent[] {
    return this.levelDef.events
      .map((event): TimedEvent => {
        switch (event.kind) {
          case 'ring':
            return { at: event.at, fn: () => this.spawnRing(event.enemy, event.count) }
          case 'stampede':
            return { at: event.at, fn: () => this.spawnStampede(event.enemy, event.count) }
          case 'elite':
            return { at: event.at, fn: () => this.spawnChampion('elite', event.enemy) }
          case 'miniboss':
            return { at: event.at, fn: () => this.spawnChampion('miniboss', event.enemy) }
          case 'boss':
            return { at: event.at, fn: () => this.spawnBoss() }
          case 'banner':
            return { at: event.at, fn: () => this.hud.showBanner(event.text, event.color) }
        }
      })
      .sort((a, b) => a.at - b.at)
  }

  private runTimeline(seconds: number): void {
    while (this.nextEventIndex < this.timedEvents.length && seconds >= this.timedEvents[this.nextEventIndex].at) {
      this.timedEvents[this.nextEventIndex].fn()
      this.nextEventIndex++
    }
  }

  /** After the boss: a steady stream of chest-carrying champions, forever. */
  private runEndless(seconds: number): void {
    if (!this.endless || seconds < this.nextEndlessChampion) return
    this.nextEndlessChampion = seconds + ENDLESS_MINIBOSS_EVERY
    const champions = levelChampions(this.levelDef)
    if (champions.length === 0) return
    const pick = champions[this.championCycle % champions.length]
    this.championCycle++
    this.spawnChampion(pick.kind, pick.enemy)
  }

  private liveEnemyCount(): number {
    return this.enemyGroup.countActive(true) - (this.presents?.count ?? 0)
  }

  private spawnWave(dt: number, seconds: number): void {
    const { rate, pool } = activeWaves(seconds, this.levelDef.waves)
    if (pool.length === 0) return
    let mult = this.grumpier ? GRUMPIER.spawnRate : 1
    if (this.bossBeaten) mult *= 1 + ((this.elapsedMs - this.bossBeatenAt) / 60000) * ENDLESS_RATE_PER_MIN
    this.spawnAccumulator += (rate * mult * dt) / 1000
    while (this.spawnAccumulator >= 1) {
      this.spawnAccumulator -= 1
      if (this.liveEnemyCount() >= this.levelDef.maxLive) {
        this.spawnAccumulator = 0
        break
      }
      this.spawnEnemy(ENEMIES[pool[Math.floor(Math.random() * pool.length)]], Math.random() * Math.PI * 2)
    }
  }

  /** Puts a Grump just outside the view, at `angle` around the player. */
  private spawnEnemy(def: EnemyDef, angle: number, distanceScale = 1, elite = false, force = false): Enemy | null {
    const rx = (this.viewRect.width / 2 + 70) * distanceScale
    const ry = (this.viewRect.height / 2 + 70) * distanceScale
    const x = this.player.x + Math.cos(angle) * rx
    const y = this.player.y + Math.sin(angle) * ry
    let enemy = this.enemyGroup.get(x, y) as Enemy | null
    // A boss or chest-carrier must turn up even if the pool is full: make room
    // by retiring the farthest ordinary Grump.
    if (!enemy && force && this.recycleFarthest()) enemy = this.enemyGroup.get(x, y) as Enemy | null
    if (!enemy) return null
    enemy.spawn(def, x, y, this.difficulty(), { elite })
    this.afterSpawn(enemy)
    return enemy
  }

  private recycleFarthest(): boolean {
    let far: Enemy | null = null
    let farSq = -1
    for (const child of this.enemyGroup.getChildren()) {
      const enemy = child as Enemy
      if (!enemy.active || enemy.carriesChest || enemy.def.isBoss || enemy.def.behavior === 'still') continue
      const d = (enemy.x - this.player.x) ** 2 + (enemy.y - this.player.y) ** 2
      if (d > farSq) {
        farSq = d
        far = enemy
      }
    }
    if (!far) return false
    this.retireEnemy(far)
    return true
  }

  /** Per-spawn setup shared by every way a Grump can appear. */
  private afterSpawn(enemy: Enemy): void {
    if (enemy.def.behavior === 'swarm') this.aimSwarm(enemy, this.player.x, this.player.y)
    if (this.elapsedMs < this.napUntil) enemy.setTint(NAP_TINT)
  }

  private aimSwarm(enemy: Enemy, tx: number, ty: number): void {
    const angle = Math.atan2(ty - enemy.y, tx - enemy.x)
    enemy.swarmX = Math.cos(angle)
    enemy.swarmY = Math.sin(angle)
  }

  private spawnPresent(x: number, y: number, texture: string, cellKey: string): Enemy | null {
    const enemy = this.enemyGroup.get(x, y) as Enemy | null
    if (!enemy) return null
    enemy.spawn(ENEMIES.present, x, y, { hp: 1, speed: 0, damage: 0 }, { texture })
    enemy.propKey = cellKey
    enemy.setDepth(DEPTH.present)
    return enemy
  }

  private spawnRing(id: EnemyId, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.liveEnemyCount() >= this.levelDef.maxLive + 10) break
      this.spawnEnemy(ENEMIES[id], (i / count) * Math.PI * 2, 0.92)
    }
    this.hud.showBanner('Here they come!', P.pinkHot)
  }

  /**
   * A line of Grumps charging across the screen from one side. They don't
   * chase, so the answer is to step out of the way — a different kind of
   * danger from everything else on screen.
   */
  private spawnStampede(id: EnemyId, count: number): void {
    const def = ENEMIES[id]
    const dir = Math.random() * Math.PI * 2
    const dx = Math.cos(dir)
    const dy = Math.sin(dir)
    const reach = Math.hypot(this.viewRect.width, this.viewRect.height) / 2 + 60
    const width = Math.max(this.viewRect.width, this.viewRect.height) * 0.9
    const diff = this.difficulty()
    for (let i = 0; i < count; i++) {
      const across = (i / Math.max(1, count - 1) - 0.5) * width
      const x = this.player.x - dx * reach - dy * across + (Math.random() - 0.5) * 40
      const y = this.player.y - dy * reach + dx * across + (Math.random() - 0.5) * 40
      const enemy = this.enemyGroup.get(x, y) as Enemy | null
      if (!enemy) break
      enemy.spawn(def, x, y, { ...diff, speed: diff.speed * 1.45 })
      this.afterSpawn(enemy)
      enemy.swarmX = dx
      enemy.swarmY = dy
    }
    this.hud.showBanner('Stampede!', P.coral)
    sfx.play('boss', 0)
  }

  /**
   * Extra toughness for bosses, mini-bosses and elites, from the player's level.
   *
   * A build's damage grows much faster than the level's linear ramp, so without
   * this a strong run deletes a boss in two seconds and the big moment of the
   * level is over before it's begun. Scaling by level (rather than by, say,
   * damage dealt) keeps it simple and predictable, and shop upgrades still
   * show up as faster boss fights — which is the point of buying them.
   */
  private championHpMult(): number {
    return 1 + (this.level / 11) ** 1.7
  }

  private toughen(enemy: Enemy): void {
    const mult = this.championHpMult()
    enemy.maxHp = Math.round(enemy.maxHp * mult)
    enemy.hp = enemy.maxHp
    // ...but a softer bump: like enemy shots, champions only get half the
    // level's damage ramp, or a boss's charge late in a run takes a third of
    // your hearts in one go.
    const ramp = 1 + (this.difficulty().damage - 1) * 0.5
    enemy.contactDamage = Math.round(enemy.def.damage * ramp * (enemy.elite ? ELITE.damage : 1))
  }

  private spawnChampion(kind: 'elite' | 'miniboss', id: EnemyId): void {
    const def = ENEMIES[id]
    const enemy = this.spawnEnemy(def, Math.random() * Math.PI * 2, 0.85, kind === 'elite', true)
    if (!enemy) return
    this.toughen(enemy)
    this.champions.push(enemy)
    if (kind === 'elite') {
      const crown = this.add.image(enemy.x, enemy.y, 'fx-crown').setScale(ART_SCALE).setDepth(DEPTH.crown)
      this.crowns.set(enemy, crown)
    }
    this.hud.showBanner(kind === 'elite' ? `A Big ${def.name}! 🎁` : `A ${def.name} appears! 🎁`, P.grumpRed)
    sfx.play('boss', 0)
  }

  private spawnBoss(): void {
    const def = ENEMIES[this.levelDef.boss]
    const boss = this.spawnEnemy(def, Math.random() * Math.PI * 2, 0.85, false, true)
    if (boss) {
      this.toughen(boss)
      this.champions.unshift(boss)
      this.hud.showBanner(`${def.name.toUpperCase()} IS CROSS!`, P.gold)
      sfx.play('boss', 0)
      this.cameras.main.shake(400, 0.006)
    }
  }

  // ----------------------------------------------------------------- enemies

  private updateEnemies(dt: number, time: number): void {
    const px = this.player.x
    const py = this.player.y
    const napping = this.elapsedMs < this.napUntil
    for (const child of this.enemyGroup.getChildren()) {
      const enemy = child as Enemy
      if (!enemy.active) continue

      if (enemy.flashTimer > 0) {
        enemy.flashTimer -= dt
        if (enemy.flashTimer <= 0) {
          enemy.clearTint()
          if (napping) enemy.setTint(NAP_TINT)
        }
      }

      const body = enemy.body
      if (enemy.def.behavior === 'still') {
        body.velocity.set(0, 0)
        continue
      }

      const dx = px - enemy.x
      const dy = py - enemy.y
      const dist = Math.hypot(dx, dy) || 1

      if (dist > DESPAWN_DISTANCE && !enemy.carriesChest) {
        this.retireEnemy(enemy)
        continue
      }
      // A chest-carrier that wanders off gets popped back into play just
      // outside the view, so a child never loses track of their treasure.
      if (dist > CHAMPION_LEASH && enemy.carriesChest) {
        const angle = Math.atan2(this.facingVec.y, this.facingVec.x) + (Math.random() - 0.5)
        body.reset(px + Math.cos(angle) * (this.viewRect.width / 2 + 80), py + Math.sin(angle) * (this.viewRect.height / 2 + 80))
      }

      if (napping) {
        body.velocity.set(0, 0)
        continue
      }

      if (enemy.knockTimer > 0) {
        enemy.knockTimer -= dt
        continue
      }

      const nx = dx / dist
      const ny = dy / dist
      // Grumps glare at you: the art faces right, so flip when you're to the left.
      enemy.setFlipX(dx < 0)
      if (enemy.pendingMove < 0) enemy.setRotation(Math.sin(time * 0.009 + enemy.uid * 1.7) * 0.07)

      if (enemy.def.moves && updateBossMoves(enemy, dt, this)) continue

      // A Grump that walked into a bush last frame sidesteps for a moment.
      // Without this, anything heading straight at the player just presses into
      // the bush forever and the forest becomes a set of safe pockets.
      if (enemy.detourTimer <= 0 && !body.touching.none) {
        enemy.detourTimer = 550
        enemy.detourSign = enemy.uid % 2 === 0 ? 1 : -1
      }
      if (enemy.detourTimer > 0) enemy.detourTimer -= dt
      const detour = enemy.detourTimer > 0 ? enemy.detourSign * 1.15 : 0

      // Stampeders and swarmers never turn: they charge straight on.
      if (enemy.swarmX !== 0 || enemy.swarmY !== 0) {
        body.velocity.set(enemy.swarmX * enemy.speed, enemy.swarmY * enemy.speed)
        enemy.setFlipX(enemy.swarmX < 0)
        continue
      }

      switch (enemy.def.behavior) {
        case 'chase':
        case 'split':
        case 'swarm': {
          const angle = Math.atan2(dy, dx) + detour
          body.velocity.set(Math.cos(angle) * enemy.speed, Math.sin(angle) * enemy.speed)
          break
        }

        case 'drift': {
          // Wanders around its approach line so a swarm looks alive rather than
          // like a single arrow pointed at the player.
          const wobble = Math.sin((time + enemy.uid * 137) * 0.0035) * 0.9
          const angle = Math.atan2(dy, dx) + wobble + detour
          body.velocity.set(Math.cos(angle) * enemy.speed, Math.sin(angle) * enemy.speed)
          break
        }

        case 'dash': {
          enemy.behaviorTimer -= dt
          if (enemy.behaviorTimer <= 0) {
            if (enemy.dashing) {
              enemy.dashing = false
              enemy.behaviorTimer = enemy.def.dashInterval ?? 1700
            } else {
              enemy.dashing = true
              enemy.behaviorTimer = 420
              const dashSpeed = (enemy.def.dashSpeed ?? 220) * (enemy.speed / enemy.def.speed)
              body.velocity.set(nx * dashSpeed, ny * dashSpeed)
              enemy.setScale(enemy.baseScale * 1.15)
              this.tweens.add({
                targets: enemy,
                scale: enemy.baseScale,
                duration: 300,
              })
            }
          }
          if (!enemy.dashing) body.velocity.set(nx * enemy.speed * 0.4, ny * enemy.speed * 0.4)
          break
        }

        case 'shooter': {
          // Hovers at a polite distance and rains on you from there.
          if (dist > 330) {
            const angle = Math.atan2(dy, dx) + detour
            body.velocity.set(Math.cos(angle) * enemy.speed, Math.sin(angle) * enemy.speed)
          } else if (dist < 210) body.velocity.set(-nx * enemy.speed, -ny * enemy.speed)
          else body.velocity.set(-ny * enemy.speed * 0.8, nx * enemy.speed * 0.8)

          enemy.behaviorTimer -= dt
          if (enemy.behaviorTimer <= 0 && dist < 560) {
            enemy.behaviorTimer = enemy.def.shootCooldown ?? 2000
            const count = enemy.def.shootCount ?? 1
            const spread = enemy.def.shootSpread ?? 0
            const aim = Math.atan2(dy, dx)
            for (let i = 0; i < count; i++) {
              const offset = count === 1 ? 0 : (i - (count - 1) / 2) * spread
              this.fireFoeShot(
                enemy,
                aim + offset,
                enemy.def.shootSpeed ?? 170,
                enemy.def.shootDamage ?? 8,
                enemy.def.shootTexture ?? 'proj-raindrop',
              )
            }
          }
          break
        }
      }
    }
  }

  private retireEnemy(enemy: Enemy): void {
    // A dash's squash tween would otherwise carry on into whatever reuses the slot.
    this.tweens.killTweensOf(enemy)
    const crown = this.crowns.get(enemy)
    if (crown) {
      crown.destroy()
      this.crowns.delete(enemy)
    }
    enemy.retire()
  }

  // ------------------------------------------------------------------- shots

  private updateShots(dt: number): void {
    const dtSec = dt / 1000
    const view = this.viewRect
    for (const child of this.shotGroup.getChildren()) {
      const shot = child as Shot
      if (!shot.active) continue
      shot.lifespan -= dt
      if (shot.lifespan <= 0) {
        shot.retire()
        continue
      }
      if (shot.spin) shot.rotation += (shot.spin * Math.PI * dtSec) / 180

      const body = shot.body
      switch (shot.mode) {
        case 'homing': {
          // A pooled Grump can be recycled into a new one (or a present) the
          // frame its predecessor dies, so check it's still the one we aimed at.
          const target = shot.target
          if (!target || !target.active || target.uid !== shot.targetUid || target.def.behavior === 'still') {
            shot.target = this.nearestEnemy(shot.x, shot.y, 300)
            shot.targetUid = shot.target?.uid ?? 0
          }
          if (shot.target) {
            const desired = Math.atan2(shot.target.y - shot.y, shot.target.x - shot.x)
            const current = Math.atan2(body.velocity.y, body.velocity.x)
            const turn = Phaser.Math.Clamp(
              Phaser.Math.Angle.Wrap(desired - current),
              -shot.turnRate * dtSec,
              shot.turnRate * dtSec,
            )
            const angle = current + turn
            body.velocity.set(Math.cos(angle) * shot.speed, Math.sin(angle) * shot.speed)
            if (shot.faceTravel) shot.setRotation(angle)
          }
          break
        }

        case 'boomerang': {
          if (!shot.returning) {
            shot.outTravelled += shot.speed * dtSec
            if (shot.outTravelled >= shot.outRange) shot.returning = true
          } else {
            const angle = Math.atan2(this.player.y - shot.y, this.player.x - shot.x)
            body.velocity.set(Math.cos(angle) * shot.speed, Math.sin(angle) * shot.speed)
            // Caught! Clear the hit list so the next throw can hit again.
            if (Phaser.Math.Distance.Between(shot.x, shot.y, this.player.x, this.player.y) < 24) {
              shot.retire()
              continue
            }
          }
          break
        }

        case 'bounce': {
          const inset = 12
          if (shot.x < view.x + inset && body.velocity.x < 0) body.velocity.x *= -1
          if (shot.x > view.right - inset && body.velocity.x > 0) body.velocity.x *= -1
          if (shot.y < view.y + inset && body.velocity.y < 0) body.velocity.y *= -1
          if (shot.y > view.bottom - inset && body.velocity.y > 0) body.velocity.y *= -1
          break
        }

        case 'rain':
          if (shot.y > view.bottom + 60) shot.retire()
          break

        case 'straight':
          break
      }
    }
  }

  private updateFoeShots(dt: number): void {
    const shields = this.shieldGroup.getChildren() as Shield[]
    const napping = this.elapsedMs < this.napUntil
    for (const child of this.foeShotGroup.getChildren()) {
      const shot = child as Shot
      if (!shot.active) continue
      shot.lifespan -= dt
      const tooFar = Phaser.Math.Distance.Between(shot.x, shot.y, this.player.x, this.player.y) > 1200
      // Nap Time puts the Grumps' shots to sleep too, rather than leaving them
      // hanging in the air: a bedtime that still hurts isn't much of a bedtime.
      if (shot.lifespan <= 0 || tooFar || napping) {
        if (napping) this.puffs.emitParticleAt(shot.x, shot.y, 1)
        shot.retire()
        continue
      }
      if (shot.spin) shot.rotation += (shot.spin * Math.PI * dt) / 180000
      // Only *enemy* shots are checked here: an umbrella that also stopped the
      // player's own bubbles would be a downgrade, not a treat.
      for (const shield of shields) {
        if (!shield.active) continue
        const reach = shield.blockRadius
        if ((shot.x - shield.x) ** 2 + (shot.y - shield.y) ** 2 > reach * reach) continue
        this.puffs.emitParticleAt(shot.x, shot.y, 3)
        sfx.play('pop', 60)
        shot.retire()
        break
      }
    }
  }

  // ---------------------------------------------------------------- orbiters

  private updateOrbiters(dt: number, time: number): void {
    const dtSec = dt / 1000
    const px = this.player.x
    const py = this.player.y
    let maxRadius = 0
    const live: Orbiter[] = []

    for (const child of this.orbiterGroup.getChildren()) {
      const orbiter = child as Orbiter
      if (!orbiter.active) continue
      if (orbiter.lifespan !== Infinity) {
        orbiter.lifespan -= dt
        if (orbiter.lifespan <= 0) {
          orbiter.retire()
          continue
        }
      }
      orbiter.prevAngle = orbiter.orbitAngle
      orbiter.orbitAngle += orbiter.angularSpeed * dtSec
      orbiter.setPosition(
        px + Math.cos(orbiter.orbitAngle) * orbiter.orbitRadius,
        py + Math.sin(orbiter.orbitAngle) * orbiter.orbitRadius,
      )
      if (orbiter.spin) orbiter.rotation += (orbiter.spin * Math.PI * dtSec) / 180
      maxRadius = Math.max(maxRadius, orbiter.orbitRadius)
      live.push(orbiter)
    }

    if (live.length === 0) return

    // Shortlist once, then test each satellite against it — much cheaper than
    // walking the whole swarm per satellite.
    const reach = maxRadius + 70
    const nearby: Enemy[] = []
    for (const child of this.enemyGroup.getChildren()) {
      const enemy = child as Enemy
      if (!enemy.active) continue
      if ((enemy.x - px) ** 2 + (enemy.y - py) ** 2 <= (reach + enemy.worldRadius) ** 2) nearby.push(enemy)
    }

    // Swept-arc test rather than "is the Grump next to the satellite right now".
    // A ring of three spikes only revisits a given angle about once a second,
    // while a Grump crosses the spike band in about half of that — so a point
    // test lets most of them walk straight through the ring untouched, which
    // quietly makes every orbit weapon far weaker than its numbers suggest.
    for (const orbiter of live) {
      const swept = orbiter.orbitAngle - orbiter.prevAngle
      const lo = Math.min(0, swept)
      const hi = Math.max(0, swept)
      for (const enemy of nearby) {
        if (!enemy.active || !orbiter.canHit(enemy.uid, time)) continue
        const dx = enemy.x - px
        const dy = enemy.y - py
        const reach = orbiter.hitRadius + enemy.worldRadius
        // Is the Grump in the ring's band at all?
        if (Math.abs(Math.hypot(dx, dy) - orbiter.orbitRadius) > reach) continue
        // ...and did the satellite sweep across it this frame?
        const pad = reach / Math.max(20, orbiter.orbitRadius)
        const rel = Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - orbiter.prevAngle)
        if (rel < lo - pad || rel > hi + pad) continue
        orbiter.markHit(enemy.uid, time)
        this.damageEnemy(enemy, orbiter.damage, Math.atan2(dy, dx))
      }
    }
  }

  private updateTurrets(dt: number): void {
    for (const child of this.turretGroup.getChildren()) {
      const turret = child as Turret
      if (!turret.active) continue
      turret.lifespan -= dt
      if (turret.lifespan <= 0) {
        this.puffs.emitParticleAt(turret.x, turret.y, 6)
        turret.retire()
        continue
      }
      if (turret.lifespan < 900) turret.setAlpha(0.4 + 0.6 * Math.abs(Math.sin(turret.lifespan / 90)))
      turret.timer -= dt
      if (turret.timer > 0) continue
      turret.timer = turret.cooldown
      const target = this.nearestEnemy(turret.x, turret.y, 430)
      if (!target) continue
      const angle = Math.atan2(target.y - turret.y, target.x - turret.x)
      // A little hop when it fires.
      turret.setScale(ART_SCALE * 1.1, ART_SCALE * 0.9)
      this.tweens.add({ targets: turret, scaleX: ART_SCALE, scaleY: ART_SCALE, duration: 140 })
      this.fireShot({
        texture: turret.shotTexture,
        x: turret.x,
        y: turret.y - 8,
        vx: Math.cos(angle) * turret.shotSpeed,
        vy: Math.sin(angle) * turret.shotSpeed,
        damage: turret.damage,
        pierce: turret.pierce,
        lifespan: 2200,
        scale: turret.shotScale,
        mode: 'straight',
        spin: 200,
      })
    }
  }

  /**
   * Keeps the umbrella parked behind the player, pointing away from wherever
   * they're heading — so it's between them and anything chasing from behind.
   * Domes just sit on the player.
   */
  private positionShield(shield: Shield): void {
    if (shield.dome) {
      shield.setPosition(this.player.x, this.player.y)
      return
    }
    const facing = this.facingVec
    const angle = Math.atan2(-facing.y, -facing.x)
    shield.setPosition(
      this.player.x + Math.cos(angle) * shield.offset,
      this.player.y + Math.sin(angle) * shield.offset,
    )
    shield.setRotation(angle)
  }

  private updateShields(dt: number): void {
    for (const child of this.shieldGroup.getChildren()) {
      const shield = child as Shield
      if (!shield.active) continue
      shield.lifespan -= dt
      if (shield.lifespan <= 0) {
        this.puffs.emitParticleAt(shield.x, shield.y, 4)
        shield.retire()
        continue
      }
      if (shield.lifespan < 300) shield.setAlpha(shield.lifespan / 300)
      this.positionShield(shield)
      if (shield.dome) shield.rotation += dt * 0.0006
      // Domes shove and sting anything that gets inside them.
      if (shield.damage > 0) {
        shield.pulseTimer -= dt
        if (shield.pulseTimer <= 0) {
          shield.pulseTimer = 420
          for (const other of this.enemyGroup.getChildren()) {
            const enemy = other as Enemy
            if (!enemy.active) continue
            const dx = enemy.x - shield.x
            const dy = enemy.y - shield.y
            if (dx * dx + dy * dy > (shield.blockRadius + enemy.worldRadius) ** 2) continue
            this.damageEnemy(enemy, shield.damage, Math.atan2(dy, dx))
          }
        }
      }
    }
  }

  private updatePuddles(dt: number): void {
    for (const child of this.puddleGroup.getChildren()) {
      const puddle = child as Puddle
      if (!puddle.active || !puddle.visible) continue
      puddle.lifespan -= dt
      if (puddle.lifespan <= 0) {
        puddle.retire()
        continue
      }
      if (puddle.lifespan < 400) puddle.setAlpha((puddle.lifespan / 400) * 0.62)
      puddle.tickTimer -= dt
      if (puddle.tickTimer > 0) continue
      puddle.tickTimer = puddle.tick
      // Wobble.
      puddle.setScale((puddle.radius / 30) * ART_SCALE * (1 + Math.sin(puddle.lifespan * 0.02) * 0.04))
      for (const other of this.enemyGroup.getChildren()) {
        const enemy = other as Enemy
        if (!enemy.active) continue
        const dx = enemy.x - puddle.x
        const dy = enemy.y - puddle.y
        if (dx * dx + dy * dy > (puddle.radius + enemy.worldRadius * 0.5) ** 2) continue
        this.damageEnemy(enemy, puddle.damage, Math.atan2(dy, dx), false)
        // Sticky: Grumps wading through jelly slow right down.
        if (enemy.active && enemy.def.behavior !== 'still' && !enemy.def.isBoss) enemy.body.velocity.scale(0.3)
      }
    }
  }

  private updateAuras(time: number): void {
    for (const glow of this.auras.values()) {
      glow.setPosition(this.player.x, this.player.y)
      glow.setRotation(time * 0.0004)
    }
  }

  private updateCrowns(time: number): void {
    for (const [enemy, crown] of this.crowns) {
      if (!enemy.active) {
        crown.destroy()
        this.crowns.delete(enemy)
        continue
      }
      crown.setPosition(enemy.x, enemy.y - enemy.displayHeight * 0.5 + Math.sin(time * 0.006) * 2)
    }
  }

  // ------------------------------------------------------------------ naps

  private startNap(): void {
    this.napUntil = this.elapsedMs + NAP_MS
    this.nextNapZzz = 0
    for (const child of this.enemyGroup.getChildren()) {
      const enemy = child as Enemy
      if (enemy.active && enemy.def.behavior !== 'still') enemy.setTint(NAP_TINT)
    }
    this.hud.showBanner('Nap time! 😴', P.sky)
  }

  private updateNap(): void {
    if (this.napUntil === 0) return
    const now = this.elapsedMs
    if (now >= this.napUntil) {
      this.napUntil = 0
      for (const child of this.enemyGroup.getChildren()) {
        const enemy = child as Enemy
        if (enemy.active && enemy.flashTimer <= 0) enemy.clearTint()
      }
      return
    }
    if (now < this.nextNapZzz) return
    this.nextNapZzz = now + 450
    for (const enemy of this.randomEnemiesInView(4)) this.zzz.emitParticleAt(enemy.x, enemy.y - enemy.displayHeight * 0.4, 1)
  }

  // ---------------------------------------------------------------- pickups

  private updatePickups(dt: number, time: number): void {
    const px = this.player.x
    const py = this.player.y
    const magnetSq = this.statBlock.pickupRadius ** 2
    for (const child of this.pickupGroup.getChildren()) {
      const pickup = child as Pickup
      if (!pickup.active) continue
      pickup.lifespan -= dt
      if (pickup.lifespan <= 0) {
        pickup.retire()
        continue
      }
      if (pickup.lifespan < 2500) {
        pickup.setAlpha(Math.abs(Math.sin(pickup.lifespan / 110)))
      }

      const dx = px - pickup.x
      const dy = py - pickup.y
      const distSq = dx * dx + dy * dy
      // Chests and power-ups have to be walked right up to; they never fly in.
      const flies = pickup.kind === 'heart' || pickup.kind === 'sprinkle' || pickup.kind === 'snack'
      if (!pickup.chasing && flies && distSq < magnetSq) pickup.chasing = true

      if (pickup.chasing) {
        const dist = Math.sqrt(distSq) || 1
        const speed = pickup.magnetised
          ? 380 + dist * 1.4
          : 260 + Math.max(0, this.statBlock.pickupRadius - dist) * 1.6
        const step = Math.min(dist, speed * (dt / 1000))
        pickup.x += (dx / dist) * step
        pickup.y += (dy / dist) * step
        if (distSq < 26 * 26) this.collect(pickup)
      } else {
        pickup.y = pickup.homeY + Math.sin((time + pickup.bobPhase * 800) * 0.005) * 3
        if (!flies && distSq < 30 * 30) this.collect(pickup)
      }
    }
  }

  private collect(pickup: Pickup): void {
    const { x, y } = pickup
    switch (pickup.kind) {
      case 'heart':
        this.gainXp(pickup.value)
        sfx.play('heart', 45)
        break
      case 'sprinkle':
        this.addSprinkles(pickup.value)
        sfx.play('coin', 55)
        break
      case 'bag':
        this.addSprinkles(pickup.value)
        this.sparkles.emitParticleAt(x, y, 8)
        sfx.play('coin', 0)
        break
      case 'snack':
        this.hp = Math.min(this.statBlock.maxHp, this.hp + SNACK_HEAL)
        this.sparkles.emitParticleAt(this.player.x, this.player.y, 6)
        sfx.play('snack', 60)
        break
      case 'chest':
        pickup.retire()
        this.openModal(() => this.showChest(false))
        return
      case 'magnet':
        this.usedMagnet = true
        for (const child of this.pickupGroup.getChildren()) {
          const other = child as Pickup
          if (!other.active || (other.kind !== 'heart' && other.kind !== 'sprinkle')) continue
          other.chasing = true
          other.magnetised = true
        }
        this.hud.showBanner('Friendship Magnet! 🧲', P.pinkHot)
        sfx.play('magnet', 0)
        break
      case 'bomb':
        this.usedBomb = true
        pickup.retire()
        this.cuddleBomb()
        return
      case 'freeze':
        this.usedFreeze = true
        this.startNap()
        sfx.play('nap', 0)
        break
    }
    pickup.retire()
  }

  /** Everything that multiplies a sprinkle picked up in this run. */
  private sprinkleFactor(): number {
    return this.statBlock.sprinkleMult * this.levelDef.sprinkleMult * (this.grumpier ? GRUMPIER.sprinkles : 1)
  }

  private addSprinkles(amount: number): void {
    this.sprinklesCollected += amount * this.sprinkleFactor()
  }

  /** Squishes every ordinary Grump on screen, and knocks a chunk off the big ones. */
  private cuddleBomb(): void {
    const view = this.viewRect
    const px = this.player.x
    const py = this.player.y
    for (const child of this.enemyGroup.getChildren()) {
      const enemy = child as Enemy
      if (!enemy.active || enemy.def.behavior === 'still') continue
      if (!view.contains(enemy.x, enemy.y)) continue
      const angle = Math.atan2(enemy.y - py, enemy.x - px)
      if (enemy.carriesChest || enemy.def.isBoss) this.damageEnemy(enemy, enemy.maxHp * 0.12, angle, false, false)
      else this.killEnemy(enemy, angle)
    }
    const ring = this.add.image(px, py, 'fx-ring').setDepth(DEPTH.shockwave).setTint(P.pinkHot).setScale(ART_SCALE * 0.5)
    this.tweens.add({
      targets: ring,
      scale: ART_SCALE * 14,
      alpha: 0,
      duration: 520,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    })
    this.cameras.main.flash(260, 255, 220, 240)
    this.cameras.main.shake(300, 0.008)
    this.hud.showBanner('CUDDLE BOMB! 💣', P.pinkHot)
    sfx.play('bomb', 0)
  }

  private dropPickup(kind: PickupKind, x: number, y: number, value: number): void {
    // Rather than letting the floor fill up with hundreds of tiny hearts (or
    // dropping them once the pool runs out, which loses XP), fold a new heart
    // into one already lying close by. Bigger hearts get bigger art.
    if (kind === 'heart' && this.pickupGroup.countActive(true) > HEART_MERGE_ABOVE) {
      const near = this.nearestHeart(x, y, 90)
      if (near) {
        near.absorb(value)
        return
      }
    }
    let pickup = this.pickupGroup.get(x, y) as Pickup | null
    if (!pickup) {
      if (kind === 'heart') {
        this.nearestHeart(x, y, Infinity)?.absorb(value)
        return
      }
      // Pool's full, but a chest or a power-up must never just vanish: fold a
      // heart into its neighbour and reuse its slot.
      const spare = this.nearestHeart(x, y, Infinity)
      if (!spare) return
      spare.retire()
      this.nearestHeart(spare.x, spare.y, Infinity)?.absorb(spare.value)
      pickup = this.pickupGroup.get(x, y) as Pickup | null
      if (!pickup) return
    }
    pickup.drop(kind, x, y, value)
  }

  private nearestHeart(x: number, y: number, maxDist: number): Pickup | null {
    let best: Pickup | null = null
    let bestSq = maxDist * maxDist
    for (const child of this.pickupGroup.getChildren()) {
      const pickup = child as Pickup
      if (!pickup.active || pickup.kind !== 'heart' || pickup.chasing) continue
      const d = (pickup.x - x) ** 2 + (pickup.y - y) ** 2
      if (d < bestSq) {
        bestSq = d
        best = pickup
      }
    }
    return best
  }

  /** What falls out of a popped present. */
  private dropPresentPrize(x: number, y: number): void {
    const total = PRESENT_TABLE.reduce((sum, row) => sum + row.weight, 0)
    let roll = Math.random() * total
    let prize: PickupKind | 'bigheart' = 'snack'
    for (const row of PRESENT_TABLE) {
      roll -= row.weight
      if (roll <= 0) {
        prize = row.kind
        break
      }
    }
    if (prize === 'bigheart') this.dropPickup('heart', x, y, 20 + Math.floor(this.level * 0.6))
    else if (prize === 'bag') this.dropPickup('bag', x, y, 8 + Math.floor(Math.random() * 10))
    else this.dropPickup(prize, x, y, 1)
    this.confetti.emitParticleAt(x, y, 12)
    sfx.play('present', 0)
  }

  // ----------------------------------------------------------------- damage

  private onShotHitsEnemy: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (a, b) => {
    const shot = a as Shot
    const enemy = b as Enemy
    if (!shot.active || !enemy.active) return
    if (shot.hitUids.has(enemy.uid)) return
    shot.hitUids.add(enemy.uid)
    this.damageEnemy(enemy, shot.damage, Math.atan2(shot.body.velocity.y, shot.body.velocity.x))
    if (shot.mode === 'boomerang') return // carrots plough straight through
    if (shot.pierceLeft <= 0) {
      this.puffs.emitParticleAt(shot.x, shot.y, 3)
      shot.retire()
    } else {
      shot.pierceLeft -= 1
    }
  }

  /** Bushes stop every projectile, whoever fired it. */
  private onShotHitsObstacle: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (a) => {
    const shot = a as Shot
    if (!shot.active) return
    this.puffs.emitParticleAt(shot.x, shot.y, 2)
    shot.retire()
  }

  private onEnemyTouchesPlayer: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_player, b) => {
    const enemy = b as Enemy
    if (!enemy.active || enemy.def.behavior === 'still') return
    // Napping Grumps are harmless: bedtime is bedtime.
    if (this.elapsedMs < this.napUntil) return
    this.hurtPlayer(enemy.contactDamage, enemy)
  }

  private onFoeShotHitsPlayer: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_player, b) => {
    const shot = b as Shot
    if (!shot.active) return
    shot.retire()
    this.hurtPlayer(shot.damage)
  }

  /**
   * Applies damage from any source, rolling crits here so every source can crit.
   * `knock` is false for things that hit constantly (auras, puddles), where a
   * shove every tick would pin the Grump in place.
   */
  private damageEnemy(enemy: Enemy, amount: number, fromAngle: number, knock = true, canCrit = true): void {
    const crit = canCrit && Math.random() < this.statBlock.critChance
    const dealt = Math.max(1, Math.round(amount * (crit ? this.statBlock.critMult : 1)))
    enemy.hp -= dealt

    // An additive flash brightens without erasing the face. Big Grumps get a
    // gentler one: they're hit so often that a strong flash would leave them a
    // permanent white silhouette.
    if (enemy.flashTimer <= 0) {
      const big = enemy.carriesChest || enemy.def.isBoss
      enemy.setTint(crit ? (big ? 0x6a5200 : 0xb89600) : big ? 0x4a3a3a : 0xa8a0a0)
      enemy.setTintMode(Phaser.TintModes.ADD)
      enemy.flashTimer = crit ? 110 : 70
    }

    if (crit) this.sparkles.emitParticleAt(enemy.x, enemy.y, 3)

    if (enemy.hp <= 0) {
      this.killEnemy(enemy, fromAngle)
      return
    }

    // Little shove, scaled down for the big ones so bosses don't get pinballed.
    if (knock && !enemy.def.isBoss && enemy.def.behavior !== 'still' && enemy.chargeLeft <= 0) {
      const push = enemy.carriesChest ? 50 : 150
      enemy.body.velocity.set(Math.cos(fromAngle) * push, Math.sin(fromAngle) * push)
      enemy.knockTimer = 90
    }
    sfx.play('pop', 45)
  }

  /** A cartoon puff of smoke where a Grump used to be. */
  private poof(x: number, y: number, size: number): void {
    const cloud = this.poofs.get(x, y, 'fx-poof') as Phaser.GameObjects.Image | null
    if (!cloud) return
    cloud.setActive(true).setVisible(true).setDepth(DEPTH.weaponFx).setAlpha(0.95)
    cloud.setScale(ART_SCALE * size * 0.5).setRotation(Math.random() * Math.PI)
    this.tweens.add({
      targets: cloud,
      scale: ART_SCALE * size,
      alpha: 0,
      duration: 320,
      ease: 'Quad.easeOut',
      onComplete: () => {
        cloud.setActive(false).setVisible(false)
      },
    })
  }

  /**
   * The little glint a Grump leaves as it pops: springs up past full size,
   * turns a quarter, and shrinks away. Pooled, so a Cuddle Bomb that clears
   * the screen just runs out of twinkles rather than making hundreds.
   */
  private twinkle(x: number, y: number, size: number): void {
    const star = this.twinkles.get(x, y, 'fx-twinkle') as Phaser.GameObjects.Image | null
    if (!star) return
    const full = ART_SCALE * size
    const spin = (Math.random() < 0.5 ? -1 : 1) * 0.9
    star.setActive(true).setVisible(true).setDepth(DEPTH.twinkle).setAlpha(1).setScale(0)
    star.setRotation(Math.random() * 0.4 - 0.2)
    const start = star.rotation
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 420,
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0
        // Pop in over the first quarter with a little overshoot, then shrink out.
        const grow = t < 0.25 ? Phaser.Math.Easing.Back.Out(t / 0.25) : 1 - Phaser.Math.Easing.Quadratic.In((t - 0.25) / 0.75)
        star.setScale(full * grow)
        star.setRotation(start + spin * t)
        star.setAlpha(t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4)
      },
      onComplete: () => {
        star.setActive(false).setVisible(false)
      },
    })
  }

  private killEnemy(enemy: Enemy, fromAngle: number): void {
    const { x, y, def } = enemy
    if (def.behavior === 'still') {
      this.presentsPopped += 1
      this.presents?.pop(enemy.propKey)
      this.poof(x, y, 1)
      this.dropPresentPrize(x, y)
      this.retireEnemy(enemy)
      return
    }

    this.kills += 1
    this.poof(x, y, Math.max(0.8, enemy.worldRadius / 14))
    if (!def.isBoss) this.twinkle(x, y - enemy.worldRadius * 0.25, Phaser.Math.Clamp(enemy.worldRadius / 13, 0.75, 1.8))
    this.confetti.emitParticleAt(x, y, def.isBoss ? 40 : enemy.carriesChest ? 16 : 3)
    this.puffs.emitParticleAt(x, y, def.isBoss ? 30 : 2)
    if (def.isBoss || enemy.carriesChest) this.sparkles.emitParticleAt(x, y, 24)

    this.dropPickup('heart', x, y, enemy.xpValue)
    if (Math.random() < def.sprinkleChance || enemy.elite) {
      const value = def.isBoss ? 120 : enemy.carriesChest ? 30 : 1
      this.dropPickup('sprinkle', x + 6, y + 6, value)
    }
    if ((def.snackChance && Math.random() < def.snackChance) || enemy.elite) {
      this.dropPickup('snack', x - 8, y + 4, 1)
    }
    // Bosses open their chest on the spot; everyone else leaves it on the floor.
    if (enemy.carriesChest && !def.isBoss) this.dropPickup('chest', x, y - 4, 1)

    if (def.splitInto && def.splitCount) {
      const spawn = ENEMIES[def.splitInto]
      const diff = this.difficulty()
      for (let i = 0; i < def.splitCount; i++) {
        const child = this.enemyGroup.get(x, y) as Enemy | null
        if (!child) break
        const angle = fromAngle + Math.PI + (i - (def.splitCount - 1) / 2) * 0.9
        child.spawn(spawn, x + Math.cos(angle) * 14, y + Math.sin(angle) * 14, diff)
        this.afterSpawn(child)
      }
    }

    this.retireEnemy(enemy)
    sfx.play('squish', 60)

    const championIndex = this.champions.indexOf(enemy)
    if (championIndex < 0) return
    this.champions.splice(championIndex, 1)
    if (def.isBoss && def.id === this.levelDef.boss && !this.bossBeaten) {
      this.bossBeaten = true
      this.bossBeatenAt = this.elapsedMs
      this.cameras.main.shake(500, 0.008)
      this.hud.showBanner(`You out-cuted ${def.name}!`, P.lemon)
      sfx.play('win', 0)
      this.time.delayedCall(900, () => {
        if (this.runOver) return
        this.openModal(() => this.showChest(true))
        this.openModal(() => this.showVictory())
      })
    } else {
      this.hud.showBanner(`${enemy.displayName}: squished! 🎁`, P.mint)
    }
  }

  /**
   * Applies damage from a bump or a raindrop. `source` is the Grump responsible,
   * if any: each one carries its own cooldown so standing in a crowd takes hits
   * from all of them, throttled only by {@link HURT_GATE}.
   */
  private hurtPlayer(amount: number, source?: Enemy): void {
    const now = this.time.now
    if (this.runOver || this.elapsedMs < this.invulnUntil) return
    if (source && now < source.nextTouchAt) return
    if (now < this.hurtGateUntil) return
    if (source) source.nextTouchAt = now + ENEMY_TOUCH_COOLDOWN
    this.hurtGateUntil = now + HURT_GATE
    this.hurtFlashUntil = now + HURT_FLASH
    const dealt = Math.max(1, Math.round(amount - this.statBlock.armor))
    this.hp -= dealt
    this.cameras.main.shake(140, 0.006)
    sfx.play('hurt', 120)
    if (navigator.vibrate) navigator.vibrate(35)

    if (this.hp > 0) return

    if (this.revivesLeft > 0) {
      this.revivesLeft -= 1
      this.hp = this.statBlock.maxHp * 0.5
      this.invulnUntil = this.elapsedMs + 2200
      this.hud.showBanner('Second Wind! 🫧', P.mint)
      this.castNova(this.player.x, this.player.y, 220, 60, 'fx-nova')
      sfx.play('levelup')
      return
    }
    this.endRun(this.bossBeaten)
  }

  // ------------------------------------------------------------ progression

  private gainXp(amount: number): void {
    this.xp += amount * this.statBlock.xpMult
    let levelled = false
    while (this.xp >= this.xpNeeded) {
      this.xp -= this.xpNeeded
      this.level += 1
      this.xpNeeded = xpToNext(this.level)
      this.pendingLevelUps += 1
      levelled = true
    }
    // Only one level-up modal is ever queued: it keeps going until every
    // pending level has been spent.
    if (levelled && !this.levelUpQueued) {
      this.levelUpQueued = true
      this.openModal(() => this.showLevelUpModal())
    }
  }

  private levelUpQueued = false

  /**
   * Runs `show` now if nothing else is up, or queues it behind whatever is.
   * Each modal calls {@link closeModal} when it's done, which either shows the
   * next one in the queue or resumes the run.
   */
  private openModal(show: () => void): void {
    if (this.runOver) return
    if (this.modalOpen) {
      this.modalQueue.push(show)
      return
    }
    this.modalOpen = true
    this.hud.setStickEnabled(false)
    this.scene.pause()
    show()
  }

  private closeModal(): void {
    const next = this.modalQueue.shift()
    if (next && !this.runOver) {
      next()
      return
    }
    this.modalOpen = false
    if (this.runOver) return
    this.hud.setStickEnabled(true)
    this.scene.resume()
  }

  private rollCards(): Choice[] {
    return rollChoices(this.inventory, Math.random, choiceCount(this.statBlock.luck, Math.random), this.available, this.banished)
  }

  private showLevelUpModal(): void {
    if (this.runOver) return
    if (this.pendingLevelUps <= 0) {
      this.levelUpQueued = false
      this.closeModal()
      return
    }
    sfx.play('levelup', 0)
    this.scene.launch('LevelUp', {
      level: this.level - this.pendingLevelUps + 1,
      choices: this.rollCards(),
      rerolls: this.rerollsLeft,
      banishes: this.banishesLeft,
      onPick: (choice: Choice) => this.applyChoice(choice),
      onReroll: (): Choice[] | null => {
        if (this.rerollsLeft <= 0) return null
        this.rerollsLeft -= 1
        return this.rollCards()
      },
      onBanish: (choice: Choice, showing: readonly Choice[]): Choice | null => {
        // Snack Break and Sprinkle Stash are the fallbacks; banishing them means nothing.
        if (this.banishesLeft <= 0 || choice.kind === 'heal' || choice.kind === 'sprinkles') return null
        const key = choiceKey(choice)
        // Replace it with something not already on screen — and if there's
        // nothing left that isn't, keep the charge rather than waste it.
        const onScreen = new Set(showing.filter((c) => c !== choice).map(choiceKey))
        const hide = new Set([...this.banished, ...onScreen, key])
        const replacement = rollChoices(this.inventory, Math.random, 2, this.available, hide).find(
          (c) => !onScreen.has(choiceKey(c)),
        )
        if (!replacement) return null
        this.banishesLeft -= 1
        this.banished.add(key)
        return replacement
      },
    })
  }

  private applyChoice(choice: Choice): void {
    switch (choice.kind) {
      case 'weapon':
        grantWeapon(this.inventory, choice.id)
        break
      case 'passive':
        grantPassive(this.inventory, choice.id)
        break
      case 'heal':
        this.hp = Math.min(this.statBlock.maxHp, this.hp + SNACK_HEAL)
        break
      case 'sprinkles':
        this.sprinklesCollected += STASH_SPRINKLES
        break
    }
    this.afterLoadoutChange()
    this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1)
    if (this.pendingLevelUps > 0) {
      this.showLevelUpModal()
      return
    }
    this.levelUpQueued = false
    this.closeModal()
  }

  /** Recomputes everything that follows from the inventory. */
  private afterLoadoutChange(): void {
    const previousMax = this.statBlock.maxHp
    this.recomputeStats()
    // Max-HP upgrades heal you by the amount they added, so they always feel good.
    this.hp = Math.min(this.statBlock.maxHp, this.hp + Math.max(0, this.statBlock.maxHp - previousMax))
    this.weapons.sync(this.inventory)
    this.mostWeapons = Math.max(this.mostWeapons, this.inventory.weapons.length)
    this.maxedWeapon =
      this.maxedWeapon || this.inventory.weapons.some((w) => !isEvolution(w.id) && w.level >= maxWeaponLevel(w.id))
  }

  private showChest(boss: boolean): void {
    if (this.runOver) return
    this.chestsOpened += 1
    const size = chestSize(this.statBlock.chestLuck, Math.random, boss)
    const prizes = rollChest(this.inventory, Math.random, size)
    // What the chest screen shows is exactly what's banked.
    const bonus = Math.round((boss ? 60 : 12 + Math.random() * 18) * this.sprinkleFactor())
    sfx.play('chest', 0)
    this.scene.launch('Chest', {
      prizes,
      boss,
      sprinkles: bonus,
      onDone: () => {
        this.applyChestPrizes(prizes)
        this.sprinklesCollected += bonus
        this.closeModal()
      },
    })
  }

  private applyChestPrizes(prizes: readonly ChestPrize[]): void {
    for (const prize of prizes) {
      switch (prize.kind) {
        case 'evolve':
          if (evolveWeapon(this.inventory, prize.into)) this.evolutionsThisRun.push(prize.into)
          break
        case 'weapon':
          grantWeapon(this.inventory, prize.id)
          break
        case 'passive':
          grantPassive(this.inventory, prize.id)
          break
        case 'sprinkles':
          this.addSprinkles(prize.amount)
          break
      }
    }
    this.afterLoadoutChange()
    if (prizes.some((p) => p.kind === 'evolve')) {
      this.sparkles.emitParticleAt(this.player.x, this.player.y, 30)
      this.confetti.emitParticleAt(this.player.x, this.player.y, 30)
    }
  }

  private showVictory(): void {
    if (this.runOver) return
    const boss = ENEMIES[this.levelDef.boss]
    this.scene.launch('Victory', {
      bossName: boss.name,
      bossTexture: boss.texture,
      levelName: this.levelDef.name,
      onContinue: () => {
        this.endless = true
        this.nextEndlessChampion = this.elapsedMs / 1000 + 40
        this.hud.showBanner('Endless! How long can you last?', P.lemon)
        this.closeModal()
      },
      onHome: () => {
        this.modalQueue.length = 0
        this.modalOpen = false
        this.scene.resume()
        this.endRun(true)
      },
    })
  }

  private recomputeStats(): void {
    this.statBlock = computeStats(this.characterId, this.save.upgrades, this.inventory)
  }

  requestPause(): void {
    if (this.runOver || this.modalOpen || !this.scene.isActive()) return
    this.openModal(() =>
      this.scene.launch('Pause', {
        weapons: this.ui.weapons.map((w) => ({ ...w })),
        passives: this.ui.passives.map((p) => ({ ...p })),
        onResume: () => this.closeModal(),
        onQuit: () => {
          this.modalQueue.length = 0
          this.modalOpen = false
          this.scene.resume()
          this.endRun(this.bossBeaten, true)
        },
      }),
    )
  }

  // ---------------------------------------------------------------- run end

  private endRun(won: boolean, quit = false, bedtime = false): void {
    if (this.runOver) return
    this.runOver = true
    this.hud.setStickEnabled(false)

    const survivedSec = Math.floor(this.elapsedMs / 1000)
    const endlessSec = this.bossBeaten ? Math.floor((this.elapsedMs - this.bossBeatenAt) / 1000) : 0
    const bonus =
      Math.floor(this.kills * 0.35) + (won ? 200 : 0) + Math.floor(endlessSec / 60) * 40 + (bedtime ? 500 : 0)
    const earned = Math.floor(
      this.sprinklesCollected +
        bonus * this.statBlock.sprinkleMult * this.levelDef.sprinkleMult * (this.grumpier ? GRUMPIER.sprinkles : 1),
    )
    const evolutions = this.inventory.weapons.filter((w) => isEvolution(w.id)).map((w) => w.id)

    const before = loadSave()
    const applied = applyRunResult(before, {
      levelId: this.levelDef.id,
      characterId: this.characterId,
      sprinkles: earned,
      survivedSec,
      kills: this.kills,
      won,
      grumpier: this.grumpier,
      level: this.level,
      chestsOpened: this.chestsOpened,
      presentsPopped: this.presentsPopped,
      evolutions: this.evolutionsThisRun,
    })
    const summary: RunSummary = {
      levelId: this.levelDef.id,
      characterId: this.characterId,
      won,
      grumpier: this.grumpier,
      survivedSec,
      kills: this.kills,
      level: this.level,
      evolutions,
      mostWeapons: this.mostWeapons,
      maxedWeapon: this.maxedWeapon,
      usedMagnet: this.usedMagnet,
      usedBomb: this.usedBomb,
      usedFreeze: this.usedFreeze,
      chestsOpened: this.chestsOpened,
    }
    const { save: after, earned: stickers } = awardStickers(applied, summary)
    writeSave(after)

    sfx.play(won ? 'win' : 'lose', 0)

    const result: ResultData = {
      won,
      quit,
      bedtime,
      levelId: this.levelDef.id,
      levelName: this.levelDef.name,
      grumpier: this.grumpier,
      unlockedLevel: won ? this.newlyUnlockedLevel(before, after) : null,
      survivedSec,
      kills: this.kills,
      earned,
      level: this.level,
      characterId: this.characterId,
      newBestTime: survivedSec > (before.bestTimes[this.levelDef.id] ?? 0),
      endlessSec,
      inventory: this.inventory.weapons.map((w) => ({
        icon: WEAPONS[w.id].icon,
        name: WEAPONS[w.id].name,
        level: w.level,
        evolved: isEvolution(w.id),
      })),
      stickers,
      evolutions: this.evolutionsThisRun.filter((id) => !before.evolutionsFound.includes(id)),
    }
    // Stopped unconditionally: a modal launched earlier this frame isn't running
    // yet, and a queued stop still lands after its queued start.
    for (const modal of ['LevelUp', 'Chest', 'Victory', 'Pause']) this.scene.stop(modal)
    this.scene.start('Result', result)
  }

  /**
   * Projects the boss into screen space for the HUD's off-screen pointer.
   * `onScreen` uses a small inset so a boss half-way over the edge still counts
   * as off-screen and keeps its arrow, rather than flickering at the boundary.
   */
  private describeBoss(boss: Enemy): BossUiState {
    const zoom = this.cameras.main.zoom
    const w = this.scale.width
    const h = this.scale.height
    // Measured from the player rather than the camera's worldView: the camera
    // follows the player closely enough that the difference is invisible on an
    // edge-of-screen marker, and it keeps this out of camera internals that only
    // update during a render pass.
    const dx = (boss.x - this.player.x) * zoom
    const dy = (boss.y - this.player.y) * zoom
    const state = this.bossUi
    state.name = boss.displayName
    state.texture = boss.texture.key
    state.frac = boss.hp / boss.maxHp
    state.screenX = w / 2 + dx
    state.screenY = h / 2 + dy
    // A generous inset, so a boss creeping in at the edge keeps its marker until
    // it's properly visible instead of flickering on the boundary.
    const inset = 30
    state.onScreen = Math.abs(dx) < w / 2 - inset && Math.abs(dy) < h / 2 - inset
    return state
  }

  /** The level this win has just opened up, if any, for the results screen. */
  private newlyUnlockedLevel(before: SaveData, after: SaveData): string | null {
    for (const id of LEVEL_IDS) {
      if (!isLevelUnlocked(before, id) && isLevelUnlocked(after, id)) return LEVELS[id].name
    }
    return null
  }

  /** The champion the HUD should show: the boss if there is one, else the oldest. */
  private headlineChampion(): Enemy | null {
    if (this.champions.some((c) => !c.active)) this.champions = this.champions.filter((c) => c.active)
    return this.champions.find((c) => c.def.isBoss) ?? this.champions[0] ?? null
  }

  private syncUi(seconds: number): void {
    const ui = this.ui
    ui.hp = Math.max(0, this.hp)
    ui.maxHp = this.statBlock.maxHp
    ui.level = this.level
    ui.xpFrac = this.xpNeeded > 0 ? this.xp / this.xpNeeded : 0
    ui.xp = Math.floor(this.xp)
    ui.xpNeeded = this.xpNeeded
    ui.timeSec = seconds
    ui.kills = this.kills
    ui.sprinkles = Math.floor(this.sprinklesCollected)
    const headline = this.headlineChampion()
    ui.boss = headline ? this.describeBoss(headline) : null
    ui.bossTime = this.levelDef.bossTime
    ui.bossBeaten = this.bossBeaten
    ui.endless = this.endless
    ui.grumpier = this.grumpier
    ui.napLeft = Math.max(0, this.napUntil - this.elapsedMs)

    // Rebuilt in place rather than reallocated: this runs every frame.
    ui.weapons.length = this.inventory.weapons.length
    this.inventory.weapons.forEach((owned, i) => {
      const def = WEAPONS[owned.id]
      const slot = ui.weapons[i] ?? { icon: '', level: 0, max: 0, evolved: false }
      slot.icon = def.icon
      slot.level = owned.level
      slot.max = def.levels.length
      slot.evolved = def.evolvedFrom !== undefined
      ui.weapons[i] = slot
    })
    ui.passives.length = this.inventory.passives.length
    this.inventory.passives.forEach((owned, i) => {
      const def = PASSIVES[owned.id]
      const slot = ui.passives[i] ?? { icon: '', level: 0, max: 0 }
      slot.icon = def.icon
      slot.level = owned.level
      slot.max = def.perLevel.length
      ui.passives[i] = slot
    })
  }
}
