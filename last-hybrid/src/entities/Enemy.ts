/**
 * Everything that wants the player dead.
 *
 * One class, driven by the {@link ENEMY_STATS} table — the difference between a
 * husk and a stalker is entirely numbers plus the optional lunge, so adding a
 * third kind is a table entry and a texture, not a subclass.
 */
import Phaser from 'phaser'
import { DEPTH } from '../game/constants'
import { P } from '../art/palette'
import { clearTint, setFillTint, setMultiplyTint } from '../art/tint'
import { ENEMY_STATS, type EnemyStats } from '../game/enemies'
import type { EnemyType } from '../world/areas'

type State = 'idle' | 'chase' | 'windup' | 'lunge' | 'stunned'

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly stats: EnemyStats
  health: number
  /** The id of the last strike that hit this, so one swing can't hit twice. */
  lastStrikeId = -1

  private mode: State = 'idle'
  private readonly homeX: number
  private readonly homeY: number
  private stateUntil = 0
  private nextLungeAt = 0
  private readonly wanderSeed: number

  constructor(scene: Phaser.Scene, x: number, y: number, type: EnemyType) {
    const stats = ENEMY_STATS[type]
    super(scene, x, y, stats.texture)
    this.stats = stats
    this.health = stats.health
    this.homeX = x
    this.homeY = y
    // Staggers the idle drift so a row of husks doesn't sway in lockstep.
    this.wanderSeed = (x * 31 + y * 17) % 1000

    scene.add.existing(this)
    scene.physics.add.existing(this)

    const scale = stats.displayHeight / this.height
    this.setScale(scale)
    this.setOrigin(0.5, 0.92)
    const radius = stats.bodyRadius / scale
    this.setCircle(radius, this.width / 2 - radius, this.height * 0.9 - radius * 1.5)
    this.setCollideWorldBounds(true)
    ;(this.body as Phaser.Physics.Arcade.Body).setBounce(0.2)
  }

  get isAlive(): boolean {
    return this.health > 0 && this.active
  }

  /** True once it has noticed the player — the HUD uses it for the danger cue. */
  get isHunting(): boolean {
    return this.mode === 'chase' || this.mode === 'windup' || this.mode === 'lunge'
  }

  think(playerX: number, playerY: number, playerAlive: boolean, time: number): void {
    if (!this.isAlive) return
    const body = this.body as Phaser.Physics.Arcade.Body

    if (this.mode === 'stunned') {
      if (time < this.stateUntil) return
      this.mode = 'chase'
    }

    const toPlayer = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY)
    const fromHome = Phaser.Math.Distance.Between(this.x, this.y, this.homeX, this.homeY)

    if (this.mode === 'lunge') {
      if (time < this.stateUntil) {
        this.setDepth(DEPTH.sprites + this.y)
        return
      }
      this.mode = 'chase'
    }

    if (this.mode === 'windup') {
      body.setVelocity(0, 0)
      if (time >= this.stateUntil) this.startLunge(playerX, playerY, time)
      this.setDepth(DEPTH.sprites + this.y)
      return
    }

    const wantsPlayer = playerAlive && toPlayer < this.stats.aggroRadius && fromHome < this.stats.leash
    if (wantsPlayer) {
      if (this.mode !== 'chase') {
        this.mode = 'chase'
        // Give the lunge a beat after waking up, so it can't open with one.
        this.nextLungeAt = time + (this.stats.lunge?.everyMs ?? 0) * 0.6
      }
      const lunge = this.stats.lunge
      if (lunge && time >= this.nextLungeAt && toPlayer < this.stats.aggroRadius * 0.8) {
        this.mode = 'windup'
        this.stateUntil = time + lunge.windupMs
        setMultiplyTint(this, P.bloodRed)
        body.setVelocity(0, 0)
        return
      }
      this.scene.physics.moveTo(this, playerX, playerY, this.stats.speed)
      this.faceMotion(playerX)
    } else {
      this.mode = 'idle'
      this.idleDrift(time)
    }

    this.setDepth(DEPTH.sprites + this.y)
  }

  private startLunge(playerX: number, playerY: number, time: number): void {
    const lunge = this.stats.lunge
    if (!lunge) return
    clearTint(this)
    this.mode = 'lunge'
    this.stateUntil = time + lunge.durationMs
    this.nextLungeAt = time + lunge.everyMs
    // Commits to where the player *was* — sidestepping it is the counterplay.
    this.scene.physics.moveTo(this, playerX, playerY, lunge.speed)
    this.faceMotion(playerX)
  }

  /** A slow sway around its post, so an un-aggroed forest still feels alive. */
  private idleDrift(time: number): void {
    const phase = (time + this.wanderSeed * 7) / 2600
    const driftX = Math.cos(phase) * this.stats.speed * 0.3
    const driftY = Math.sin(phase * 0.7) * this.stats.speed * 0.3
    // Always leans back toward home, so drift can't add up into a walkabout.
    const homeX = (this.homeX - this.x) * 0.4
    const homeY = (this.homeY - this.y) * 0.4
    this.setVelocity(driftX + homeX, driftY + homeY)
    this.faceMotion(this.x + driftX)
  }

  private faceMotion(targetX: number): void {
    this.setFlipX(targetX < this.x)
  }

  /** Returns true if this killed it. */
  takeDamage(amount: number, fromX: number, fromY: number, strikeId: number): boolean {
    if (!this.isAlive || strikeId === this.lastStrikeId) return false
    this.lastStrikeId = strikeId
    this.health -= amount

    const angle = Math.atan2(this.y - fromY, this.x - fromX)
    this.setVelocity(Math.cos(angle) * this.stats.knockback, Math.sin(angle) * this.stats.knockback)
    this.mode = 'stunned'
    this.stateUntil = this.scene.time.now + 180

    setFillTint(this, P.white)
    this.scene.time.delayedCall(70, () => {
      if (this.active) clearTint(this)
    })

    if (this.health <= 0) {
      this.die()
      return true
    }
    return false
  }

  private die(): void {
    const body = this.body as Phaser.Physics.Arcade.Body
    body.enable = false
    this.burst()
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: this.scaleX * 1.2,
      scaleY: this.scaleY * 0.6,
      y: this.y + 6,
      duration: 300,
      ease: 'Quad.easeIn',
      onComplete: () => this.destroy(),
    })
  }

  /** A puff of motes on death — cheap, but it sells the kill. */
  private burst(): void {
    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2 + Math.random() * 0.4
      const mote = this.scene.add
        .image(this.x, this.y - 12, 'particle')
        .setTint(this.stats.type === 'stalker' ? P.bloodRed : P.rotGreen)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.5 + Math.random() * 0.6)
        .setDepth(DEPTH.sprites + this.y + 2)
      this.scene.tweens.add({
        targets: mote,
        x: this.x + Math.cos(angle) * (26 + Math.random() * 24),
        y: this.y - 12 + Math.sin(angle) * (20 + Math.random() * 18),
        alpha: 0,
        scale: 0,
        duration: 380 + Math.random() * 260,
        ease: 'Quad.easeOut',
        onComplete: () => mote.destroy(),
      })
    }
  }
}
