/** A big, squishy, tablet-friendly button. */
import Phaser from 'phaser'
import { sfx } from '../audio/sfx'
import { darken, P } from '../art/palette'
import { drawPanel, textStyle } from './theme'

export interface ButtonOpts {
  label: string
  width: number
  height: number
  fill?: number
  textColor?: number
  fontSize?: number
  /** Small line under the label, e.g. a price. */
  sub?: string
  onClick: () => void
}

export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics
  private readonly text: Phaser.GameObjects.Text
  private readonly subText: Phaser.GameObjects.Text | null
  private enabled = true
  private opts: ButtonOpts

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ButtonOpts) {
    super(scene, x, y)
    this.opts = opts

    this.bg = scene.add.graphics()
    this.add(this.bg)

    const fontSize = opts.fontSize ?? Math.min(34, opts.height * 0.42)
    this.text = scene.add
      .text(0, opts.sub ? -opts.height * 0.13 : 0, opts.label, {
        ...textStyle({ size: fontSize, color: opts.textColor ?? P.ink, bold: true }),
      })
      .setOrigin(0.5)
    this.add(this.text)

    this.subText = opts.sub
      ? scene.add
          .text(0, opts.height * 0.24, opts.sub, textStyle({ size: fontSize * 0.6, color: P.inkSoft }))
          .setOrigin(0.5)
      : null
    if (this.subText) this.add(this.subText)

    this.redraw()
    this.setSize(opts.width, opts.height)
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, opts.width, opts.height),
      Phaser.Geom.Rectangle.Contains,
    )

    this.on('pointerdown', this.onDown, this)
    this.on('pointerup', this.onUp, this)
    this.on('pointerout', this.onOut, this)

    scene.add.existing(this)
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled
    this.setAlpha(enabled ? 1 : 0.55)
    this.redraw()
    return this
  }

  setLabel(label: string, sub?: string): this {
    this.text.setText(label)
    if (this.subText && sub !== undefined) this.subText.setText(sub)
    return this
  }

  private redraw(): void {
    const { width: w, height: h } = this.opts
    const fill = this.enabled ? (this.opts.fill ?? P.pink) : P.grumpGrey
    this.bg.clear()
    drawPanel(this.bg, -w / 2, -h / 2, w, h, {
      fill,
      edge: darken(fill, 0.25),
      radius: Math.min(26, h * 0.42),
    })
  }

  private onDown(): void {
    if (!this.enabled) return
    sfx.unlock()
    sfx.play('tap')
    this.scene.tweens.add({ targets: this, scale: 0.94, duration: 70, yoyo: true, ease: 'Quad.easeOut' })
  }

  private onUp(): void {
    if (!this.enabled) return
    this.opts.onClick()
  }

  private onOut(): void {
    this.setScale(1)
  }
}
