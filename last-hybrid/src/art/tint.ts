/**
 * Hit-flash helpers.
 *
 * Phaser 4 split what used to be `setTintFill(color)` into a colour and a
 * separate tint *mode*, and the mode is sticky — clearing the colour without
 * putting the mode back leaves the next ordinary tint rendering as a flat fill.
 * Both halves live here so no call site has to remember that.
 */
import Phaser from 'phaser'

/** The subset of a game object these need. */
interface Tintable {
  setTint(color?: number): unknown
  clearTint(): unknown
  setTintMode(mode: number): unknown
}

/** Flat silhouette in `color` — the "I hit that" flash. */
export function setFillTint(target: Tintable, color: number): void {
  target.setTint(color)
  target.setTintMode(Phaser.TintModes.FILL)
}

/** Ordinary multiply tint, e.g. the red glow on an enemy winding up. */
export function setMultiplyTint(target: Tintable, color: number): void {
  target.setTintMode(Phaser.TintModes.MULTIPLY)
  target.setTint(color)
}

/** Back to untinted, with the mode reset so the next tint behaves. */
export function clearTint(target: Tintable): void {
  target.clearTint()
  target.setTintMode(Phaser.TintModes.MULTIPLY)
}
