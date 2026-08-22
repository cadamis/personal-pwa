/**
 * The Last Hybrid.
 *
 * Owns movement, the three forms, and the swing. It deliberately does *not*
 * know what it's fighting: while a swing's hitbox is live it just publishes a
 * {@link Strike}, and the scene decides who that touches. That's what keeps
 * adding a new enemy — or a breakable crate, or a boss weak point — from
 * needing a change in here.
 */
import Phaser from 'phaser'
import { DEPTH, HURT_INVULN_MS, PLAYER_MAX_HEALTH, SHIFT_MS } from '../game/constants'
import { FORMS, type Form, type FormId, type HumanoidId } from '../game/forms'
import { P } from '../art/palette'
import { clearTint, setFillTint } from '../art/tint'
import { SHEETS, animKey, clipSpec, type ClipName, type Facing } from '../art/sheets'
import { facingFromVector } from '../input/actions'
import { FACING_VECTORS, type Strike } from '../game/combat'

export class Player extends Phaser.Physics.Arcade.Sprite {
  health = PLAYER_MAX_HEALTH
  facing: Facing = 'down'
  /** The humanoid shape to return to when shifting out of the wolf. */
  humanoid: HumanoidId
  formId: FormId

  /** Ground-speed multiplier from the terrain, set by the scene each frame. */
  drag = 1

  private attackUntil = 0
  private attackReadyAt = 0
  private strikeId = 0
  private dashUntil = 0
  private dashReadyAt = 0
  private invulnUntil = 0
  private shiftUntil = 0
  private dead = false

  constructor(scene: Phaser.Scene, x: number, y: number, humanoid: HumanoidId) {
    super(scene, x, y, humanoid)
    this.humanoid = humanoid
    this.formId = humanoid
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.applyForm(humanoid)
    this.play(animKey(humanoid, 'idle', 'down'))
  }

  get form(): Form {
    return FORMS[this.formId]
  }

  get isDead(): boolean {
    return this.dead
  }

  get isInvulnerable(): boolean {
    return this.scene.time.now < this.invulnUntil
  }

  get isBusy(): boolean {
    const now = this.scene.time.now
    return now < this.shiftUntil || now < this.attackUntil
  }

  /**
   * Swaps texture, animations and physics body to another form.
   *
   * The body is rebuilt rather than reused because the forms have different
   * radii, and a wolf body left on a humanoid frame is exactly the kind of bug
   * nobody notices until something walks through a tree.
   */
  applyForm(formId: FormId): void {
    const spec = SHEETS[formId]
    const form = FORMS[formId]
    this.formId = formId

    this.setTexture(formId)
    const scale = spec.display / spec.frameHeight
    this.setScale(scale)
    // Positioned by the feet, so depth sorting matches where it's standing.
    this.setOrigin(0.5, 1 - spec.footFraction)

    // setCircle works in source-texture pixels, so undo the display scale.
    const radius = form.bodyRadius / scale
    const feetY = spec.frameHeight * (1 - spec.footFraction)
    this.setCircle(radius, spec.frameWidth / 2 - radius, feetY - radius * 1.35)
    this.setCollideWorldBounds(true)
  }

  /** Toggles between the chosen humanoid form and the wolf. */
  shiftForm(): void {
    const now = this.scene.time.now
    if (this.dead || now < this.shiftUntil) return
    this.shiftUntil = now + SHIFT_MS
    this.setVelocity(0, 0)

    const next: FormId = this.formId === 'wolf' ? this.humanoid : 'wolf'
    const burst = this.scene.add
      .image(this.x, this.y - 16, 'glow')
      .setTint(P.eyeGold)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.sprites + this.y + 1)
      .setScale(0.3)
    this.scene.tweens.add({
      targets: burst,
      scale: 1.5,
      alpha: 0,
      duration: SHIFT_MS,
      ease: 'Quad.easeOut',
      onComplete: () => burst.destroy(),
    })

    // Swap at the midpoint, behind the flash.
    this.scene.time.delayedCall(SHIFT_MS / 2, () => {
      if (this.dead) return
      this.applyForm(next)
      this.playClip('idle')
    })
  }

  /** Chooses the humanoid shape, e.g. from the title screen. */
  setHumanoid(humanoid: HumanoidId): void {
    this.humanoid = humanoid
    if (this.formId !== 'wolf') this.applyForm(humanoid)
  }

  /**
   * Drives one frame of movement and animation.
   *
   * `move` is the merged input vector; magnitude is used directly as a fraction
   * of top speed, so a half-pulled stick walks.
   */
  drive(move: { x: number; y: number }): void {
    if (this.dead) return
    const now = this.scene.time.now
    const body = this.body as Phaser.Physics.Arcade.Body

    if (now < this.dashUntil) {
      // A dash is committed: keep whatever velocity it started with.
      this.setDepth(DEPTH.sprites + this.y)
      return
    }
    if (now < this.shiftUntil) {
      body.setVelocity(0, 0)
      this.setDepth(DEPTH.sprites + this.y)
      return
    }

    const speed = this.form.speed * this.drag
    if (now < this.attackUntil) {
      // Swinging roots you, but not completely — you can still drift.
      body.setVelocity(move.x * speed * 0.25, move.y * speed * 0.25)
    } else {
      body.setVelocity(move.x * speed, move.y * speed)
      const facing = facingFromVector(move.x, move.y)
      if (facing) this.facing = facing
    }

    const moving = Math.hypot(move.x, move.y) > 0.08
    if (now >= this.attackUntil) this.playClip(moving ? 'walk' : 'idle')
    this.setDepth(DEPTH.sprites + this.y)
  }

  /** Starts a swing if one is off cooldown. Returns whether it came out. */
  attack(): boolean {
    const now = this.scene.time.now
    if (this.dead || now < this.attackReadyAt || now < this.shiftUntil) return false
    const form = this.form
    this.attackReadyAt = now + form.attackCooldown
    this.attackUntil = now + form.attackActiveMs
    this.strikeId++
    this.playClip('attack', true)
    this.spawnSlash()
    return true
  }

  /** Starts a dash if one is off cooldown. Returns whether it came out. */
  dash(move: { x: number; y: number }): boolean {
    const now = this.scene.time.now
    if (this.dead || now < this.dashReadyAt || now < this.shiftUntil) return false
    const form = this.form
    // Dash where you're pointing; if you're standing still, dash where you face.
    const direction = Math.hypot(move.x, move.y) > 0.2 ? move : FACING_VECTORS[this.facing]
    const length = Math.hypot(direction.x, direction.y) || 1

    this.dashReadyAt = now + form.dashCooldown
    this.dashUntil = now + form.dashMs
    // The i-frames are the point of the dash — this is the dodge button.
    this.invulnUntil = Math.max(this.invulnUntil, now + form.dashMs + 60)
    this.setVelocity((direction.x / length) * form.dashSpeed, (direction.y / length) * form.dashSpeed)

    const ghost = this.scene.add
      .image(this.x, this.y, this.texture.key, this.frame.name)
      .setOrigin(this.originX, this.originY)
      .setScale(this.scaleX, this.scaleY)
      .setFlipX(this.flipX)
      .setTint(P.moon)
      .setAlpha(0.5)
      .setDepth(DEPTH.sprites + this.y - 1)
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: 240,
      onComplete: () => ghost.destroy(),
    })
    return true
  }

  /** The live hitbox, or null when nothing is swinging. */
  currentStrike(): Strike | null {
    if (this.dead || this.scene.time.now >= this.attackUntil) return null
    const form = this.form
    const vector = FACING_VECTORS[this.facing]
    return {
      x: this.x + vector.x * form.bodyRadius * 0.5,
      y: this.y + vector.y * form.bodyRadius * 0.5,
      radius: form.bodyRadius + form.reach,
      angle: Math.atan2(vector.y, vector.x),
      arc: form.arc,
      damage: form.damage,
      id: this.strikeId,
    }
  }

  /**
   * Applies damage, unless invulnerable. Returns whether it landed, so the
   * scene knows when to shake the camera.
   */
  takeDamage(amount: number, fromX: number, fromY: number): boolean {
    const now = this.scene.time.now
    if (this.dead || now < this.invulnUntil) return false

    // Drop any blink still running from a previous hit; two tweens fighting
    // over alpha can settle anywhere, including invisible.
    this.scene.tweens.killTweensOf(this)
    const scaled = Math.max(1, Math.round(amount * this.form.vulnerability))
    this.health = Math.max(0, this.health - scaled)
    this.invulnUntil = now + HURT_INVULN_MS

    const angle = Math.atan2(this.y - fromY, this.x - fromX)
    this.setVelocity(Math.cos(angle) * 260, Math.sin(angle) * 260)

    // Flash red, then blink for the rest of the invulnerability window.
    setFillTint(this, P.bloodRed)
    this.scene.time.delayedCall(90, () => clearTint(this))
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 1, to: 0.35 },
      duration: 110,
      yoyo: true,
      repeat: Math.floor(HURT_INVULN_MS / 220),
      onComplete: () => this.setAlpha(1),
    })

    if (this.health <= 0) this.die()
    return true
  }

  heal(amount: number): void {
    this.health = Math.min(PLAYER_MAX_HEALTH, this.health + amount)
  }

  private die(): void {
    this.dead = true
    this.setVelocity(0, 0)
    this.stop()
    this.scene.tweens.add({
      targets: this,
      angle: this.facing === 'left' ? 90 : -90,
      alpha: 0.4,
      duration: 420,
      ease: 'Quad.easeOut',
    })
  }

  /** Puts the player back on their feet at the campfire. */
  revive(x: number, y: number): void {
    this.dead = false
    this.health = PLAYER_MAX_HEALTH
    this.setPosition(x, y)
    this.setAngle(0)
    this.setAlpha(1)
    clearTint(this)
    this.setVelocity(0, 0)
    this.attackUntil = 0
    this.dashUntil = 0
    this.shiftUntil = 0
    this.invulnUntil = this.scene.time.now + HURT_INVULN_MS
    this.facing = 'down'
    this.playClip('idle')
  }

  private playClip(clip: ClipName, restart = false): void {
    this.play(animKey(this.formId, clip, this.facing), !restart)
  }

  /** The visible arc that reads as "that swing had reach". */
  private spawnSlash(): void {
    const form = this.form
    const vector = FACING_VECTORS[this.facing]
    const distance = form.bodyRadius + form.reach * 0.45
    const slash = this.scene.add
      .image(this.x + vector.x * distance, this.y + vector.y * distance - 8, 'slash')
      .setRotation(Math.atan2(vector.y, vector.x))
      .setScale(((form.bodyRadius + form.reach) / 38) * 0.9)
      .setAlpha(0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.sprites + this.y + 2)
    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      scale: slash.scale * 1.25,
      duration: clipSpec(SHEETS[this.formId], 'attack').frames * 22,
      ease: 'Quad.easeOut',
      onComplete: () => slash.destroy(),
    })
  }
}
