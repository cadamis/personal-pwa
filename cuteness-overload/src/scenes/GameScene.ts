import Phaser from 'phaser'
import { WORLD_VIEW } from '../game/constants'
import { ART_SCALE } from '../art/textures'
import { P } from '../art/palette'
import { sfx } from '../audio/sfx'
import { CHARACTERS, toCharacterId, type CharacterId } from '../data/characters'
import { ENEMIES, MAX_LIVE_ENEMIES, activeWaves, type EnemyDef, type EnemyId } from '../data/enemies'
import { LEVELS, LEVEL_IDS, toLevelId, type LevelDef } from '../data/levels'
import { WEAPONS } from '../data/weapons'
import {
  Enemy,
  Orbiter,
  Pickup,
  Shield,
  Shot,
  Turret,
  setCircleBody,
  type PickupKind,
} from '../game/entities'
import { computeStats, emptyInventory, grantPassive, grantWeapon, type Inventory } from '../game/loadout'
import { applyRunResult, isLevelUnlocked, loadSave, writeSave, type SaveData } from '../game/save'
import { difficultyAt, xpToNext, type Stats } from '../game/stats'
import { SNACK_HEAL, STASH_SPRINKLES, choiceCount, rollChoices, type Choice } from '../game/upgradePool'
import {
  WeaponSystem,
  type OrbiterRequest,
  type ShieldRequest,
  type ShotRequest,
  type TurretRequest,
  type WeaponHost,
} from '../game/weaponSystem'
import { ObstacleField } from '../game/obstacles'
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
  weapons: { icon: string; level: number; max: number }[]
  boss: BossUiState | null
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

interface TimedEvent {
  at: number
  fn: () => void
}

const RUN_SECONDS_CAP = 600
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

export class GameScene extends Phaser.Scene implements WeaponHost {
  // --- run state
  private characterId: CharacterId = 'mochi'
  private levelDef: LevelDef = LEVELS.meadow
  private save: SaveData = loadSave()
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
  private pendingLevelUps = 0
  private hurtGateUntil = 0
  private invulnUntil = 0
  private hurtFlashUntil = 0
  private revivesLeft = 0

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
  private obstacleGroup?: Phaser.Physics.Arcade.StaticGroup
  private obstacles?: ObstacleField
  private puffs!: Phaser.GameObjects.Particles.ParticleEmitter
  private sparkles!: Phaser.GameObjects.Particles.ParticleEmitter
  private weapons!: WeaponSystem
  private keys!: {
    up: Phaser.Input.Keyboard.Key[]
    down: Phaser.Input.Keyboard.Key[]
    left: Phaser.Input.Keyboard.Key[]
    right: Phaser.Input.Keyboard.Key[]
  }

  private facingVec = { x: 1, y: 0 }
  private boss: Enemy | null = null
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
    boss: null,
  }

  constructor() {
    super('Game')
  }

  init(data: { characterId?: string; levelId?: string }): void {
    this.characterId = toCharacterId(data?.characterId)
    this.levelDef = LEVELS[toLevelId(data?.levelId)]
    this.save = loadSave()
    this.inventory = emptyInventory()
    this.hp = 1
    this.level = 1
    this.xp = 0
    this.kills = 0
    this.sprinklesCollected = 0
    this.elapsedMs = 0
    this.runOver = false
    this.modalOpen = false
    this.pendingLevelUps = 0
    this.hurtGateUntil = 0
    this.invulnUntil = 0
    this.hurtFlashUntil = 0
    this.boss = null
    this.nextEventIndex = 0
    this.spawnAccumulator = 0
    this.facingVec = { x: 1, y: 0 }
  }

  create(): void {
    const character = CHARACTERS[this.characterId]

    // ---------------------------------------------------------------- world
    this.backdrop = this.add.tileSprite(0, 0, 100, 100, this.levelDef.backdrop).setDepth(-10)
    this.backdrop.setTileScale(this.levelDef.tileScale, this.levelDef.tileScale)

    this.player = this.physics.add
      .sprite(0, 0, character.texture)
      .setScale(ART_SCALE)
      .setDepth(30)
    setCircleBody(this.player, 13)
    this.player.body?.reset(0, 0)
    this.tweens.add({
      targets: this.player,
      scaleY: ART_SCALE * 1.05,
      scaleX: ART_SCALE * 0.97,
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
      maxSize: MAX_LIVE_ENEMIES + 40,
      runChildUpdate: false,
    })
    this.shotGroup = this.physics.add.group({ classType: Shot, maxSize: 400, runChildUpdate: false })
    this.foeShotGroup = this.physics.add.group({ classType: Shot, maxSize: 120, runChildUpdate: false })
    this.pickupGroup = this.add.group({ classType: Pickup, maxSize: 320, runChildUpdate: false })
    this.orbiterGroup = this.add.group({ classType: Orbiter, maxSize: 40, runChildUpdate: false })
    this.turretGroup = this.add.group({ classType: Turret, maxSize: 12, runChildUpdate: false })
    this.shieldGroup = this.add.group({ classType: Shield, maxSize: 4, runChildUpdate: false })

    this.puffs = this.add.particles(0, 0, 'fx-puff', {
      lifespan: 380,
      speed: { min: 40, max: 150 },
      scale: { start: ART_SCALE * 1.1, end: 0 },
      alpha: { start: 0.9, end: 0 },
      emitting: false,
    })
    this.puffs.setDepth(28)
    this.sparkles = this.add.particles(0, 0, 'fx-star', {
      lifespan: 520,
      speed: { min: 60, max: 190 },
      scale: { start: ART_SCALE * 0.9, end: 0 },
      rotate: { start: 0, end: 220 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    })
    this.sparkles.setDepth(29)

    // --------------------------------------------------------------- loadout
    grantWeapon(this.inventory, character.startWeapon)
    this.recomputeStats()
    this.level = this.statBlock.startLevel
    this.xpNeeded = xpToNext(this.level)
    this.hp = this.statBlock.maxHp
    this.revivesLeft = this.statBlock.revives
    this.weapons = new WeaponSystem(this)
    this.weapons.sync(this.inventory)

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
      this.physics.add.collider(this.enemyGroup, this.obstacleGroup)
      this.physics.add.overlap(this.shotGroup, this.obstacleGroup, this.onShotHitsObstacle, undefined, this)
      this.physics.add.overlap(this.foeShotGroup, this.obstacleGroup, this.onShotHitsObstacle, undefined, this)
    }

    this.timedEvents = this.buildTimeline()
    this.scene.launch('Hud')
    wakeLock.acquire()

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.applyZoom, this)
      wakeLock.release()
      this.obstacles?.destroy()
      this.obstacles = undefined
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
      if (!enemy.active) continue
      const distSq = (enemy.x - x) ** 2 + (enemy.y - y) ** 2
      if (distSq <= maxSq) found.push({ enemy, distSq })
    }
    found.sort((a, b) => a.distSq - b.distSq)
    return found.slice(0, count).map((f) => f.enemy)
  }

  /** Single-target version with no allocation or sort — used by homing shots. */
  private nearestEnemy(x: number, y: number, maxDist: number): Enemy | null {
    let best: Enemy | null = null
    let bestSq = maxDist * maxDist
    for (const child of this.enemyGroup.getChildren()) {
      const enemy = child as Enemy
      if (!enemy.active) continue
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

  castArc(x: number, y: number, angle: number, radius: number, spread: number, damage: number): void {
    const fx = this.add
      .image(x + Math.cos(angle) * radius * 0.45, y + Math.sin(angle) * radius * 0.45, 'fx-swipe')
      .setRotation(angle)
      .setScale((radius / 26) * ART_SCALE)
      .setDepth(27)
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

  castNova(x: number, y: number, radius: number, damage: number): void {
    const fx = this.add.image(x, y, 'fx-nova').setScale(0.15).setDepth(27).setAlpha(0.95)
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

  castBeam(x: number, y: number, angle: number, rawLength: number, halfWidth: number, damage: number): void {
    // Bushes are opaque: a beam that carried on through one would look wrong and
    // would quietly ignore the level's cover.
    const length = this.obstacles?.rayDistance(x, y, angle, rawLength) ?? rawLength
    const fx = this.add
      .image(x, y, 'fx-beam')
      .setOrigin(0, 0.5)
      .setRotation(angle)
      .setDisplaySize(length, halfWidth * 2)
      .setDepth(27)
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

  // ------------------------------------------------------------------ update

  override update(time: number, delta: number): void {
    if (this.runOver) return
    const dt = Math.min(delta, 50) // a hidden tab shouldn't teleport the swarm
    this.elapsedMs += dt
    const seconds = this.elapsedMs / 1000

    this.updateView()
    this.obstacles?.update(this.viewRect)
    this.updatePlayer()
    this.runTimeline(seconds)
    this.spawnWave(dt, seconds)
    this.updateEnemies(dt, time)
    this.updateShots(dt)
    this.updateFoeShots(dt)
    this.updateOrbiters(dt, time)
    this.updateTurrets(dt)
    this.updateShields(dt)
    this.updatePickups(dt, time)
    this.weapons.update(dt)

    if (this.statBlock.regen > 0 && this.hp < this.statBlock.maxHp) {
      this.hp = Math.min(this.statBlock.maxHp, this.hp + (this.statBlock.regen * dt) / 1000)
    }

    this.syncUi(seconds)
    if (seconds >= RUN_SECONDS_CAP) this.endRun(false)
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
      this.player.setFlipX(vx < -0.05)
    }

    // Blink after being bonked.
    if (this.time.now < this.hurtFlashUntil || this.time.now < this.invulnUntil) {
      this.player.setAlpha(Math.sin(this.time.now / 45) > 0 ? 0.35 : 1)
    } else if (this.player.alpha !== 1) {
      this.player.setAlpha(1)
    }
  }

  // ----------------------------------------------------------------- spawning

  /** Turns the level's scripted moments into callbacks, in time order. */
  private buildTimeline(): TimedEvent[] {
    return this.levelDef.events
      .map((event): TimedEvent => {
        switch (event.kind) {
          case 'ring':
            return { at: event.at, fn: () => this.spawnRing(event.enemy, event.count) }
          case 'miniboss':
            return { at: event.at, fn: () => this.spawnMiniboss() }
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

  private liveEnemyCount(): number {
    return this.enemyGroup.countActive(true)
  }

  private spawnWave(dt: number, seconds: number): void {
    const { rate, pool } = activeWaves(seconds, this.levelDef.waves)
    if (pool.length === 0) return
    this.spawnAccumulator += (rate * dt) / 1000
    while (this.spawnAccumulator >= 1) {
      this.spawnAccumulator -= 1
      if (this.liveEnemyCount() >= this.levelDef.maxLive) break
      this.spawnEnemy(ENEMIES[pool[Math.floor(Math.random() * pool.length)]], Math.random() * Math.PI * 2)
    }
  }

  /** Puts a Grump just outside the view, at `angle` around the player. */
  private spawnEnemy(def: EnemyDef, angle: number, distanceScale = 1): Enemy | null {
    const rx = (this.viewRect.width / 2 + 70) * distanceScale
    const ry = (this.viewRect.height / 2 + 70) * distanceScale
    const x = this.player.x + Math.cos(angle) * rx
    const y = this.player.y + Math.sin(angle) * ry
    const enemy = this.enemyGroup.get(x, y) as Enemy | null
    if (!enemy) return null
    enemy.spawn(def, x, y, difficultyAt(this.elapsedMs / 1000, this.levelDef.ramp))
    return enemy
  }

  private spawnRing(id: EnemyId, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.liveEnemyCount() >= this.levelDef.maxLive) break
      this.spawnEnemy(ENEMIES[id], (i / count) * Math.PI * 2, 0.92)
    }
    this.hud.showBanner('Here they come!', P.pinkHot)
  }

  private spawnMiniboss(): void {
    const def = ENEMIES[this.levelDef.miniBoss]
    const gnome = this.spawnEnemy(def, Math.random() * Math.PI * 2, 0.85)
    if (gnome) {
      this.boss = gnome
      this.hud.showBanner(`A ${def.name} appears!`, P.grumpRed)
      sfx.play('boss', 0)
    }
  }

  private spawnBoss(): void {
    const def = ENEMIES[this.levelDef.boss]
    const boss = this.spawnEnemy(def, Math.random() * Math.PI * 2, 0.85)
    if (boss) {
      this.boss = boss
      this.hud.showBanner(`${def.name.toUpperCase()} IS CROSS!`, P.gold)
      sfx.play('boss', 0)
      this.cameras.main.shake(400, 0.006)
    }
  }

  // ----------------------------------------------------------------- enemies

  private updateEnemies(dt: number, time: number): void {
    const px = this.player.x
    const py = this.player.y
    for (const child of this.enemyGroup.getChildren()) {
      const enemy = child as Enemy
      if (!enemy.active) continue

      if (enemy.flashTimer > 0) {
        enemy.flashTimer -= dt
        if (enemy.flashTimer <= 0) enemy.clearTint()
      }

      const dx = px - enemy.x
      const dy = py - enemy.y
      const dist = Math.hypot(dx, dy) || 1

      if (dist > DESPAWN_DISTANCE && !enemy.def.isBoss) {
        enemy.retire()
        continue
      }

      if (enemy.knockTimer > 0) {
        enemy.knockTimer -= dt
        continue
      }

      const nx = dx / dist
      const ny = dy / dist
      const body = enemy.body

      // A Grump that walked into a bush last frame sidesteps for a moment.
      // Without this, anything heading straight at the player just presses into
      // the bush forever and the forest becomes a set of safe pockets.
      if (enemy.detourTimer <= 0 && !body.touching.none) {
        enemy.detourTimer = 550
        enemy.detourSign = enemy.uid % 2 === 0 ? 1 : -1
      }
      if (enemy.detourTimer > 0) enemy.detourTimer -= dt
      const detour = enemy.detourTimer > 0 ? enemy.detourSign * 1.15 : 0

      switch (enemy.def.behavior) {
        case 'chase':
        case 'split': {
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
              const dashSpeed = enemy.def.dashSpeed ?? 220
              body.velocity.set(nx * dashSpeed, ny * dashSpeed)
              enemy.setScale(enemy.def.scale * ART_SCALE * 1.12)
              this.tweens.add({
                targets: enemy,
                scale: enemy.def.scale * ART_SCALE,
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
            this.fireFoeShot(enemy, nx, ny)
          }
          break
        }
      }
    }
  }

  private fireFoeShot(enemy: Enemy, nx: number, ny: number): void {
    const shot = this.foeShotGroup.get(enemy.x, enemy.y) as Shot | null
    if (!shot) return
    const speed = enemy.def.shootSpeed ?? 170
    shot.launch({
      texture: 'proj-raindrop',
      x: enemy.x,
      y: enemy.y,
      vx: nx * speed,
      vy: ny * speed,
      damage: Math.round(
        (enemy.def.shootDamage ?? 8) * difficultyAt(this.elapsedMs / 1000, this.levelDef.ramp).damage,
      ),
      pierce: 0,
      lifespan: 5000,
      scale: 1,
      mode: 'straight',
      faceTravel: true,
      depth: 24,
    })
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
          if (!shot.target || !shot.target.active) shot.target = this.nearestEnemy(shot.x, shot.y, 300)
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
    for (const child of this.foeShotGroup.getChildren()) {
      const shot = child as Shot
      if (!shot.active) continue
      shot.lifespan -= dt
      const tooFar = Phaser.Math.Distance.Between(shot.x, shot.y, this.player.x, this.player.y) > 1200
      if (shot.lifespan <= 0 || tooFar) {
        shot.retire()
        continue
      }
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
      this.fireShot({
        texture: 'proj-frosting',
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
   */
  private positionShield(shield: Shield): void {
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
    }
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
      if (!pickup.chasing && distSq < magnetSq) pickup.chasing = true

      if (pickup.chasing) {
        const dist = Math.sqrt(distSq) || 1
        const speed = 260 + (this.statBlock.pickupRadius - dist) * 1.6
        pickup.x += (dx / dist) * speed * (dt / 1000)
        pickup.y += (dy / dist) * speed * (dt / 1000)
        if (distSq < 26 * 26) this.collect(pickup)
      } else {
        pickup.y = pickup.homeY + Math.sin((time + pickup.bobPhase * 800) * 0.005) * 3
      }
    }
  }

  private collect(pickup: Pickup): void {
    switch (pickup.kind) {
      case 'heart':
        this.gainXp(pickup.value)
        sfx.play('heart', 45)
        break
      case 'sprinkle':
        this.sprinklesCollected += pickup.value * this.statBlock.sprinkleMult * this.levelDef.sprinkleMult
        sfx.play('coin', 55)
        break
      case 'snack':
        this.hp = Math.min(this.statBlock.maxHp, this.hp + SNACK_HEAL)
        this.sparkles.emitParticleAt(this.player.x, this.player.y, 6)
        sfx.play('snack', 60)
        break
    }
    pickup.retire()
  }

  private dropPickup(kind: PickupKind, x: number, y: number, value: number): void {
    const pickup = this.pickupGroup.get(x, y) as Pickup | null
    if (!pickup) return
    pickup.drop(kind, x, y, value)
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
    if (!enemy.active) return
    this.hurtPlayer(enemy.contactDamage, enemy)
  }

  private onFoeShotHitsPlayer: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_player, b) => {
    const shot = b as Shot
    if (!shot.active) return
    shot.retire()
    this.hurtPlayer(shot.damage)
  }

  /** Applies damage from any source, rolling crits here so every source can crit. */
  private damageEnemy(enemy: Enemy, amount: number, fromAngle: number): void {
    const crit = Math.random() < this.statBlock.critChance
    const dealt = Math.max(1, Math.round(amount * (crit ? this.statBlock.critMult : 1)))
    enemy.hp -= dealt

    enemy.setTint(crit ? P.lemon : P.white)
    enemy.setTintMode(Phaser.TintModes.FILL)
    enemy.flashTimer = crit ? 110 : 70

    if (crit) this.sparkles.emitParticleAt(enemy.x, enemy.y, 3)

    if (enemy.hp <= 0) {
      this.killEnemy(enemy, fromAngle)
      return
    }

    // Little shove, scaled down for the big ones so bosses don't get pinballed.
    if (!enemy.def.isBoss) {
      const push = enemy.def.id === 'grumpyGnome' ? 60 : 150
      enemy.body.velocity.set(Math.cos(fromAngle) * push, Math.sin(fromAngle) * push)
      enemy.knockTimer = 90
    }
    sfx.play('pop', 45)
  }

  private killEnemy(enemy: Enemy, fromAngle: number): void {
    const { x, y, def } = enemy
    this.kills += 1
    this.puffs.emitParticleAt(x, y, def.isBoss ? 30 : 6)
    if (def.isBoss || def.id === 'grumpyGnome') this.sparkles.emitParticleAt(x, y, 24)

    this.dropPickup('heart', x, y, enemy.xpValue)
    if (Math.random() < def.sprinkleChance) {
      const value = def.isBoss ? 120 : def.id === 'grumpyGnome' ? 30 : 1
      this.dropPickup('sprinkle', x + 6, y + 6, value)
    }
    if (def.snackChance && Math.random() < def.snackChance) {
      this.dropPickup('snack', x - 8, y + 4, 1)
    }

    if (def.splitInto && def.splitCount) {
      const spawn = ENEMIES[def.splitInto]
      const diff = difficultyAt(this.elapsedMs / 1000, this.levelDef.ramp)
      for (let i = 0; i < def.splitCount; i++) {
        const child = this.enemyGroup.get(x, y) as Enemy | null
        if (!child) break
        const angle = fromAngle + Math.PI + (i - (def.splitCount - 1) / 2) * 0.9
        child.spawn(spawn, x + Math.cos(angle) * 14, y + Math.sin(angle) * 14, diff)
      }
    }

    enemy.retire()
    sfx.play('squish', 60)

    if (this.boss === enemy) {
      this.boss = null
      if (def.isBoss) {
        this.cameras.main.shake(500, 0.008)
        this.hud.showBanner('You out-cuted him!', P.lemon)
        this.time.delayedCall(900, () => this.endRun(true))
      } else {
        this.hud.showBanner('Gnome: squished!', P.mint)
      }
    }
  }

  /**
   * Applies damage from a bump or a raindrop. `source` is the Grump responsible,
   * if any: each one carries its own cooldown so standing in a crowd takes hits
   * from all of them, throttled only by {@link HURT_GATE}.
   */
  private hurtPlayer(amount: number, source?: Enemy): void {
    const now = this.time.now
    if (this.runOver || now < this.invulnUntil) return
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
      this.invulnUntil = now + 2200
      this.hud.showBanner('Second Wind! 🫧', P.mint)
      this.castNova(this.player.x, this.player.y, 220, 60)
      sfx.play('levelup')
      return
    }
    this.endRun(false)
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
    if (levelled && !this.modalOpen) this.showLevelUpModal()
  }

  private showLevelUpModal(): void {
    if (this.runOver) return
    this.modalOpen = true
    this.hud.setStickEnabled(false)
    const choices = rollChoices(
      this.inventory,
      Math.random,
      choiceCount(this.statBlock.luck, Math.random),
    )
    sfx.play('levelup', 0)
    this.scene.pause()
    this.scene.launch('LevelUp', {
      level: this.level,
      choices,
      onPick: (choice: Choice) => this.applyChoice(choice),
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

    const previousMax = this.statBlock.maxHp
    this.recomputeStats()
    // Max-HP upgrades heal you by the amount they added, so they always feel good.
    this.hp = Math.min(this.statBlock.maxHp, this.hp + Math.max(0, this.statBlock.maxHp - previousMax))
    this.weapons.sync(this.inventory)

    this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1)
    if (this.pendingLevelUps > 0) {
      this.showLevelUpModal()
      return
    }
    this.modalOpen = false
    this.hud.setStickEnabled(true)
    this.scene.resume()
  }

  private recomputeStats(): void {
    this.statBlock = computeStats(this.characterId, this.save.upgrades, this.inventory)
  }

  requestPause(): void {
    if (this.runOver || this.modalOpen || !this.scene.isActive()) return
    this.modalOpen = true
    this.hud.setStickEnabled(false)
    this.scene.pause()
    this.scene.launch('Pause', {
      onResume: () => {
        this.modalOpen = false
        this.hud.setStickEnabled(true)
        this.scene.resume()
      },
      onQuit: () => {
        this.modalOpen = false
        this.scene.resume()
        this.endRun(false, true)
      },
    })
  }

  // ---------------------------------------------------------------- run end

  private endRun(won: boolean, quit = false): void {
    if (this.runOver) return
    this.runOver = true
    this.hud.setStickEnabled(false)

    const survivedSec = Math.floor(this.elapsedMs / 1000)
    const bonus = Math.floor(this.kills * 0.35) + (won ? 200 : 0)
    const earned = Math.floor(
      this.sprinklesCollected + bonus * this.statBlock.sprinkleMult * this.levelDef.sprinkleMult,
    )

    const before = loadSave()
    const after = applyRunResult(before, {
      levelId: this.levelDef.id,
      sprinkles: earned,
      survivedSec,
      kills: this.kills,
      won,
    })
    writeSave(after)

    sfx.play(won ? 'win' : 'lose', 0)

    this.scene.start('Result', {
      won,
      quit,
      levelId: this.levelDef.id,
      levelName: this.levelDef.name,
      unlockedLevel: won ? this.newlyUnlockedLevel(before, after) : null,
      survivedSec,
      kills: this.kills,
      earned,
      level: this.level,
      characterId: this.characterId,
      newBestTime: survivedSec > before.bestTimeSec,
      inventory: this.inventory.weapons.map((w) => ({
        icon: WEAPONS[w.id].icon,
        name: WEAPONS[w.id].name,
        level: w.level,
      })),
    })
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
    state.name = boss.def.name
    state.texture = boss.def.texture
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
    ui.boss = this.boss?.active ? this.describeBoss(this.boss) : null

    // Rebuilt in place rather than reallocated: this runs every frame.
    ui.weapons.length = this.inventory.weapons.length
    this.inventory.weapons.forEach((owned, i) => {
      const def = WEAPONS[owned.id]
      ui.weapons[i] = { icon: def.icon, level: owned.level, max: def.levels.length }
    })
  }
}
