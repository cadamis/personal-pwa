/** Helpers shared by the menu-style scenes. */
import Phaser from 'phaser'

/** Design size the UI numbers are authored against. */
export const DESIGN_W = 900
export const DESIGN_H = 620

/** A scale factor for UI sizes, so text stays readable on any tablet. */
export function uiScale(scene: Phaser.Scene): number {
  const w = scene.scale.width
  const h = scene.scale.height
  return Math.max(0.62, Math.min(1.5, Math.min(w / DESIGN_W, h / DESIGN_H)))
}

/**
 * Re-runs `rebuild` whenever the game is resized, coalescing the burst of events
 * an orientation change produces into a single rebuild.
 *
 * Coalesced with `setTimeout` rather than Phaser's clock on purpose: the scene
 * clock only advances while frames are running, so a scene that's paused (a
 * level-up card is up) or throttled (the tab is in the background) would take
 * the resize event and then never act on it, leaving the UI laid out for the old
 * screen size.
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

/**
 * Fits `count` cards into `w` x `h` as a grid, picking the column count whose
 * cells come out closest to `aspect` (width / height). Avoids ever needing a
 * scroll view: everything is always on screen, which matters a lot on a tablet.
 */
export function gridFor(
  count: number,
  w: number,
  h: number,
  gap: number,
  aspect = 2.4,
): { cols: number; rows: number; cellW: number; cellH: number } {
  let best = { cols: 1, rows: count, cellW: 0, cellH: 0, score: Infinity }
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols)
    const cellW = (w - gap * (cols - 1)) / cols
    const cellH = (h - gap * (rows - 1)) / rows
    if (cellW <= 0 || cellH <= 0) continue
    const score = Math.abs(cellW / cellH - aspect)
    if (score < best.score) best = { cols, rows, cellW, cellH, score }
  }
  return { cols: best.cols, rows: best.rows, cellW: best.cellW, cellH: best.cellH }
}
