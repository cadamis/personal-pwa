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

  // Backdrop / frosty peaks
  // Snow floor is a cool blue-grey rather than white, so the (white) Grumps of
  // the peaks stand out against it instead of vanishing into it.
  snow: 0xc8dbee,
  snowShade: 0xb2c8e2,
  ice: 0xa9e4f5,
  iceDeep: 0x6cc3e6,

  // Backdrop / candy carnival
  candyFloor: 0xffd9e8,
  candyShade: 0xf7bdd5,
  frosting: 0xfff0f6,
  bubblegum: 0xff9ecb,
  licorice: 0x8a5a9e,

  // Backdrop / starlight dreamland
  dusk: 0x4b3f7a,
  duskDeep: 0x362c5f,
  duskLight: 0x6a5ca3,
  starGlow: 0xfff6c8,

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

  /**
   * The colour every outline leans towards. Outlines are never flat black: each
   * one is its fill colour darkened and pulled towards this plum, which keeps
   * the whole cast looking like it came out of the same sticker sheet.
   */
  outline: 0x3a2548,
  /** Ground shadows under everything that stands on the floor. */
  shadow: 0x2b1f3a,
  /** The dark of an eye. Not black — black reads as a hole at this size. */
  eyeDark: 0x2a1c38,
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
  return mix(color, 0xffffff, amount)
}

/** Blends towards black. */
export function darken(color: number, amount: number): number {
  const r = Math.round(((color >> 16) & 0xff) * (1 - amount))
  const g = Math.round(((color >> 8) & 0xff) * (1 - amount))
  const b = Math.round((color & 0xff) * (1 - amount))
  return (r << 16) | (g << 8) | b
}

/** Straight RGB blend from `a` to `b`. */
export function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff
  const ag = (a >> 8) & 0xff
  const ab = a & 0xff
  const r = Math.round(ar + (((b >> 16) & 0xff) - ar) * t)
  const g = Math.round(ag + (((b >> 8) & 0xff) - ag) * t)
  const bl = Math.round(ab + ((b & 0xff) - ab) * t)
  return (r << 16) | (g << 8) | bl
}

// ------------------------------------------------------------ hue-shifted ramps

interface Hsl {
  h: number
  s: number
  l: number
}

function toHsl(color: number): Hsl {
  const r = ((color >> 16) & 0xff) / 255
  const g = ((color >> 8) & 0xff) / 255
  const b = (color & 0xff) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return { h: h * 60, s, l }
}

function fromHsl({ h, s, l }: Hsl): number {
  const hue = (((h % 360) + 360) % 360) / 360
  if (s === 0) {
    const v = Math.round(l * 255)
    return (v << 16) | (v << 8) | v
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t: number): number => {
    let x = t
    if (x < 0) x += 1
    if (x > 1) x -= 1
    if (x < 1 / 6) return p + (q - p) * 6 * x
    if (x < 1 / 2) return q
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
    return p
  }
  const r = Math.round(channel(hue + 1 / 3) * 255)
  const g = Math.round(channel(hue) * 255)
  const b = Math.round(channel(hue - 1 / 3) * 255)
  return (r << 16) | (g << 8) | b
}

/** Moves hue `h` towards `target` by `t` (0..1), the short way round. */
function towardsHue(h: number, target: number, t: number): number {
  const delta = ((target - h + 540) % 360) - 180
  return h + delta * t
}

/**
 * The shadow side of `color`: darker, and nudged towards blue-violet rather
 * than just towards black. Hue-shifted shading is most of the difference
 * between art that looks painted and art that looks like it was dimmed.
 */
export function shade(color: number, amount: number): number {
  const hsl = toHsl(color)
  // Near-greys have no meaningful hue; give their shadows a cool one anyway.
  if (hsl.s < 0.08) hsl.h = 255
  hsl.h = towardsHue(hsl.h, 255, amount * 0.4)
  hsl.s = Math.min(1, hsl.s + amount * 0.18 + (hsl.s < 0.08 ? amount * 0.2 : 0))
  hsl.l = hsl.l * (1 - amount)
  return fromHsl(hsl)
}

/** The lit side of `color`: lighter and nudged warm. */
export function tint(color: number, amount: number): number {
  const hsl = toHsl(color)
  if (hsl.s > 0.05) hsl.h = towardsHue(hsl.h, 50, amount * 0.22)
  hsl.l = hsl.l + (1 - hsl.l) * amount
  return fromHsl(hsl)
}

/** Outline colour for a fill: its own deep shade, pulled towards the house plum. */
export function inkOf(color: number): number {
  return mix(shade(color, 0.62), P.outline, 0.45)
}
