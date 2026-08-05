/**
 * Every weapon in the game, as data. The GameScene's weapon system reads
 * `behavior` to decide how to fire; nothing here knows about Phaser.
 *
 * Eleven behaviours cover twelve weapons, so a new weapon is usually just a new
 * entry in this file rather than new code.
 */

export type WeaponBehavior =
  /** Volley of shots that steer towards the nearest Grumps. */
  | 'homing'
  /**
   * Volley fired *at* the nearest Grumps, then travelling in a straight line.
   * Aiming is automatic but tracking isn't, so a shot can miss — which is what
   * makes where you stand matter.
   */
  | 'aimed'
  /** Instant damage in a cone in front of the player. */
  | 'arc'
  /** Satellites that circle the player forever. */
  | 'orbit'
  /** Satellites that circle fast for `duration`, then vanish until the next cast. */
  | 'spin'
  /** Flies out to `range`, then comes back to the player. */
  | 'boomerang'
  /** Expanding ring of damage centred on the player. */
  | 'nova'
  /** Long piercing line towards the nearest Grump. */
  | 'beam'
  /** Drops a stationary friend that shoots on its own until `duration` runs out. */
  | 'turret'
  /** Shots that ricochet off the edges of the view. */
  | 'bounce'
  /** Shots that fall from the top of the screen at random spots. */
  | 'rain'

/**
 * Per-level tuning. What `area` and `speed` mean depends on the behaviour:
 *
 * | behaviour | `area`                    | `speed`               |
 * |-----------|---------------------------|-----------------------|
 * | homing / aimed / bounce / rain / boomerang | projectile sprite scale | px per second |
 * | arc       | cone radius in px         | (unused)              |
 * | orbit / spin | orbit radius in px     | degrees per second    |
 * | nova      | blast radius in px        | (unused)              |
 * | beam      | beam half-thickness in px | (unused)              |
 * | turret    | turret's shot scale       | turret's shot speed   |
 */
export interface WeaponLevel {
  damage: number
  /** Milliseconds between casts. Divided by the player's haste. */
  cooldown: number
  /** Shots (or satellites) per cast, before `extraProjectiles`. */
  count: number
  area: number
  speed: number
  /** Extra enemies a shot can hit before dying. 0 = dies on first hit. */
  pierce: number
  /** Lifetime in ms for `spin` / `turret`; travel distance in px for `boomerang`. */
  duration?: number
  /** What the player sees on the level-up card for reaching this level. */
  note: string
}

export interface WeaponDef {
  id: WeaponId
  name: string
  /** Shown on cards and in the HUD. */
  icon: string
  /** One-liner, aimed at an 8-year-old. */
  blurb: string
  behavior: WeaponBehavior
  /** Texture key for the projectile / satellite art. */
  texture: string
  levels: readonly WeaponLevel[]
}

export type WeaponId =
  | 'bubbleBark'
  | 'sparkleSwipe'
  | 'snuggleSpikes'
  | 'carrotBoomerang'
  | 'glitterBomb'
  | 'kittenMissiles'
  | 'rainbowBeam'
  | 'cupcakeTurret'
  | 'bobaBlaster'
  | 'stickerStorm'
  | 'sassyGoose'
  | 'coneNado'

const WEAPON_LIST: readonly WeaponDef[] = [
  {
    id: 'bubbleBark',
    name: 'Bubble Bark',
    icon: '🫧',
    blurb: 'Woof! Bubbles fly straight at the nearest Grump and pop them.',
    behavior: 'aimed',
    texture: 'proj-bubble',
    levels: [
      { damage: 10, cooldown: 700, count: 1, area: 1, speed: 330, pierce: 0, note: 'One bubble.' },
      { damage: 13, cooldown: 660, count: 2, area: 1, speed: 345, pierce: 0, note: '+1 bubble' },
      { damage: 16, cooldown: 620, count: 2, area: 1.15, speed: 360, pierce: 1, note: 'Bubbles pop through 1 extra Grump' },
      { damage: 20, cooldown: 560, count: 3, area: 1.25, speed: 375, pierce: 1, note: '+1 bubble, bigger' },
      { damage: 26, cooldown: 500, count: 4, area: 1.4, speed: 395, pierce: 2, note: '+1 bubble, pops through 2' },
    ],
  },
  {
    id: 'sparkleSwipe',
    name: 'Sparkle Swipe',
    icon: '✨',
    blurb: 'A glittery paw-swipe at everything in front of you.',
    behavior: 'arc',
    texture: 'fx-swipe',
    levels: [
      { damage: 18, cooldown: 700, count: 1, area: 112, speed: 0, pierce: 0, note: 'Swipe in front of you.' },
      { damage: 22, cooldown: 660, count: 1, area: 122, speed: 0, pierce: 0, note: 'Wider swipe' },
      { damage: 26, cooldown: 630, count: 2, area: 130, speed: 0, pierce: 0, note: 'Swipes both ways' },
      { damage: 32, cooldown: 600, count: 2, area: 142, speed: 0, pierce: 0, note: 'Bigger, faster' },
      { damage: 40, cooldown: 560, count: 3, area: 158, speed: 0, pierce: 0, note: 'Triple swipe, huge' },
    ],
  },
  {
    id: 'snuggleSpikes',
    name: 'Snuggle Spikes',
    icon: '🌰',
    blurb: 'Cosy little spikes twirl around you. Hug at your own risk.',
    behavior: 'orbit',
    texture: 'proj-spike',
    levels: [
      { damage: 11, cooldown: 330, count: 3, area: 86, speed: 140, pierce: 0, note: 'Three twirling spikes.' },
      { damage: 13, cooldown: 320, count: 4, area: 92, speed: 150, pierce: 0, note: '+1 spike' },
      { damage: 16, cooldown: 310, count: 4, area: 100, speed: 162, pierce: 0, note: 'Faster, pointier' },
      { damage: 19, cooldown: 300, count: 5, area: 108, speed: 176, pierce: 0, note: '+1 spike, wider ring' },
      { damage: 24, cooldown: 285, count: 6, area: 118, speed: 196, pierce: 0, note: '+1 spike, zoomier' },
    ],
  },
  {
    id: 'carrotBoomerang',
    name: 'Carrot Boomerang',
    icon: '🥕',
    blurb: 'Throw a carrot. It comes back. It is very proud of itself.',
    behavior: 'boomerang',
    texture: 'proj-carrot',
    levels: [
      { damage: 12, cooldown: 900, count: 1, area: 1, speed: 330, pierce: 99, duration: 190, note: 'One returning carrot.' },
      { damage: 15, cooldown: 850, count: 1, area: 1.1, speed: 350, pierce: 99, duration: 220, note: 'Flies further' },
      { damage: 19, cooldown: 800, count: 2, area: 1.1, speed: 360, pierce: 99, duration: 240, note: '+1 carrot' },
      { damage: 24, cooldown: 740, count: 2, area: 1.25, speed: 380, pierce: 99, duration: 270, note: 'Bigger carrots' },
      { damage: 31, cooldown: 680, count: 3, area: 1.4, speed: 400, pierce: 99, duration: 300, note: '+1 carrot, huge' },
    ],
  },
  {
    id: 'glitterBomb',
    name: 'Glitter Bomb',
    icon: '💥',
    blurb: 'You explode into glitter. You are fine. They are not.',
    behavior: 'nova',
    texture: 'fx-nova',
    levels: [
      { damage: 18, cooldown: 1800, count: 1, area: 110, speed: 0, pierce: 0, note: 'Glitter blast around you.' },
      { damage: 23, cooldown: 1700, count: 1, area: 124, speed: 0, pierce: 0, note: 'Bigger blast' },
      { damage: 29, cooldown: 1600, count: 1, area: 138, speed: 0, pierce: 0, note: 'Bigger, faster' },
      { damage: 36, cooldown: 1500, count: 2, area: 152, speed: 0, pierce: 0, note: 'Double blast' },
      { damage: 46, cooldown: 1400, count: 2, area: 172, speed: 0, pierce: 0, note: 'Absolutely enormous' },
    ],
  },
  {
    id: 'kittenMissiles',
    name: 'Kitten Missiles',
    icon: '🚀',
    blurb: 'Kittens who have decided to be rockets. Nyoooom.',
    behavior: 'homing',
    texture: 'proj-kitten',
    levels: [
      { damage: 22, cooldown: 1500, count: 1, area: 1, speed: 200, pierce: 1, note: 'One rocket kitten.' },
      { damage: 28, cooldown: 1420, count: 2, area: 1, speed: 215, pierce: 1, note: '+1 kitten' },
      { damage: 35, cooldown: 1340, count: 2, area: 1.15, speed: 230, pierce: 2, note: 'Pops through 2' },
      { damage: 44, cooldown: 1240, count: 3, area: 1.25, speed: 245, pierce: 2, note: '+1 kitten' },
      { damage: 56, cooldown: 1140, count: 4, area: 1.4, speed: 260, pierce: 3, note: '+1 kitten, chonky' },
    ],
  },
  {
    id: 'rainbowBeam',
    name: 'Rainbow Beam',
    icon: '🌈',
    blurb: 'A beam of pure friendship. Goes right through everybody.',
    behavior: 'beam',
    texture: 'fx-beam',
    levels: [
      { damage: 20, cooldown: 1600, count: 1, area: 13, speed: 0, pierce: 99, note: 'Piercing rainbow.' },
      { damage: 26, cooldown: 1520, count: 1, area: 16, speed: 0, pierce: 99, note: 'Thicker beam' },
      { damage: 33, cooldown: 1440, count: 2, area: 16, speed: 0, pierce: 99, note: 'Two beams' },
      { damage: 41, cooldown: 1340, count: 2, area: 20, speed: 0, pierce: 99, note: 'Thicker still' },
      { damage: 53, cooldown: 1240, count: 3, area: 24, speed: 0, pierce: 99, note: 'Three fat rainbows' },
    ],
  },
  {
    id: 'cupcakeTurret',
    name: 'Cupcake Turret',
    icon: '🧁',
    blurb: 'Leave a cupcake behind. It defends the meadow with frosting.',
    behavior: 'turret',
    texture: 'proj-frosting',
    levels: [
      { damage: 9, cooldown: 3200, count: 1, area: 1, speed: 240, pierce: 0, duration: 5000, note: 'One frosting cupcake.' },
      { damage: 12, cooldown: 3050, count: 1, area: 1, speed: 255, pierce: 0, duration: 5800, note: 'Sticks around longer' },
      { damage: 15, cooldown: 2900, count: 2, area: 1.1, speed: 270, pierce: 0, duration: 6200, note: '+1 cupcake' },
      { damage: 19, cooldown: 2700, count: 2, area: 1.2, speed: 285, pierce: 1, duration: 6800, note: 'Frosting pierces' },
      { damage: 25, cooldown: 2500, count: 3, area: 1.35, speed: 300, pierce: 1, duration: 7500, note: '+1 cupcake, big frosting' },
    ],
  },
  {
    id: 'bobaBlaster',
    name: 'Boba Blaster',
    icon: '🧋',
    blurb: 'Tapioca pearls that bounce off absolutely everything.',
    behavior: 'bounce',
    texture: 'proj-boba',
    levels: [
      { damage: 11, cooldown: 1100, count: 2, area: 1, speed: 250, pierce: 1, duration: 4000, note: 'Two bouncy pearls.' },
      { damage: 14, cooldown: 1050, count: 3, area: 1, speed: 260, pierce: 1, duration: 4400, note: '+1 pearl' },
      { damage: 17, cooldown: 1000, count: 3, area: 1.15, speed: 275, pierce: 2, duration: 4800, note: 'Bouncier, pierces 2' },
      { damage: 22, cooldown: 940, count: 4, area: 1.25, speed: 290, pierce: 2, duration: 5200, note: '+1 pearl' },
      { damage: 28, cooldown: 880, count: 5, area: 1.4, speed: 305, pierce: 3, duration: 5600, note: '+1 pearl, chonky' },
    ],
  },
  {
    id: 'stickerStorm',
    name: 'Sticker Storm',
    icon: '⭐',
    blurb: 'Stickers rain from the sky. Nobody knows who is throwing them.',
    behavior: 'rain',
    texture: 'proj-sticker',
    levels: [
      { damage: 13, cooldown: 1400, count: 3, area: 1, speed: 290, pierce: 1, note: 'Three falling stickers.' },
      { damage: 16, cooldown: 1330, count: 4, area: 1, speed: 300, pierce: 1, note: '+1 sticker' },
      { damage: 20, cooldown: 1260, count: 6, area: 1.1, speed: 310, pierce: 1, note: '+2 stickers' },
      { damage: 25, cooldown: 1180, count: 8, area: 1.2, speed: 325, pierce: 2, note: '+2 stickers, pierces 2' },
      { damage: 32, cooldown: 1100, count: 11, area: 1.35, speed: 340, pierce: 2, note: '+3 stickers, big' },
    ],
  },
  {
    id: 'sassyGoose',
    name: 'Sassy Goose',
    icon: '🪿',
    blurb: 'A goose orbits you. It is furious. Honk.',
    behavior: 'orbit',
    texture: 'proj-goose',
    levels: [
      { damage: 20, cooldown: 300, count: 1, area: 110, speed: 210, pierce: 0, note: 'One extremely cross goose.' },
      { damage: 25, cooldown: 290, count: 1, area: 118, speed: 235, pierce: 0, note: 'Angrier, faster' },
      { damage: 31, cooldown: 280, count: 2, area: 124, speed: 245, pierce: 0, note: 'A second goose. Oh no.' },
      { damage: 39, cooldown: 270, count: 2, area: 132, speed: 265, pierce: 0, note: 'Bigger geese' },
      { damage: 50, cooldown: 260, count: 3, area: 140, speed: 285, pierce: 0, note: 'Three geese. Unstoppable.' },
    ],
  },
  {
    id: 'coneNado',
    name: 'Cone-nado',
    icon: '🍦',
    blurb: 'Ice cream cones spin around you in a delicious tornado.',
    behavior: 'spin',
    texture: 'proj-cone',
    levels: [
      { damage: 15, cooldown: 3000, count: 3, area: 86, speed: 400, pierce: 0, duration: 1600, note: 'Three spinning cones.' },
      { damage: 19, cooldown: 2880, count: 4, area: 92, speed: 420, pierce: 0, duration: 1800, note: '+1 cone' },
      { damage: 24, cooldown: 2760, count: 5, area: 100, speed: 440, pierce: 0, duration: 2000, note: '+1 cone, longer' },
      { damage: 30, cooldown: 2600, count: 6, area: 110, speed: 470, pierce: 0, duration: 2200, note: '+1 cone, wider' },
      { damage: 39, cooldown: 2450, count: 8, area: 122, speed: 500, pierce: 0, duration: 2600, note: '+2 cones, whirlwind' },
    ],
  },
]

export const WEAPONS: Readonly<Record<WeaponId, WeaponDef>> = Object.fromEntries(
  WEAPON_LIST.map((w) => [w.id, w]),
) as Record<WeaponId, WeaponDef>

export const WEAPON_IDS = WEAPON_LIST.map((w) => w.id)

export function maxWeaponLevel(id: WeaponId): number {
  return WEAPONS[id].levels.length
}

/**
 * Level is 1-based and clamped, so a caller that over-levels a weapon gets its
 * top stats rather than `undefined`.
 */
export function weaponLevel(id: WeaponId, level: number): WeaponLevel {
  const def = WEAPONS[id]
  const index = Math.max(0, Math.min(def.levels.length - 1, level - 1))
  return def.levels[index]
}
