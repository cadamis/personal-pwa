/**
 * Builds every texture and animation the game needs, then hands off.
 *
 * The interesting part is the character sheets. Each form's real artwork is
 * requested from `public/sprites/`; anything that isn't there yet 404s, and the
 * matching placeholder sheet is generated instead. Both paths end up as the
 * same texture key with the same frame grid, so nothing downstream knows or
 * cares which one it got.
 */
import Phaser from 'phaser'
import { buildWorldTextures } from '../art/worldArt'
import { buildIntroTextures } from '../art/introArt'
import { buildPlaceholderSheet } from '../art/placeholderChars'
import { CLIPS, FACINGS, SHEETS, animKey, clipFrames, clipSpec, type SheetSpec } from '../art/sheets'
import { P, cssHex } from '../art/palette'
import { FONT } from '../ui/theme'
import type { FormId } from '../game/forms'

export class BootScene extends Phaser.Scene {
  /** Sheets whose file didn't load, and so need a placeholder. */
  private readonly missing = new Set<string>()

  constructor() {
    super('boot')
  }

  preload(): void {
    this.cameras.main.setBackgroundColor(P.void)
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'The Last Hybrid', {
        fontFamily: FONT,
        fontSize: '32px',
        color: cssHex(P.inkSoft),
      })
      .setOrigin(0.5)

    // Nothing here touches the network, so it can happen during preload.
    buildWorldTextures(this)
    buildIntroTextures(this)

    // A missing sheet is the expected case until the real art lands, so this
    // must not be treated as a failure — just note it and move on.
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      this.missing.add(file.key)
    })

    for (const spec of Object.values(SHEETS)) {
      this.load.spritesheet(spec.key, spec.file, {
        frameWidth: spec.frameWidth,
        frameHeight: spec.frameHeight,
      })
    }
  }

  create(): void {
    const usingPlaceholders: FormId[] = []
    for (const spec of Object.values(SHEETS)) {
      if (this.missing.has(spec.key) || !this.textures.exists(spec.key)) {
        installPlaceholder(this, spec)
        usingPlaceholders.push(spec.key)
      }
    }
    if (usingPlaceholders.length > 0) {
      // Worth saying out loud: it's the difference between "the art is wrong"
      // and "the art isn't in the build".
      console.info(
        `[last-hybrid] placeholder art in use for: ${usingPlaceholders.join(', ')}. ` +
          'Drop the real sheets in public/sprites/ to replace them.',
      )
    }
    this.registry.set('placeholderForms', usingPlaceholders)

    createCharacterAnims(this)
    // The file select, not the intro: the opening plays once, for a character
    // who has just been created, not every time the game is opened.
    this.scene.start('title')
  }
}

/** Draws a stand-in sheet and registers it under the real sheet's key. */
function installPlaceholder(scene: Phaser.Scene, spec: SheetSpec): void {
  const canvas = buildPlaceholderSheet(spec, spec.key)
  // The texture manager accepts a canvas anywhere it accepts an image; the
  // published types only mention images, hence the cast.
  scene.textures.addSpriteSheet(spec.key, canvas as unknown as HTMLImageElement, {
    frameWidth: spec.frameWidth,
    frameHeight: spec.frameHeight,
  })
}

/**
 * Registers every form × clip × facing animation.
 *
 * Frame numbers come from {@link clipFrames}, which is also what the
 * placeholder painter lays out against — so the animations and the art can't
 * disagree about where a frame is.
 */
export function createCharacterAnims(scene: Phaser.Scene): void {
  for (const spec of Object.values(SHEETS)) {
    for (const clip of CLIPS) {
      const layout = clipSpec(spec, clip)
      for (const facing of FACINGS) {
        const key = animKey(spec.key, clip, facing)
        if (scene.anims.exists(key)) continue
        scene.anims.create({
          key,
          frames: scene.anims.generateFrameNumbers(spec.key, { frames: clipFrames(spec, clip, facing) }),
          frameRate: layout.frameRate,
          repeat: layout.repeat,
        })
      }
    }
  }
}
