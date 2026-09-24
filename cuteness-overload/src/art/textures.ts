/**
 * Every sprite in the game, drawn once at boot.
 *
 * Each painter returns a canvas whose *display* size is stated in display
 * pixels; because the canvas is {@link ART_SS}x that, sprites are shown at
 * {@link ART_SCALE}. Anything that creates a sprite should multiply its scale by
 * ART_SCALE.
 */
import type Phaser from 'phaser'
import { ART_SS, withGlow, type Canvas2D } from './draw'
import * as crew from './sprites/crew'
import * as grumps from './sprites/grumps'
import * as proj from './sprites/projectiles'
import * as world from './sprites/world'
import * as fx from './sprites/fx'
import * as ui from './sprites/ui'
import * as grumps2 from './sprites/grumps2'
import * as evo from './sprites/evolutions'
import * as world2 from './sprites/world2'

/** Scale to display art at its intended size. */
export const ART_SCALE = 1 / ART_SS

export interface SpriteDef {
  /** Paints frame `frame` (0-based). Every frame must be the same size. */
  paint: (frame: number) => Canvas2D
  /** Animation frames, laid side by side in one texture. Default 1. */
  frames?: number
  /** Playback speed when animated. */
  fps?: number
  /**
   * How much bigger than its design size the painter drew this sprite. A boss
   * shown at 2.4x is painted at 2.4x, so whatever displays it divides this
   * back out (see {@link artScale}) instead of stretching a small texture.
   */
  zoom?: number
}

const one = (paint: (frame: number) => Canvas2D): SpriteDef => ({ paint })
/**
 * An enemy shot: its art plus a soft warm halo, so the things you have to dodge
 * stand out from a screen full of weapon effects.
 */
const foeShot = (paint: (frame: number) => Canvas2D): SpriteDef => ({
  paint: (frame) => withGlow(paint(frame), 0xfffbe8, 4.5, 1),
})
const anim = (paint: (frame: number) => Canvas2D, fps: number, frames = 2, zoom?: number): SpriteDef => ({
  paint,
  frames,
  fps,
  zoom,
})

/**
 * Every sprite, by texture key. Exported so tooling (and the art preview page)
 * can render one sprite without booting a whole Phaser game.
 */
export const SPRITES: Readonly<Record<string, SpriteDef>> = {
  'char-mochi': one(crew.mochi),
  'char-nimbus': one(crew.nimbus),
  'char-waffles': one(crew.waffles),
  'char-pip': one(crew.pip),
  'char-blobbo': one(crew.blobbo),
  'char-puddles': one(crew.puddles),
  'char-pillow': one(crew.pillow),
  'char-twinkle': one(crew.twinkle),
  'char-jellybean': one(crew.jellybean),
  'char-fluffy': one(crew.fluffy),

  'foe-snail': anim(grumps.snail, 3),
  'foe-bee': anim(grumps.bee, 12),
  'foe-slime': anim(grumps.slime, 3),
  'foe-acorn': anim(grumps.acorn, 5),
  'foe-cloud': anim(grumps.cloudFoe, 4),
  'foe-moth': anim(grumps.moth, 8),
  'foe-gnome': anim(grumps.gnome, 4, 2, 1.7),
  'foe-fluffington': anim(grumps.fluffington, 2, 2, 2.4),
  'foe-monkey': anim(grumps.monkey, 3, 2, 2.3),

  'foe-penguin': anim(grumps2.penguin, 5),
  'foe-snowball': anim(grumps2.snowballFoe, 4),
  'foe-fox': anim(grumps2.fox, 8),
  'foe-owl': anim(grumps2.owl, 7),
  'foe-yeti': anim(grumps2.yeti, 4),
  'foe-snowman': anim(grumps2.snowman, 3, 2, 1.8),
  'foe-waddles': anim(grumps2.waddles, 3, 2, 2.4),
  'foe-gummy': anim(grumps2.gummy, 5),
  'foe-jelly': anim(grumps2.jelly, 4),
  'foe-candycorn': anim(grumps2.candyCorn, 5),
  'foe-cotton': anim(grumps2.cotton, 3),
  'foe-peppermint': anim(grumps2.peppermint, 10),
  'foe-gumball': anim(grumps2.gumball, 4, 2, 1.8),
  'foe-gingerbread': anim(grumps2.gingerbread, 3, 2, 2.5),
  'foe-star': anim(grumps2.starFoe, 4),
  'foe-sheep': anim(grumps2.sheep, 3),
  'foe-ufo': anim(grumps2.ufo, 5),
  'foe-comet': anim(grumps2.cometPup, 8),
  'foe-shooting': anim(grumps2.shootingStar, 8),
  'foe-ursa': anim(grumps2.ursa, 3, 2, 1.9),
  'foe-king': anim(grumps2.king, 3, 2, 2.6),

  'proj-fluff': foeShot(grumps2.fluffShot),
  'proj-banana': foeShot(grumps2.bananaShot),
  'proj-snowflake': foeShot(grumps2.snowflakeShot),
  'proj-gumball': foeShot(grumps2.gumballShot),
  'proj-sprinkleshot': foeShot(grumps2.sprinkleShot),
  'proj-starshot': foeShot(grumps2.starShot),

  'fx-aura': one(evo.aura),
  'fx-zap': one(evo.zap),
  'fx-puddle': one(evo.puddle),
  'proj-bubble-evo': one(evo.bubbleEvo),
  'prop-parasol': one(evo.parasol),
  'fx-swipe-evo': one(evo.swipeEvo),
  'proj-spike-evo': one(evo.spikeEvo),
  'proj-carrot-evo': one(evo.carrotEvo),
  'fx-nova-evo': one(evo.novaEvo),
  'proj-kitten-evo': one(evo.kittenEvo),
  'fx-beam-evo': one(evo.beamEvo),
  'prop-cupcake-evo': one(evo.cupcakeEvo),
  'proj-frosting-evo': one(evo.frostingEvo),
  'proj-boba-evo': one(evo.bobaEvo),
  'proj-sticker-evo': one(evo.stickerEvo),
  'proj-goose-evo': one(evo.gooseEvo),
  'proj-cone-evo': one(evo.coneEvo),
  'fx-aura-evo': one(evo.auraEvo),
  'fx-zap-evo': one(evo.zapEvo),
  'fx-puddle-evo': one(evo.puddleEvo),
  'fx-crown': one(evo.crown),

  'bg-peaks': one(world2.peaks),
  'bg-candy': one(world2.candy),
  'bg-dream': one(world2.dream),
  'prop-snowrock': one(world2.snowRock),
  'prop-snowpine': one(world2.snowPine),
  'prop-icecrystal': one(world2.iceCrystal),
  'prop-gumdrop': one(world2.gumdrop),
  'prop-lollipop': one(world2.lollipop),
  'prop-cupcakehill': one(world2.cupcakeHill),
  'prop-moonrock': one(world2.moonRock),
  'prop-dreamcloud': one(world2.dreamCloud),
  'prop-starlamp': one(world2.starLamp),
  'decal-snowflakes': one(world2.decalSnowflakes),
  'decal-snowdrift': one(world2.decalSnowdrift),
  'decal-pawprints': one(world2.decalPawprints),
  'decal-icecrack': one(world2.decalIcecrack),
  'decal-sprinkles': one(world2.decalSprinkles),
  'decal-candies': one(world2.decalCandies),
  'decal-frosting': one(world2.decalFrosting),
  'decal-hearts': one(world2.decalHearts),
  'decal-stars': one(world2.decalStars),
  'decal-moonflower': one(world2.decalMoonflower),
  'decal-sparkles': one(world2.decalSparkles),
  'decal-crater': one(world2.decalCrater),

  'proj-bubble': one(proj.bubble),
  'proj-spike': one(proj.spike),
  'proj-carrot': one(proj.carrot),
  'proj-kitten': one(proj.kittenMissile),
  'proj-frosting': one(proj.frosting),
  'proj-boba': one(proj.boba),
  'proj-sticker': one(proj.sticker),
  'proj-goose': one(proj.goose),
  'proj-cone': one(proj.cone),
  'proj-raindrop': foeShot(proj.raindrop),
  'prop-cupcake': one(proj.cupcake),
  'prop-umbrella': one(proj.umbrella),

  'fx-swipe': one(fx.swipe),
  'fx-nova': one(fx.nova),
  'fx-beam': one(proj.beam),
  'fx-puff': one(fx.puff),
  'fx-star': one(fx.starDust),
  'fx-heart': one(fx.heartBit),
  'fx-poof': one(fx.poof),
  'fx-hit': one(fx.hitFlash),
  'fx-ring': one(fx.ring),
  'fx-rays': one(fx.rays),
  'fx-zzz': one(fx.zzz),
  'fx-twinkle': one(fx.twinkle),

  'pick-heart': one(() => world.paintHeartGem(0)),
  'pick-heart2': one(() => world.paintHeartGem(1)),
  'pick-heart3': one(() => world.paintHeartGem(2)),
  'pick-sprinkle': one(world.sprinklePickup),
  'pick-snack': one(world.snackPickup),
  'pick-chest': anim(world.chestPickup, 3),
  'pick-magnet': one(world.magnetPickup),
  'pick-bomb': one(world.bombPickup),
  'pick-freeze': one(world.freezePickup),
  'pick-bag': one(world.bagPickup),
  'prop-present-pink': one(() => world.paintPresent(0xff9ec8, 0xfff3a3)),
  'prop-present-mint': one(() => world.paintPresent(0x9ee8cc, 0xff7eb6)),
  'prop-present-lilac': one(() => world.paintPresent(0xc4b0ff, 0x7ad8ff)),

  'bg-meadow': one(world.meadow),
  'bg-forest': one(world.forest),
  'prop-bush': one(world.bush),
  'prop-bush-plain': one(world.bushPlain),
  'prop-stump': one(world.stump),

  'decal-daisies': one(world.decalDaisies),
  'decal-pink': one(world.decalPinkFlowers),
  'decal-clover': one(world.decalClover),
  'decal-tuft': one(world.decalTuft),
  'decal-pebbles': one(world.decalPebbles),
  'decal-leaves': one(world.decalLeaves),
  'decal-mushrooms': one(world.decalMushrooms),
  'decal-fern': one(world.decalFern),

  'ui-stick-base': one(ui.stickBase),
  'ui-stick-knob': one(ui.stickKnob),
  'ui-pointer': one(ui.pointer),
}

/**
 * Sprite scale that shows `texture` at its design size: {@link ART_SCALE},
 * corrected for sprites that were painted pre-zoomed.
 */
export function artScale(texture: string): number {
  return ART_SCALE / (SPRITES[texture]?.zoom ?? 1)
}

/** Canvas pixels of spare room round each built texture, by key. */
const PADS = new Map<string, number>()

/** Animation key for an animated texture. */
export function animKey(texture: string): string {
  return `${texture}:loop`
}

/**
 * On-screen width of a sprite's art, leaving out the spare room some painters
 * leave round the edge (see `Canvas2D.pad`). Use this, not displayWidth, for
 * anything gameplay-sized such as a hit radius.
 */
export function artWidth(sprite: Phaser.GameObjects.Sprite): number {
  const pad = PADS.get(sprite.texture.key) ?? 0
  return sprite.displayWidth * Math.max(0, 1 - (pad * 2) / sprite.frame.width)
}

/**
 * Draws every sprite into the texture manager, and registers a looping
 * animation for each one with more than one frame. Safe to call more than once.
 */
export function buildTextures(textures: Phaser.Textures.TextureManager, anims?: Phaser.Animations.AnimationManager): void {
  for (const [key, def] of Object.entries(SPRITES)) {
    if (textures.exists(key)) continue
    const frames = def.frames ?? 1
    if (frames === 1) {
      const art = def.paint(0)
      textures.addCanvas(key, art.canvas)
      PADS.set(key, art.pad)
      continue
    }
    const painted = def.paint(0)
    const first = painted.canvas
    const fw = first.width
    const fh = first.height
    const strip = document.createElement('canvas')
    strip.width = fw * frames
    strip.height = fh
    const ctx = strip.getContext('2d')
    ctx?.drawImage(first, 0, 0)
    for (let f = 1; f < frames; f++) ctx?.drawImage(def.paint(f).canvas, f * fw, 0)
    const texture = textures.addCanvas(key, strip)
    if (!texture) continue
    PADS.set(key, painted.pad)
    for (let f = 0; f < frames; f++) texture.add(f, 0, f * fw, 0, fw, fh)
    if (anims && !anims.exists(animKey(key))) {
      anims.create({
        key: animKey(key),
        frames: Array.from({ length: frames }, (_, f) => ({ key, frame: f })),
        frameRate: def.fps ?? 6,
        repeat: -1,
      })
    }
  }
}
