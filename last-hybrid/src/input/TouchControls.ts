/**
 * The on-screen control layer: movement stick on the left, action buttons on
 * the right, pause in the corner.
 *
 * All of the game's touch handling lives in this one scene layer. The HUD has
 * no interactive objects at all, which is what stops a tap on a heart from
 * being eaten before the stick sees it.
 *
 * The whole layer hides itself when a gamepad turns up, and re-appears the
 * moment a finger touches the glass again.
 */
import Phaser from 'phaser'
import { DEPTH } from '../game/constants'
import { cssHex, P } from '../art/palette'
import { FONT } from '../ui/theme'
import { Joystick } from './Joystick'
import type { Action } from './actions'
import type { InputManager } from './InputManager'

interface ButtonSpec {
  action: Action
  glyph: string
  /** Position from the bottom-right corner, in units of the button radius. */
  offset: { x: number; y: number }
  scale: number
  tint: number
}

/**
 * Right-hand cluster, laid out for a right thumb: attack sits where the thumb
 * rests, everything else arcs up and left from it.
 *
 * Offsets are from the bottom-right corner in units of the button radius, and
 * every one of them keeps the whole circle on screen — a button clipped by the
 * bezel is one you can only half press.
 */
const BUTTONS: ButtonSpec[] = [
  { action: 'attack', glyph: '⚔', offset: { x: -1.8, y: -1.8 }, scale: 1, tint: P.moon },
  { action: 'dash', glyph: '»', offset: { x: -3.7, y: -1.35 }, scale: 0.78, tint: P.inkSoft },
  { action: 'shift', glyph: '☾', offset: { x: -2.2, y: -3.7 }, scale: 0.78, tint: P.eyeGold },
  { action: 'interact', glyph: '✦', offset: { x: -4.1, y: -3.1 }, scale: 0.72, tint: P.fire },
]

const BUTTON_RADIUS = 52

class TouchButton {
  readonly image: Phaser.GameObjects.Image
  readonly label: Phaser.GameObjects.Text
  /** Frames this press has survived, so a fast tap still spans one update. */
  private framesHeld = 0
  private releaseQueued = false

  constructor(
    scene: Phaser.Scene,
    readonly spec: ButtonSpec,
    private readonly buttons: Record<Action, boolean>,
  ) {
    const radius = BUTTON_RADIUS * spec.scale
    this.image = scene.add
      .image(0, 0, 'ui-button')
      .setScrollFactor(0)
      .setDepth(DEPTH.controls)
      .setScale((radius * 2) / 120)
      .setAlpha(0.8)
      .setInteractive({ useHandCursor: true })
    this.label = scene.add
      .text(0, 0, spec.glyph, {
        fontFamily: FONT,
        fontSize: `${Math.round(radius * 0.95)}px`,
        color: cssHex(spec.tint),
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.controls + 1)
      .setAlpha(0.9)

    this.image.on('pointerdown', this.press, this)
    this.image.on('pointerup', this.release, this)
    this.image.on('pointerout', this.release, this)
    this.image.on('pointerupoutside', this.release, this)
  }

  setPosition(x: number, y: number): void {
    this.image.setPosition(x, y)
    this.label.setPosition(x, y)
  }

  setVisible(visible: boolean): void {
    this.image.setVisible(visible)
    this.label.setVisible(visible)
    if (!visible) this.forceRelease()
  }

  get visible(): boolean {
    return this.image.visible
  }

  /** Called once per frame, before the input sources are merged. */
  pump(): void {
    if (!this.buttons[this.spec.action]) return
    if (this.releaseQueued && this.framesHeld >= 1) {
      this.releaseQueued = false
      this.framesHeld = 0
      this.buttons[this.spec.action] = false
      return
    }
    this.framesHeld++
  }

  private press(): void {
    this.buttons[this.spec.action] = true
    this.framesHeld = 0
    this.releaseQueued = false
    this.image.setAlpha(1).setScale(this.image.scaleX * 0.94)
    this.label.setAlpha(1)
  }

  private release(): void {
    if (!this.buttons[this.spec.action]) return
    // Don't drop it until an update has seen it — a tap can easily start and
    // end inside a single frame.
    if (this.framesHeld >= 1) {
      this.buttons[this.spec.action] = false
      this.framesHeld = 0
    } else {
      this.releaseQueued = true
    }
    this.resetVisual()
  }

  private forceRelease(): void {
    this.buttons[this.spec.action] = false
    this.framesHeld = 0
    this.releaseQueued = false
    this.resetVisual()
  }

  private resetVisual(): void {
    const radius = BUTTON_RADIUS * this.spec.scale
    this.image.setAlpha(0.8).setScale((radius * 2) / 120)
    this.label.setAlpha(0.9)
  }

  destroy(): void {
    this.image.destroy()
    this.label.destroy()
  }
}

export class TouchControls {
  private readonly joystick: Joystick
  private readonly buttons: TouchButton[]
  private readonly pauseButton: Phaser.GameObjects.Text
  private visible: boolean
  /** Set while a modal covers the game — the controls hide rather than sit on top. */
  private suspended = false
  /** The contextual button only appears when there's something to use. */
  private interactAvailable = false

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly input: InputManager,
    /** Height of the HUD strip, which the stick must not steal taps from. */
    private hudHeight = 72,
  ) {
    this.joystick = new Joystick(scene, input.touch.move)
    this.buttons = BUTTONS.map((spec) => new TouchButton(scene, spec, input.touch.buttons))

    this.pauseButton = scene.add
      .text(0, 0, '❚❚', { fontFamily: FONT, fontSize: '26px', color: cssHex(P.inkSoft) })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.controls)
      .setAlpha(0.75)
      .setPadding(14)
      .setInteractive({ useHandCursor: true })
    this.pauseButton.on('pointerdown', () => {
      this.input.touch.buttons.pause = true
    })
    this.pauseButton.on('pointerup', () => {
      this.input.touch.buttons.pause = false
    })

    // Hidden up front on a machine with a gamepad and no touchscreen; a mouse
    // can still click the buttons, which is handy when testing.
    this.visible = !input.padConnected
    this.applyVisibility()

    input.addSourcePump(() => this.pump())
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this)
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this)
    this.layout()
  }

  /** Hides the whole layer, e.g. while the pause screen is up. */
  setSuspended(suspended: boolean): void {
    if (this.suspended === suspended) return
    this.suspended = suspended
    this.applyVisibility()
  }

  /** The HUD strip changes height with the UI scale, so it's set on rebuild. */
  setHudHeight(height: number): void {
    this.hudHeight = height
    this.layout()
  }

  /** Shows or hides the contextual "use" button. */
  setInteractAvailable(available: boolean): void {
    if (this.interactAvailable === available) return
    this.interactAvailable = available
    this.applyVisibility()
  }

  private pump(): void {
    // A gamepad appearing mid-session takes the screen back.
    if (this.visible && this.input.padConnected) {
      this.visible = false
      this.applyVisibility()
    }
    for (const button of this.buttons) button.pump()
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    // A finger on the glass means the controls are wanted again, even if a
    // gamepad is still plugged in.
    if (!this.visible && pointer.wasTouch) {
      this.input.padConnected = false
      this.visible = true
      this.applyVisibility()
    }
  }

  private applyVisibility(): void {
    const shown = this.visible && !this.suspended
    for (const button of this.buttons) {
      button.setVisible(shown && (button.spec.action !== 'interact' || this.interactAvailable))
    }
    this.pauseButton.setVisible(shown)
    this.joystick.setVisibleControls(shown)
  }

  private layout(): void {
    const { width, height } = this.scene.scale
    for (const button of this.buttons) {
      button.setPosition(
        width + button.spec.offset.x * BUTTON_RADIUS,
        height + button.spec.offset.y * BUTTON_RADIUS,
      )
    }
    this.pauseButton.setPosition(width - 34, 34)
    // The stick owns the left of the screen below the HUD; the right belongs to
    // the buttons, with a gap between so neither steals from the other.
    this.joystick.regionRight = width * 0.5
    this.joystick.regionTop = this.hudHeight
  }

  destroy(): void {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this)
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this)
    for (const button of this.buttons) button.destroy()
    this.pauseButton.destroy()
  }
}
