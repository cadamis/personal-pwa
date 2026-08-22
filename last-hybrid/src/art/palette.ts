/**
 * One palette for the whole game, so the world art, the UI and the placeholder
 * sprites can't drift apart. Numbers are 0xRRGGBB (what Phaser wants); `css()`
 * converts them for canvas work.
 *
 * The mood is a moonlit wood: desaturated blue-greens for everything natural,
 * with warm fire tones reserved for the things that are safe (the camp) and a
 * sickly rot-green for the things that aren't.
 */
export const P = {
  // Night sky / letterboxing
  void: 0x0d1117,
  night: 0x141b24,
  nightSoft: 0x1b2430,

  // Ground
  grass: 0x2f4a38,
  grassLit: 0x3d5c44,
  grassDark: 0x24382c,
  dirt: 0x4a3f33,
  dirtDark: 0x362e26,
  stone: 0x515a63,
  stoneDark: 0x3a4149,
  bog: 0x21322f,

  // Trees
  bark: 0x3b2f2a,
  barkDark: 0x281f1c,
  leaf: 0x1f3a2e,
  leafDark: 0x16291f,
  leafLit: 0x2c5240,

  // Light sources
  fire: 0xff9a3c,
  fireHot: 0xffd98a,
  ember: 0xd4552a,
  moon: 0xbfd4e8,
  moonDim: 0x6d829a,

  // The hybrid
  furGrey: 0x8b8f9a,
  furGreyDark: 0x5f6470,
  furGreyLit: 0xb9bec9,
  furRuss: 0x9a6a45,
  furRussDark: 0x6d4830,
  furRussLit: 0xc08d63,
  skin: 0xd9a880,
  skinDark: 0xb0805c,
  hair: 0x2e2a33,
  cloth: 0x4a5b7a,
  clothDark: 0x33415a,
  clothAlt: 0x7a4a5b,
  clothAltDark: 0x593546,
  leather: 0x6b4a32,
  eyeGold: 0xffc861,

  // Enemies
  rotGreen: 0x6f8f5a,
  rotGreenDark: 0x4a6339,
  huskGrey: 0x6b6f78,
  huskGreyDark: 0x474a52,
  bloodRed: 0xa8323c,

  // UI chrome
  ink: 0xe6edf3,
  inkSoft: 0x9aa7b4,
  panel: 0x1b2430,
  panelEdge: 0x39485c,
  heart: 0xd94a5a,
  heartDark: 0x5a2530,
  white: 0xffffff,
  black: 0x000000,
} as const

export type PaletteColor = (typeof P)[keyof typeof P]

/** 0xRRGGBB -> 'rgb(...)' / 'rgba(...)' for canvas 2D. */
export function css(color: number, alpha = 1): string {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`
}

/** 0xRRGGBB -> '#rrggbb', which is what Phaser's text styles want. */
export function cssHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}

/** Blends towards white. */
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

/** Linear blend between two packed colours. */
export function mix(a: number, b: number, t: number): number {
  const r = Math.round(((a >> 16) & 0xff) + (((b >> 16) & 0xff) - ((a >> 16) & 0xff)) * t)
  const g = Math.round(((a >> 8) & 0xff) + (((b >> 8) & 0xff) - ((a >> 8) & 0xff)) * t)
  const bl = Math.round((a & 0xff) + ((b & 0xff) - (a & 0xff)) * t)
  return (r << 16) | (g << 8) | bl
}
