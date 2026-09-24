/** Shared look-and-feel for every screen: fonts, text styles, panel drawing. */
import { css, darken, lighten, P } from '../art/palette'

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

/** The game's standard panel: soft shadow, pastel fill, thick pale border. */
export function drawPanel(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill?: number; edge?: number; radius?: number; shadow?: boolean } = {},
): void {
  drawCard(g, x, y, w, h, { ...opts, glow: false })
}

/**
 * A glossy card, like a sticker on a sticker sheet: drop shadow, fill, a
 * lighter band across the top half, a thick edge and a thin inner highlight.
 * `glow` adds a soft halo in the edge colour, for "look at me" cards.
 */
export function drawCard(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill?: number; edge?: number; radius?: number; shadow?: boolean; glow?: boolean } = {},
): void {
  const fill = opts.fill ?? P.panel
  const edge = opts.edge ?? P.panelEdge
  const radius = Math.min(opts.radius ?? 22, h / 2, w / 2)
  if (opts.glow) {
    for (let i = 3; i >= 1; i--) {
      g.fillStyle(edge, 0.12)
      g.fillRoundedRect(x - i * 4, y - i * 4, w + i * 8, h + i * 8, radius + i * 4)
    }
  }
  if (opts.shadow !== false) {
    g.fillStyle(P.night, 0.28)
    g.fillRoundedRect(x + 3, y + 6, w, h, radius)
  }
  g.fillStyle(darken(fill, 0.06), 1)
  g.fillRoundedRect(x, y, w, h, radius)
  // Lighter top: the "gloss" that makes it read as a plump button, not a box.
  g.fillStyle(lighten(fill, 0.35), 1)
  g.fillRoundedRect(x, y, w, Math.max(radius * 2, h * 0.55), radius)
  g.fillStyle(fill, 1)
  g.fillRoundedRect(x, y + h * 0.12, w, h * 0.88, radius)
  g.lineStyle(4, edge, 1)
  g.strokeRoundedRect(x, y, w, h, radius)
  g.lineStyle(1.5, 0xffffff, 0.6)
  g.strokeRoundedRect(x + 4, y + 4, w - 8, h - 8, Math.max(2, radius - 4))
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
  g.fillStyle(opts.track ?? P.nightSoft, 0.8)
  g.fillRoundedRect(x, y, w, h, radius)
  const filled = Math.max(0, Math.min(1, fraction)) * w
  if (filled > 2) {
    g.fillStyle(darken(color, 0.12), 1)
    g.fillRoundedRect(x, y, filled, h, Math.min(radius, filled / 2))
    g.fillStyle(color, 1)
    g.fillRoundedRect(x, y, filled, h * 0.72, Math.min(radius, filled / 2))
    g.fillStyle(0xffffff, 0.35)
    g.fillRoundedRect(x + 3, y + 2, Math.max(0, filled - 6), h * 0.26, Math.min(radius, filled / 2))
  }
  if (opts.border) {
    g.lineStyle(2, opts.border, 0.95)
    g.strokeRoundedRect(x, y, w, h, radius)
  }
}

/**
 * The night-sky backdrop behind the menus: a deep plum gradient, a few soft
 * nebula glows and a scatter of stars. Deterministic, so rebuilding a screen on
 * resize doesn't reshuffle the sky.
 */
export function drawMenuBackdrop(g: Phaser.GameObjects.Graphics, w: number, h: number, accent: number = P.pink): void {
  const steps = 28
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    const color = mixColor(0x46336a, P.night, t)
    g.fillStyle(color, 1)
    g.fillRect(0, (h / steps) * i - 1, w, h / steps + 2)
  }
  // Soft glows, like distant candyfloss clouds.
  const glows: [number, number, number, number][] = [
    [0.15, 0.2, 0.35, accent],
    [0.85, 0.35, 0.3, P.lavender],
    [0.5, 0.95, 0.45, P.purple],
  ]
  for (const [gx, gy, gr, col] of glows) {
    const r = Math.max(w, h) * gr
    for (let i = 8; i >= 1; i--) {
      g.fillStyle(col, 0.022)
      g.fillCircle(w * gx, h * gy, (r * i) / 8)
    }
  }
  let seed = 1234
  const rnd = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 0x100000000
  }
  const stars = Math.round((w * h) / 9000)
  for (let i = 0; i < stars; i++) {
    const r = 0.6 + rnd() * 1.6
    g.fillStyle(0xffffff, 0.25 + rnd() * 0.5)
    g.fillCircle(rnd() * w, rnd() * h, r)
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
