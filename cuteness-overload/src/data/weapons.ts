/**
 * Every weapon in the game, as data. The GameScene's weapon system reads
 * `behavior` to decide how to fire; nothing here knows about Phaser.
 *
 * Fifteen behaviours cover thirty-two weapons, so a new weapon is usually just a
 * new entry in this file rather than new code.
 *
 * There are two kinds of weapon. **Base weapons** turn up on level-up cards and
 * go up to level 5 (Brave Brolly: 3). **Evolutions** never appear on a card:
 * a base weapon at its top level, plus the passive named in its `evolution`,
 * turns into its evolution the next time a treasure chest is opened. That's the
 * long-term puzzle of a run, and the Sticker Book's recipe page keeps score.
 */
import type { PassiveId } from './passives'

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
   * A timed blocker held behind the player. Deals no damage; it eats incoming
   * enemy projectiles for `duration`, then goes away until the cooldown is up.
   */
  | 'shield'
  /** A ring round the player that hurts everything inside it, every cooldown. */
  | 'aura'
  /** Zaps random Grumps anywhere on screen, with a little splash. */
  | 'strike'
  /** Lobs blobs that land and leave a damaging puddle behind. */
  | 'puddle'

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
 * | shield    | blocking radius in px     | (unused)              |
 * | aura      | radius in px              | (unused)              |
 * | strike    | splash radius in px       | (unused)              |
 * | puddle    | puddle radius in px       | (unused)              |
 */
export interface WeaponLevel {
  damage: number
  /**
   * Milliseconds between casts, divided by the player's haste.
   *
   * For `shield` this is the gap *after* it closes rather than cast-to-cast, so
   * "1s up, 8s cooldown" is duration 1000 and cooldown 8000. For `orbit` it's
   * how soon one satellite can hit the same Grump again; for `aura` it's the
   * gap between pulses.
   */
  cooldown: number
  /** Shots (or satellites) per cast, before `extraProjectiles`. */
  count: number
  area: number
  speed: number
  /** Extra enemies a shot can hit before dying. 0 = dies on first hit. */
  pierce: number
  /**
   * Lifetime in ms for `spin` / `turret` / `shield` / `puddle`; travel distance
   * in px for `boomerang`.
   */
  duration?: number
  /** Turrets only: ms between the turret's own shots. */
  rate?: number
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
  /** Base weapons: what this becomes, and the passive it needs to get there. */
  evolution?: { into: WeaponId; needs: PassiveId }
  /** Evolutions: the base weapon this grows out of. */
  evolvedFrom?: WeaponId
  /** Texture for the effect of an instant weapon (swipe, blast, beam, zap). */
  fx?: string
  /** Turrets: what gets left on the ground. */
  prop?: string
  /** Orbit: satellites split across this many counter-rotating rings. */
  rings?: number
  /** Shield: centred on the player as a bubble, blocking from every side. */
  dome?: boolean
  /** Aura: HP healed per pulse that touches at least one Grump. */
  heal?: number
}

export type BaseWeaponId =
  | 'bubbleBark'
  | 'braveBrolly'
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
  | 'cuddleAura'
  | 'pixieZap'
  | 'jellyPuddle'

export type EvolutionId =
  | 'bubbleBath'
  | 'rainbowParasol'
  | 'starlightSlash'
  | 'chestnutGalaxy'
  | 'goldenCarrot'
  | 'glitterSupernova'
  | 'cometKittens'
  | 'friendshipLaser'
  | 'cupcakeCastle'
  | 'brownSugarStorm'
  | 'goldStarShower'
  | 'furiousFlock'
  | 'sundaeCyclone'
  | 'bigWarmHug'
  | 'pixieStorm'
  | 'jellyOcean'

export type WeaponId = BaseWeaponId | EvolutionId

/** Evolutions have exactly one level: they arrive maxed. */
const evo = (level: Omit<WeaponLevel, 'note'>): readonly WeaponLevel[] => [{ ...level, note: 'Evolved!' }]

const WEAPON_LIST: readonly WeaponDef[] = [
  // ------------------------------------------------------------ base weapons
  {
    id: 'bubbleBark',
    name: 'Bubble Bark',
    icon: '🫧',
    blurb: 'Woof! Bubbles fly straight at the nearest Grump and pop them.',
    behavior: 'aimed',
    texture: 'proj-bubble',
    evolution: { into: 'bubbleBath', needs: 'twinBraids' },
    levels: [
      { damage: 10, cooldown: 700, count: 1, area: 1, speed: 330, pierce: 0, note: 'One bubble.' },
      { damage: 13, cooldown: 660, count: 2, area: 1, speed: 345, pierce: 0, note: '+1 bubble' },
      { damage: 16, cooldown: 620, count: 2, area: 1.15, speed: 360, pierce: 1, note: 'Bubbles pop through 1 extra Grump' },
      { damage: 20, cooldown: 560, count: 3, area: 1.25, speed: 375, pierce: 1, note: '+1 bubble, bigger' },
      { damage: 26, cooldown: 500, count: 4, area: 1.4, speed: 395, pierce: 2, note: '+1 bubble, pops through 2' },
    ],
  },
  {
    id: 'braveBrolly',
    name: 'Brave Brolly',
    icon: '☂️',
    blurb: 'Pops open behind you and bonks the rain away. Only three sizes!',
    behavior: 'shield',
    texture: 'prop-umbrella',
    evolution: { into: 'rainbowParasol', needs: 'squishyArmour' },
    // The only weapon with three levels rather than five, and the only one that
    // deals no damage at all — it buys you safety instead.
    levels: [
      { damage: 0, cooldown: 8000, count: 1, area: 34, speed: 0, pierce: 0, duration: 1000, note: 'Up for 1s, then 8s to dry off.' },
      { damage: 0, cooldown: 7000, count: 1, area: 39, speed: 0, pierce: 0, duration: 1500, note: 'Up for 1.5s, only 7s to dry off' },
      { damage: 0, cooldown: 6000, count: 1, area: 45, speed: 0, pierce: 0, duration: 2000, note: 'Up for 2s, only 6s to dry off' },
    ],
  },
  {
    id: 'sparkleSwipe',
    name: 'Sparkle Swipe',
    icon: '✨',
    blurb: 'A glittery paw-swipe at everything in front of you.',
    behavior: 'arc',
    texture: 'fx-swipe',
    fx: 'fx-swipe',
    evolution: { into: 'starlightSlash', needs: 'extraSpicy' },
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
    evolution: { into: 'chestnutGalaxy', needs: 'squishyArmour' },
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
    evolution: { into: 'goldenCarrot', needs: 'luckySocks' },
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
    fx: 'fx-nova',
    evolution: { into: 'glitterSupernova', needs: 'loudZoomies' },
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
    evolution: { into: 'cometKittens', needs: 'fastPaws' },
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
    fx: 'fx-beam',
    evolution: { into: 'friendshipLaser', needs: 'friendshipBracelet' },
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
    prop: 'prop-cupcake',
    evolution: { into: 'cupcakeCastle', needs: 'snackPocket' },
    levels: [
      { damage: 9, cooldown: 3200, count: 1, area: 1, speed: 240, pierce: 0, duration: 5000, rate: 820, note: 'One frosting cupcake.' },
      { damage: 12, cooldown: 3050, count: 1, area: 1, speed: 255, pierce: 0, duration: 5800, rate: 820, note: 'Sticks around longer' },
      { damage: 15, cooldown: 2900, count: 2, area: 1.1, speed: 270, pierce: 0, duration: 6200, rate: 780, note: '+1 cupcake' },
      { damage: 19, cooldown: 2700, count: 2, area: 1.2, speed: 285, pierce: 1, duration: 6800, rate: 740, note: 'Frosting pierces' },
      { damage: 25, cooldown: 2500, count: 3, area: 1.35, speed: 300, pierce: 1, duration: 7500, rate: 700, note: '+1 cupcake, big frosting' },
    ],
  },
  {
    id: 'bobaBlaster',
    name: 'Boba Blaster',
    icon: '🧋',
    blurb: 'Tapioca pearls that bounce off absolutely everything.',
    behavior: 'bounce',
    texture: 'proj-boba',
    evolution: { into: 'brownSugarStorm', needs: 'sugarRush' },
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
    evolution: { into: 'goldStarShower', needs: 'starPupil' },
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
    evolution: { into: 'furiousFlock', needs: 'extraSpicy' },
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
    evolution: { into: 'sundaeCyclone', needs: 'sleepySlippers' },
    levels: [
      { damage: 15, cooldown: 3000, count: 3, area: 86, speed: 400, pierce: 0, duration: 1600, note: 'Three spinning cones.' },
      { damage: 19, cooldown: 2880, count: 4, area: 92, speed: 420, pierce: 0, duration: 1800, note: '+1 cone' },
      { damage: 24, cooldown: 2760, count: 5, area: 100, speed: 440, pierce: 0, duration: 2000, note: '+1 cone, longer' },
      { damage: 30, cooldown: 2600, count: 6, area: 110, speed: 470, pierce: 0, duration: 2200, note: '+1 cone, wider' },
      { damage: 39, cooldown: 2450, count: 8, area: 122, speed: 500, pierce: 0, duration: 2600, note: '+2 cones, whirlwind' },
    ],
  },
  {
    id: 'cuddleAura',
    name: 'Cuddle Aura',
    icon: '💞',
    blurb: 'A warm fuzzy glow. Grumps who get too close regret it.',
    behavior: 'aura',
    texture: 'fx-aura',
    fx: 'fx-aura',
    evolution: { into: 'bigWarmHug', needs: 'snackPocket' },
    levels: [
      { damage: 6, cooldown: 620, count: 1, area: 62, speed: 0, pierce: 0, note: 'A cosy glow around you.' },
      { damage: 8, cooldown: 580, count: 1, area: 70, speed: 0, pierce: 0, note: 'Bigger, warmer' },
      { damage: 10, cooldown: 540, count: 1, area: 78, speed: 0, pierce: 0, note: 'Pulses faster' },
      { damage: 13, cooldown: 500, count: 1, area: 88, speed: 0, pierce: 0, note: 'Even bigger glow' },
      { damage: 17, cooldown: 440, count: 1, area: 100, speed: 0, pierce: 0, note: 'Maximum coziness' },
    ],
  },
  {
    id: 'pixieZap',
    name: 'Pixie Zap',
    icon: '🧚',
    blurb: 'Tiny pixies zap random Grumps. Zzzap!',
    behavior: 'strike',
    texture: 'fx-zap',
    fx: 'fx-zap',
    evolution: { into: 'pixieStorm', needs: 'fastPaws' },
    levels: [
      { damage: 18, cooldown: 1600, count: 2, area: 26, speed: 0, pierce: 0, note: 'Two zaps.' },
      { damage: 24, cooldown: 1500, count: 3, area: 28, speed: 0, pierce: 0, note: '+1 zap' },
      { damage: 30, cooldown: 1400, count: 3, area: 32, speed: 0, pierce: 0, note: 'Bigger sparks' },
      { damage: 38, cooldown: 1300, count: 4, area: 34, speed: 0, pierce: 0, note: '+1 zap' },
      { damage: 48, cooldown: 1150, count: 5, area: 40, speed: 0, pierce: 0, note: '+1 zap, big sparks' },
    ],
  },
  {
    id: 'jellyPuddle',
    name: 'Jelly Puddle',
    icon: '🍮',
    blurb: 'Throws wobbly jelly. Grumps get stuck in it. Sticky!',
    behavior: 'puddle',
    texture: 'fx-puddle',
    fx: 'fx-puddle',
    evolution: { into: 'jellyOcean', needs: 'loudZoomies' },
    levels: [
      { damage: 7, cooldown: 3000, count: 1, area: 42, speed: 0, pierce: 0, duration: 2500, note: 'One jelly puddle.' },
      { damage: 9, cooldown: 2850, count: 2, area: 46, speed: 0, pierce: 0, duration: 2800, note: '+1 puddle' },
      { damage: 11, cooldown: 2700, count: 2, area: 52, speed: 0, pierce: 0, duration: 3100, note: 'Bigger, longer' },
      { damage: 14, cooldown: 2500, count: 3, area: 58, speed: 0, pierce: 0, duration: 3500, note: '+1 puddle' },
      { damage: 18, cooldown: 2300, count: 3, area: 66, speed: 0, pierce: 0, duration: 4000, note: 'Enormous wobbly puddles' },
    ],
  },

  // -------------------------------------------------------------- evolutions
  {
    id: 'bubbleBath',
    name: 'Bubble Bath',
    icon: '🛁',
    blurb: 'Rainbow bubbles everywhere. Everybody gets a bath.',
    behavior: 'aimed',
    texture: 'proj-bubble-evo',
    evolvedFrom: 'bubbleBark',
    levels: evo({ damage: 32, cooldown: 380, count: 6, area: 1.5, speed: 430, pierce: 4 }),
  },
  {
    id: 'rainbowParasol',
    name: 'Rainbow Parasol',
    icon: '🌂',
    blurb: 'A rainbow dome that stops every raindrop and shoves Grumps away.',
    behavior: 'shield',
    texture: 'prop-parasol',
    evolvedFrom: 'braveBrolly',
    dome: true,
    levels: evo({ damage: 14, cooldown: 2500, count: 1, area: 76, speed: 0, pierce: 0, duration: 4500 }),
  },
  {
    id: 'starlightSlash',
    name: 'Starlight Slash',
    icon: '🌟',
    blurb: 'Swipes so sparkly they leave stars behind.',
    behavior: 'arc',
    texture: 'fx-swipe-evo',
    fx: 'fx-swipe-evo',
    evolvedFrom: 'sparkleSwipe',
    levels: evo({ damage: 64, cooldown: 460, count: 2, area: 196, speed: 0, pierce: 0 }),
  },
  {
    id: 'chestnutGalaxy',
    name: 'Chestnut Galaxy',
    icon: '🌌',
    blurb: 'Two rings of toasty chestnuts, spinning opposite ways.',
    behavior: 'orbit',
    texture: 'proj-spike-evo',
    evolvedFrom: 'snuggleSpikes',
    rings: 2,
    levels: evo({ damage: 32, cooldown: 250, count: 10, area: 122, speed: 220, pierce: 0 }),
  },
  {
    id: 'goldenCarrot',
    name: 'Golden Carrot',
    icon: '🥕',
    blurb: 'The luckiest carrots in the world. Very, very proud.',
    behavior: 'boomerang',
    texture: 'proj-carrot-evo',
    evolvedFrom: 'carrotBoomerang',
    levels: evo({ damage: 50, cooldown: 560, count: 4, area: 1.6, speed: 440, pierce: 99, duration: 350 }),
  },
  {
    id: 'glitterSupernova',
    name: 'Glitter Supernova',
    icon: '🎆',
    blurb: 'Three enormous glitter blasts. The meadow will never be clean again.',
    behavior: 'nova',
    texture: 'fx-nova-evo',
    fx: 'fx-nova-evo',
    evolvedFrom: 'glitterBomb',
    levels: evo({ damage: 66, cooldown: 1250, count: 3, area: 226, speed: 0, pierce: 0 }),
  },
  {
    id: 'cometKittens',
    name: 'Comet Kittens',
    icon: '☄️',
    blurb: 'A whole squadron of space kittens. Nyoooooooom.',
    behavior: 'homing',
    texture: 'proj-kitten-evo',
    evolvedFrom: 'kittenMissiles',
    levels: evo({ damage: 72, cooldown: 900, count: 6, area: 1.45, speed: 310, pierce: 5 }),
  },
  {
    id: 'friendshipLaser',
    name: 'Friendship Laser',
    icon: '💖',
    blurb: 'Four beams of pure, overwhelming friendship.',
    behavior: 'beam',
    texture: 'fx-beam-evo',
    fx: 'fx-beam-evo',
    evolvedFrom: 'rainbowBeam',
    levels: evo({ damage: 74, cooldown: 960, count: 4, area: 30, speed: 0, pierce: 99 }),
  },
  {
    id: 'cupcakeCastle',
    name: 'Cupcake Castle',
    icon: '🏰',
    blurb: 'Fortified cupcakes. Rapid-fire frosting. Very sturdy.',
    behavior: 'turret',
    texture: 'proj-frosting-evo',
    prop: 'prop-cupcake-evo',
    evolvedFrom: 'cupcakeTurret',
    levels: evo({ damage: 36, cooldown: 2200, count: 3, area: 1.5, speed: 340, pierce: 3, duration: 9500, rate: 420 }),
  },
  {
    id: 'brownSugarStorm',
    name: 'Brown Sugar Storm',
    icon: '🧋',
    blurb: 'Golden sugary pearls, bouncing absolutely everywhere.',
    behavior: 'bounce',
    texture: 'proj-boba-evo',
    evolvedFrom: 'bobaBlaster',
    levels: evo({ damage: 38, cooldown: 680, count: 8, area: 1.5, speed: 340, pierce: 6, duration: 6500 }),
  },
  {
    id: 'goldStarShower',
    name: 'Gold Star Shower',
    icon: '🌠',
    blurb: 'Top marks! Gold stars pour down like rain.',
    behavior: 'rain',
    texture: 'proj-sticker-evo',
    evolvedFrom: 'stickerStorm',
    levels: evo({ damage: 46, cooldown: 880, count: 18, area: 1.5, speed: 380, pierce: 3 }),
  },
  {
    id: 'furiousFlock',
    name: 'Furious Flock',
    icon: '🪿',
    blurb: 'Five geese. All furious. All at once. HONK.',
    behavior: 'orbit',
    texture: 'proj-goose-evo',
    evolvedFrom: 'sassyGoose',
    levels: evo({ damage: 72, cooldown: 230, count: 5, area: 150, speed: 320, pierce: 0 }),
  },
  {
    id: 'sundaeCyclone',
    name: 'Sundae Cyclone',
    icon: '🍨',
    blurb: 'A never-ending whirlwind of sundaes. With cherries on top.',
    behavior: 'spin',
    texture: 'proj-cone-evo',
    evolvedFrom: 'coneNado',
    // Duration equals the cooldown, so the ring never actually goes away.
    levels: evo({ damage: 50, cooldown: 2200, count: 10, area: 136, speed: 540, pierce: 0, duration: 2200 }),
  },
  {
    id: 'bigWarmHug',
    name: 'Big Warm Hug',
    icon: '🤗',
    blurb: 'A huge, healing hug. Grumps melt. You feel better.',
    behavior: 'aura',
    texture: 'fx-aura-evo',
    fx: 'fx-aura-evo',
    evolvedFrom: 'cuddleAura',
    heal: 1.5,
    levels: evo({ damage: 26, cooldown: 380, count: 1, area: 150, speed: 0, pierce: 0 }),
  },
  {
    id: 'pixieStorm',
    name: 'Pixie Storm',
    icon: '🌩️',
    blurb: 'Every pixie in the kingdom, zapping at once.',
    behavior: 'strike',
    texture: 'fx-zap-evo',
    fx: 'fx-zap-evo',
    evolvedFrom: 'pixieZap',
    levels: evo({ damage: 70, cooldown: 880, count: 8, area: 52, speed: 0, pierce: 0 }),
  },
  {
    id: 'jellyOcean',
    name: 'Jelly Ocean',
    icon: '🌊',
    blurb: 'Rainbow jelly, as far as the eye can see.',
    behavior: 'puddle',
    texture: 'fx-puddle-evo',
    fx: 'fx-puddle-evo',
    evolvedFrom: 'jellyPuddle',
    levels: evo({ damage: 24, cooldown: 2300, count: 4, area: 92, speed: 0, pierce: 0, duration: 5200 }),
  },
]

export const WEAPONS: Readonly<Record<WeaponId, WeaponDef>> = Object.fromEntries(
  WEAPON_LIST.map((w) => [w.id, w]),
) as Record<WeaponId, WeaponDef>

/** Every weapon, base and evolved. */
export const WEAPON_IDS: readonly WeaponId[] = WEAPON_LIST.map((w) => w.id)

/** The weapons that can turn up on a level-up card. */
export const BASE_WEAPON_IDS = WEAPON_LIST.filter((w) => !w.evolvedFrom).map((w) => w.id as BaseWeaponId)

export const EVOLUTION_IDS = WEAPON_LIST.filter((w) => w.evolvedFrom).map((w) => w.id as EvolutionId)

export function isEvolution(id: WeaponId): boolean {
  return WEAPONS[id].evolvedFrom !== undefined
}

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
