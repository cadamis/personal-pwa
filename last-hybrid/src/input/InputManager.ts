/**
 * Reads keyboard and gamepad every frame, folds them together with whatever the
 * on-screen controls are reporting, and exposes one held/just-pressed view of
 * the result.
 *
 * The scene calls {@link update} once at the top of its own update, before
 * anything reads the state — otherwise "just pressed" is a frame stale.
 */
import Phaser from 'phaser'
import {
  ACTIONS,
  applyDeadzone,
  clampMagnitude,
  emptySource,
  mergeSources,
  noButtons,
  resetSource,
  type Action,
  type SourceState,
} from './actions'

/** Analog sticks rest a little off-centre; ignore anything inside this. */
const STICK_DEADZONE = 0.24

/**
 * Standard-gamepad button indices. Face buttons are Phaser's `pad.A`..`pad.Y`,
 * but the shoulder/menu buttons have no named accessor, so they're read from
 * the array.
 */
const PAD_BUTTON = { L1: 4, R1: 5, L2: 6, R2: 7, SELECT: 8, START: 9 } as const

export class InputManager {
  /** Merged movement vector, magnitude 0..1. */
  readonly move = { x: 0, y: 0 }

  /**
   * Filled in by the on-screen controls. Public because the touch layer owns
   * its own widgets and writes here directly; nothing else should touch it.
   */
  readonly touch: SourceState = emptySource()

  /** True once a gamepad has been seen, so the touch UI can get out of the way. */
  padConnected = false

  private readonly keyboardSource = emptySource()
  private readonly padSource = emptySource()
  private readonly merged = emptySource()
  private previous: Record<Action, boolean> = noButtons()
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {}
  private readonly pumps: Array<() => void> = []
  /** Set while a modal (pause, dialogue) is up: movement stops, buttons hold. */
  private enabled = true

  constructor(private readonly scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard
    if (keyboard) {
      // WASD is the primary desktop scheme; arrows are there because half of
      // testing happens one-handed.
      this.keys = keyboard.addKeys(
        'W,A,S,D,UP,LEFT,DOWN,RIGHT,SPACE,J,SHIFT,K,E,L,Q,TAB,ESC,P',
        false,
      ) as Record<string, Phaser.Input.Keyboard.Key>
      // Otherwise space scrolls the page and tab walks the focus ring off the
      // canvas mid-fight.
      keyboard.addCapture(['SPACE', 'TAB', 'UP', 'DOWN', 'LEFT', 'RIGHT'])
    }

    const gamepad = scene.input.gamepad
    if (gamepad) {
      this.padConnected = gamepad.total > 0
      gamepad.on(Phaser.Input.Gamepad.Events.CONNECTED, this.onPadConnected, this)
    }

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this)
  }

  /**
   * Registers work that has to happen before the sources are merged — the
   * touch layer uses it to hold a button down for at least one frame, so a tap
   * that starts and ends between two updates still registers.
   */
  addSourcePump(pump: () => void): void {
    this.pumps.push(pump)
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) {
      this.move.x = 0
      this.move.y = 0
      resetSource(this.touch)
    }
  }

  update(): void {
    for (const pump of this.pumps) pump()
    this.readKeyboard()
    this.readGamepad()
    mergeSources([this.keyboardSource, this.padSource, this.touch], this.merged)

    if (this.enabled) {
      this.move.x = this.merged.move.x
      this.move.y = this.merged.move.y
    } else {
      this.move.x = 0
      this.move.y = 0
    }
  }

  /** Held down right now. */
  isDown(action: Action): boolean {
    return this.merged.buttons[action]
  }

  /** Went down between the previous {@link update} and this one. */
  justPressed(action: Action): boolean {
    return this.merged.buttons[action] && !this.previous[action]
  }

  /**
   * Snapshots this frame's buttons as "previous". Called at the *end* of the
   * scene's update so every system sees the same edges, no matter what order
   * they run in.
   */
  endFrame(): void {
    for (const action of ACTIONS) this.previous[action] = this.merged.buttons[action]
  }

  private readKeyboard(): void {
    const source = this.keyboardSource
    resetSource(source)
    const down = (name: string): boolean => this.keys[name]?.isDown === true

    const x = (down('D') || down('RIGHT') ? 1 : 0) - (down('A') || down('LEFT') ? 1 : 0)
    const y = (down('S') || down('DOWN') ? 1 : 0) - (down('W') || down('UP') ? 1 : 0)
    // Normalised, so holding two keys diagonally isn't 41% faster.
    const move = clampMagnitude(x, y)
    source.move.x = move.x
    source.move.y = move.y

    source.buttons.attack = down('SPACE') || down('J')
    source.buttons.dash = down('SHIFT') || down('K')
    source.buttons.interact = down('E') || down('L')
    source.buttons.shift = down('Q') || down('TAB')
    source.buttons.pause = down('ESC') || down('P')
  }

  private readGamepad(): void {
    const source = this.padSource
    resetSource(source)
    const pad = this.scene.input.gamepad?.getPad(0)
    if (!pad) return
    this.padConnected = true

    const stick = applyDeadzone(pad.leftStick.x, pad.leftStick.y, STICK_DEADZONE)
    // The d-pad is digital, so it wins outright when it's being used.
    const dx = (pad.right ? 1 : 0) - (pad.left ? 1 : 0)
    const dy = (pad.down ? 1 : 0) - (pad.up ? 1 : 0)
    const move = dx !== 0 || dy !== 0 ? clampMagnitude(dx, dy) : stick
    source.move.x = move.x
    source.move.y = move.y

    const button = (index: number): boolean => pad.buttons[index]?.pressed === true

    source.buttons.attack = pad.A || button(PAD_BUTTON.R2)
    source.buttons.dash = pad.B || button(PAD_BUTTON.R1)
    source.buttons.interact = pad.X
    source.buttons.shift = pad.Y || button(PAD_BUTTON.L1)
    source.buttons.pause = button(PAD_BUTTON.START) || button(PAD_BUTTON.SELECT)
  }

  private onPadConnected(): void {
    this.padConnected = true
  }

  destroy(): void {
    this.scene.input.gamepad?.off(Phaser.Input.Gamepad.Events.CONNECTED, this.onPadConnected, this)
  }
}
