/**
 * The virtual movement stick.
 *
 * It has no fixed position: put a thumb down anywhere in its half of the screen
 * and the stick appears there. On a tablet that matters more than it sounds —
 * there's no small target to find by feel, and it works the same whether the
 * device is being held high or low.
 *
 * Reports magnitude 0..1, which the player uses as a fraction of top speed, so
 * a small pull walks and a full pull sprints.
 */
import Phaser from 'phaser'
import { DEPTH } from '../game/constants'
import type { Vec2 } from './actions'

export class Joystick {
  active = false
  enabled = true
  /** Pointers starting to the right of this x belong to the buttons, not here. */
  regionRight = Infinity
  /** Pointers starting above this y belong to the HUD. */
  regionTop = 0

  private readonly base: Phaser.GameObjects.Image
  private readonly knob: Phaser.GameObjects.Image
  private pointerId = -1
  private originX = 0
  private originY = 0

  constructor(
    private readonly scene: Phaser.Scene,
    /** The output vector — owned by the caller, written here every move. */
    private readonly out: Vec2,
    private readonly radius = 68,
  ) {
    this.base = scene.add
      .image(0, 0, 'ui-stick-base')
      .setScrollFactor(0)
      .setDepth(DEPTH.controls)
      // The art's ring has a 62px radius on a 140px canvas, so this lines the
      // drawn ring up exactly with the stick's travel limit.
      .setScale(radius / 62)
      .setVisible(false)
    this.knob = scene.add
      .image(0, 0, 'ui-stick-knob')
      .setScrollFactor(0)
      .setDepth(DEPTH.controls + 1)
      .setVisible(false)

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this)
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this)
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this)
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this)
  }

  setVisibleControls(visible: boolean): void {
    this.enabled = visible
    if (!visible) this.release()
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled || this.active) return
    if (pointer.x > this.regionRight || pointer.y < this.regionTop) return
    this.pointerId = pointer.id
    this.active = true
    this.originX = pointer.x
    this.originY = pointer.y
    this.base.setPosition(pointer.x, pointer.y).setVisible(true).setAlpha(0.85)
    this.knob.setPosition(pointer.x, pointer.y).setVisible(true).setAlpha(0.95)
    this.out.x = 0
    this.out.y = 0
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (!this.active || pointer.id !== this.pointerId) return
    const dx = pointer.x - this.originX
    const dy = pointer.y - this.originY
    const distance = Math.hypot(dx, dy)
    const clamped = Math.min(distance, this.radius)
    const nx = distance > 0 ? dx / distance : 0
    const ny = distance > 0 ? dy / distance : 0
    // A small dead zone, so a thumb resting on the glass doesn't drift.
    const magnitude = clamped < 7 ? 0 : clamped / this.radius
    this.out.x = nx * magnitude
    this.out.y = ny * magnitude
    this.knob.setPosition(this.originX + nx * clamped, this.originY + ny * clamped)
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (!this.active || pointer.id !== this.pointerId) return
    this.release()
  }

  release(): void {
    this.active = false
    this.pointerId = -1
    this.out.x = 0
    this.out.y = 0
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
