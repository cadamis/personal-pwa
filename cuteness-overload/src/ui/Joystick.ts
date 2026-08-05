/**
 * Touch control: put a finger down anywhere in the play area and drag. The
 * stick appears where you touched, so there's no fiddly fixed pad to find and
 * it works whether the tablet is held left- or right-handed.
 *
 * Reports a vector with magnitude 0..1, which the player uses directly as a
 * fraction of top speed — so small drags walk and big drags sprint.
 */
import Phaser from 'phaser'
import { ART_SCALE } from '../art/textures'

export class Joystick {
  /** Movement vector, magnitude 0..1. */
  readonly vector = { x: 0, y: 0 }
  active = false
  /** Turned off while a modal (level-up, pause) is covering the game. */
  enabled = true

  private readonly base: Phaser.GameObjects.Image
  private readonly knob: Phaser.GameObjects.Image
  private pointerId = -1
  private originX = 0
  private originY = 0

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly radius = 62,
    /**
     * Taps above this y (the HUD strip) don't grab the stick. The HUD sets it
     * from its own laid-out height, which changes with the UI scale.
     */
    public deadTop = 84,
  ) {
    this.base = scene.add
      .image(0, 0, 'ui-stick-base')
      .setScrollFactor(0)
      .setDepth(900)
      // The art's ring has a 60px radius on a 130px canvas, so this makes the
      // drawn ring line up exactly with the stick's travel limit.
      .setScale(radius / 120)
      .setVisible(false)
    this.knob = scene.add
      .image(0, 0, 'ui-stick-knob')
      .setScrollFactor(0)
      .setDepth(901)
      .setScale(ART_SCALE * 0.95)
      .setVisible(false)

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this)
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this)
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this)
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this)
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled || this.active || pointer.y < this.deadTop) return
    this.pointerId = pointer.id
    this.active = true
    this.originX = pointer.x
    this.originY = pointer.y
    this.base.setPosition(pointer.x, pointer.y).setVisible(true).setAlpha(0.9)
    this.knob.setPosition(pointer.x, pointer.y).setVisible(true).setAlpha(0.95)
    this.vector.x = 0
    this.vector.y = 0
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (!this.active || pointer.id !== this.pointerId) return
    const dx = pointer.x - this.originX
    const dy = pointer.y - this.originY
    const dist = Math.hypot(dx, dy)
    const clamped = Math.min(dist, this.radius)
    const nx = dist > 0 ? dx / dist : 0
    const ny = dist > 0 ? dy / dist : 0
    // Small dead zone so resting a thumb doesn't drift.
    const magnitude = clamped < 6 ? 0 : clamped / this.radius
    this.vector.x = nx * magnitude
    this.vector.y = ny * magnitude
    this.knob.setPosition(this.originX + nx * clamped, this.originY + ny * clamped)
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (!this.active || pointer.id !== this.pointerId) return
    this.release()
  }

  release(): void {
    this.active = false
    this.pointerId = -1
    this.vector.x = 0
    this.vector.y = 0
    this.base.setVisible(false)
    this.knob.setVisible(false)
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this)
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this)
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this)
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this)
  }
}
