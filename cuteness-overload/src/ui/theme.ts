/** Shared look-and-feel for every screen: fonts, text styles, panel drawing. */
import { css, darken, P } from '../art/palette'

/**
 * A rounded, friendly font stack using only what's already on the device —
 * Chalkboard on iPad, Comic Sans on Windows, then progressively duller
 * fallbacks. No web font to download, so the first frame is never unstyled.
 */
export const FONT = '"Chalkboard SE", "Comic Sans MS", "Baloo 2", "Trebuchet MS", "Verdana", sans-serif'

export interface TextOpts {
  size: number
  color?: number
  stroke?: number
  strokeWidth?: number
  align?: 'left' | 'center' | 'right'
  wrap?: number
  bold?: boolean
}

/** Builds a Phaser text style, with the chunky outline used across the UI. */
export function textStyle(opts: TextOpts): Phaser.Types.GameObjects.Text.TextStyle {
  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: FONT,
    fontSize: `${Math.round(opts.size)}px`,
    color: cssHex(opts.color ?? P.ink),
    align: opts.align ?? 'center',
  }
  if (opts.bold) style.fontStyle = 'bold'
  if (opts.strokeWidth) {
    style.stroke = cssHex(opts.stroke ?? P.white)
    style.strokeThickness = opts.strokeWidth
  }
  if (opts.wrap) style.wordWrap = { width: opts.wrap, useAdvancedWrap: true }
  return style
}

export function cssHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}

/** The game's standard card: soft shadow, pastel fill, thick pale border. */
export function drawPanel(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill?: number; edge?: number; radius?: number; shadow?: boolean } = {},
): void {
  const fill = opts.fill ?? P.panel
  const edge = opts.edge ?? P.panelEdge
  const radius = opts.radius ?? 22
  if (opts.shadow !== false) {
    g.fillStyle(P.night, 0.22)
    g.fillRoundedRect(x + 4, y + 6, w, h, radius)
  }
  g.fillStyle(fill, 1)
  g.fillRoundedRect(x, y, w, h, radius)
  g.lineStyle(4, edge, 1)
  g.strokeRoundedRect(x, y, w, h, radius)
}

/** A horizontal bar (health, XP, boss) with rounded ends. */
export function drawBar(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  fraction: number,
  color: number,
  opts: { track?: number; radius?: number; border?: number } = {},
): void {
  const radius = opts.radius ?? h / 2
  g.fillStyle(opts.track ?? P.nightSoft, 0.75)
  g.fillRoundedRect(x, y, w, h, radius)
  const filled = Math.max(0, Math.min(1, fraction)) * w
  if (filled > 2) {
    g.fillStyle(color, 1)
    g.fillRoundedRect(x, y, filled, h, radius)
    g.fillStyle(0xffffff, 0.28)
    g.fillRoundedRect(x + 2, y + 2, Math.max(0, filled - 4), h * 0.32, radius)
  }
  if (opts.border) {
    g.lineStyle(2, opts.border, 0.9)
    g.strokeRoundedRect(x, y, w, h, radius)
  }
}

/** The night-sky vertical gradient used behind the menus. */
export function drawMenuBackdrop(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
  const steps = 24
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    const color = mixColor(P.nightSoft, P.night, t)
    g.fillStyle(color, 1)
    g.fillRect(0, (h / steps) * i - 1, w, h / steps + 2)
  }
}

export function mixColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff
  const ag = (a >> 8) & 0xff
  const ab = a & 0xff
  const br = (b >> 16) & 0xff
  const bg = (b >> 8) & 0xff
  const bb = b & 0xff
  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  )
}

export { css, darken, P }
