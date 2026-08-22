/**
 * The pause overlay, doubling as the control reference.
 *
 * It runs its own input rather than reusing the world's InputManager, because
 * the world scene is paused while this is up and its update loop — which is
 * what drives that manager — isn't running.
 */
import Phaser from 'phaser'
import { P } from '../art/palette'
import { MenuButton, rebuildOnResize, scrim, textStyle, uiScale } from '../ui/theme'
import type { WorldScene } from './WorldScene'

const CONTROLS: Array<[string, string]> = [
  ['Move', 'Left thumb / stick / WASD'],
  ['Attack', 'A button / Space'],
  ['Dash', 'B button / Shift'],
  ['Shift form', 'Y button / Q'],
  ['Use', 'X button / E'],
  ['Pause', 'Start / Esc'],
]

export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'pause', active: false })
  }

  create(): void {
    this.build()
    rebuildOnResize(this, () => this.build())

    this.input.keyboard?.on('keydown-ESC', () => this.resume())
    this.input.keyboard?.on('keydown-P', () => this.resume())
    this.input.gamepad?.on(Phaser.Input.Gamepad.Events.BUTTON_DOWN, (
      _pad: Phaser.Input.Gamepad.Gamepad,
      button: Phaser.Input.Gamepad.Button,
    ) => {
      if (button.index === 9 || button.index === 1) this.resume()
    })
  }

  private resume(): void {
    const world = this.scene.get('world') as WorldScene
    this.scene.stop()
    world.resumeGame()
  }

  private quit(): void {
    const world = this.scene.get('world') as WorldScene
    this.scene.stop()
    // Resume first: a paused scene can't process its own shutdown, and the
    // shutdown is what writes the save.
    world.resumeGame()
    world.scene.start('title')
  }

  private build(): void {
    this.children.removeAll(true)
    const { width, height } = this.scale
    const scale = uiScale(this)
    const cx = width / 2

    scrim(this)
    this.add
      .text(cx, height * 0.14, 'Paused', textStyle({ size: 40 * scale, color: P.ink, bold: true }))
      .setOrigin(0.5)

    const listTop = height * 0.28
    CONTROLS.forEach(([action, binding], i) => {
      const y = listTop + i * 26 * scale
      this.add
        .text(cx - 20 * scale, y, action, textStyle({ size: 16 * scale, color: P.moon, align: 'right' }))
        .setOrigin(1, 0.5)
      this.add
        .text(cx + 20 * scale, y, binding, textStyle({ size: 16 * scale, color: P.inkSoft, align: 'left' }))
        .setOrigin(0, 0.5)
    })

    const buttonY = listTop + CONTROLS.length * 26 * scale + 46 * scale
    new MenuButton(this, cx, buttonY, {
      label: 'Resume',
      width: Math.min(280 * scale, width - 60),
      height: 62 * scale,
      fill: P.nightSoft,
      onClick: () => this.resume(),
    })
    new MenuButton(this, cx, buttonY + 78 * scale, {
      label: 'Save and quit',
      width: Math.min(280 * scale, width - 60),
      height: 52 * scale,
      onClick: () => this.quit(),
    })
  }
}
