/** Numbers that more than one system needs to agree on. */

/** World grid size, in pixels. Every area map is authored on this grid. */
export const TILE = 48

/** How many tiles wide the camera tries to show. Tuned for a 10" tablet. */
export const VIEW_TILES = 15
export const ZOOM_MIN = 1
export const ZOOM_MAX = 2.4

export const PLAYER_MAX_HEALTH = 6

/** Invulnerability after taking a hit, in ms. */
export const HURT_INVULN_MS = 750
/** How long a form shift takes, during which the player can't act. */
export const SHIFT_MS = 320

export const RESPAWN_FADE_MS = 700
export const AREA_FADE_MS = 260

/** Depth bands. World sprites use their y within `SPRITES`, so they sort. */
export const DEPTH = {
  ground: -1000,
  decal: -900,
  /** World sprites live at `DEPTH.sprites + y`. */
  sprites: 0,
  overlay: 100_000,
  controls: 200_000,
} as const
