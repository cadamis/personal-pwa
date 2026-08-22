/**
 * One pastel palette for the whole game. Every colour lives here so the art,
 * the UI and the particle effects can't drift apart.
 *
 * Numbers are 0xRRGGBB (what Phaser wants); `css()` converts for canvas work.
 */
export const P = {
  // Backdrop / meadow
  grass: 0xb8e6a0,
  grassDark: 0x9bd884,
  grassDarker: 0x86c96f,

  // Backdrop / forest — cooler and a shade darker, so the bushes read as solid
  // objects against it without the sprites losing contrast.
  forestFloor: 0x96c288,
  forestDark: 0x7aa96e,
  forestDarker: 0x638f59,
  bush: 0x5f9e57,
  bushDark: 0x477a41,
  bushLight: 0x7cbd6e,
  berry: 0xff8fb8,
  flowerPink: 0xffb3d9,
  flowerYellow: 0xfff3a3,
  flowerBlue: 0xa9dcff,

  // UI chrome
  night: 0x2b1f3a,
  nightSoft: 0x3d2d53,
  panel: 0xfff7f0,
  panelEdge: 0xffd0e6,
  ink: 0x4a3b52,
  inkSoft: 0x7a6885,

  // Signature pastels
  pink: 0xffb3d9,
  pinkHot: 0xff7eb6,
  lavender: 0xc9b6ff,
  purple: 0x9b7bff,
  mint: 0xa8f0d8,
  teal: 0x3fd1b0,
  lemon: 0xfff3a3,
  gold: 0xffd166,
  sky: 0xa9dcff,
  blue: 0x5bb8ff,
  peach: 0xffc9a3,
  coral: 0xff8f7a,
  cream: 0xfff7f0,
  white: 0xffffff,

  // Grumps (enemies) skew a bit muddier/greyer so they read as "cranky"
  grumpGreen: 0x8fc79a,
  grumpBrown: 0xc19a6b,
  grumpGrey: 0xb9b3c9,
  grumpPurple: 0xa88fd0,
  grumpRed: 0xe8807f,
} as const

export type PaletteColor = (typeof P)[keyof typeof P]

/** 0xRRGGBB -> '#rrggbb' for canvas 2D. */
export function css(color: number, alpha = 1): string {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`
}

/** Blends towards white — handy for highlights without a second palette entry. */
export function lighten(color: number, amount: number): number {
  const r = Math.round(((color >> 16) & 0xff) + (255 - ((color >> 16) & 0xff)) * amount)
  const g = Math.round(((color >> 8) & 0xff) + (255 - ((color >> 8) & 0xff)) * amount)
  const b = Math.round((color & 0xff) + (255 - (color & 0xff)) * amount)
  return (r << 16) | (g << 8) | b
}

/** Blends towards black. */
export function darken(color: number, amount: number): number {
  const r = Math.round(((color >> 16) & 0xff) * (1 - amount))
  const g = Math.round(((color >> 8) & 0xff) * (1 - amount))
  const b = Math.round((color & 0xff) * (1 - amount))
  return (r << 16) | (g << 8) | b
}
