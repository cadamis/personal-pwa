/** Shared look-and-feel: fonts, text styles, panels. */
import Phaser from 'phaser'
import { css, cssHex, darken, P } from '../art/palette'

/**
 * An old-book serif stack using only fonts that are already on the device, so
 * the first frame is never unstyled and nothing has to be downloaded.
 */
export const FONT = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif'

export interface TextOpts {
  size: number
  color?: number
  stroke?: number
  strokeWidth?: number
  align?: 'left' | 'center' | 'right'
  wrap?: number
  bold?: boolean
}

export function textStyle(opts: TextOpts): Phaser.Types.GameObjects.Text.TextStyle {
  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: FONT,
    fontSize: `${Math.round(opts.size)}px`,
    color: cssHex(opts.color ?? P.ink),
    align: opts.align ?? 'center',
  }
  if (opts.bold) style.fontStyle = 'bold'
  if (opts.strokeWidth) {
    style.stroke = cssHex(opts.stroke ?? P.void)
    style.strokeThickness = opts.strokeWidth
  }
  if (opts.wrap) style.wordWrap = { width: opts.wrap, useAdvancedWrap: true }
  return style
}

/** Design size the UI numbers are authored against. */
export const DESIGN_W = 960
export const DESIGN_H = 620

/** Keeps UI legible from a 10" tablet down to a phone in portrait. */
export function uiScale(scene: Phaser.Scene): number {
  const { width, height } = scene.scale
  return Math.max(0.6, Math.min(1.4, Math.min(width / DESIGN_W, height / DESIGN_H)))
}

export function drawPanel(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill?: number; edge?: number; radius?: number; alpha?: number } = {},
): void {
  const radius = opts.radius ?? 14
  graphics.fillStyle(opts.fill ?? P.panel, opts.alpha ?? 0.94)
  graphics.fillRoundedRect(x, y, w, h, radius)
  graphics.lineStyle(2.5, opts.edge ?? P.panelEdge, 1)
  graphics.strokeRoundedRect(x, y, w, h, radius)
}

/**
 * Re-runs `rebuild` on resize, coalescing the burst of events an orientation
 * change produces into one call.
 *
 * Coalesced with `setTimeout` rather than the scene clock on purpose: a paused
 * or backgrounded scene's clock doesn't advance, so it would take the resize
 * event and then never act on it, leaving the UI laid out for the old size.
 */
export function rebuildOnResize(scene: Phaser.Scene, rebuild: () => void): void {
  let timer: ReturnType<typeof setTimeout> | null = null
  const onResize = (): void => {
    if (timer !== null) return
    timer = setTimeout(() => {
      timer = null
      if (scene.scene.isActive() || scene.scene.isPaused()) rebuild()
    }, 0)
  }
  scene.scale.on(Phaser.Scale.Events.RESIZE, onResize)
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, onResize)
    if (timer !== null) clearTimeout(timer)
  })
}

export interface MenuButtonOpts {
  label: string
  sub?: string
  width: number
  height: number
  fill?: number
  onClick: () => void
}

/** A big, tablet-friendly button. */
export class MenuButton extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics
  private readonly labelText: Phaser.GameObjects.Text
  private highlighted = false
  private enabled = true

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly opts: MenuButtonOpts,
  ) {
    super(scene, x, y)
    this.bg = scene.add.graphics()
    this.add(this.bg)

    const size = Math.min(30, opts.height * 0.34)
    this.labelText = scene.add
      .text(0, opts.sub ? -opts.height * 0.14 : 0, opts.label, textStyle({ size, bold: true }))
      .setOrigin(0.5)
    this.add(this.labelText)

    if (opts.sub) {
      this.add(
        scene.add
          .text(
            0,
            opts.height * 0.2,
            opts.sub,
            textStyle({ size: size * 0.62, color: P.inkSoft, wrap: opts.width - 28 }),
          )
          .setOrigin(0.5),
      )
    }

    this.redraw()
    this.setSize(opts.width, opts.height)
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, opts.width, opts.height),
      Phaser.Geom.Rectangle.Contains,
    )
    this.on('pointerdown', () => {
      if (this.enabled) this.setScale(0.96)
    })
    this.on('pointerup', () => {
      this.setScale(1)
      if (this.enabled) opts.onClick()
    })
    this.on('pointerout', () => this.setScale(1))
    scene.add.existing(this)
  }

  /** Marks the current keyboard/gamepad selection. */
  setHighlighted(highlighted: boolean): this {
    if (this.highlighted === highlighted) return this
    this.highlighted = highlighted
    this.redraw()
    return this
  }

  /** Greys the button out and stops it firing — e.g. "Save" with no name yet. */
  setEnabled(enabled: boolean): this {
    if (this.enabled === enabled) return this
    this.enabled = enabled
    this.setAlpha(enabled ? 1 : 0.45)
    this.redraw()
    return this
  }

  press(): void {
    if (this.enabled) this.opts.onClick()
  }

  private redraw(): void {
    const { width: w, height: h } = this.opts
    this.bg.clear()
    drawPanel(this.bg, -w / 2, -h / 2, w, h, {
      fill: this.opts.fill ?? P.panel,
      edge: this.enabled && this.highlighted ? P.eyeGold : P.panelEdge,
      radius: 16,
      alpha: 0.95,
    })
    if (this.highlighted && this.enabled) {
      this.bg.lineStyle(2, P.eyeGold, 0.4)
      this.bg.strokeRoundedRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10, 20)
    }
  }
}

/** A full-screen scrim for modal scenes. */
export function scrim(scene: Phaser.Scene, alpha = 0.72): Phaser.GameObjects.Rectangle {
  const rect = scene.add
    .rectangle(0, 0, scene.scale.width, scene.scale.height, P.void, alpha)
    .setOrigin(0, 0)
    .setScrollFactor(0)
  scene.scale.on(Phaser.Scale.Events.RESIZE, () => rect.setSize(scene.scale.width, scene.scale.height))
  return rect
}

/** Hex string for inline canvas use, re-exported so scenes need one import. */
export { css, cssHex, darken }
