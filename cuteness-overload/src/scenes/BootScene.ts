import Phaser from 'phaser'
import { buildTextures } from '../art/textures'
import { sfx } from '../audio/sfx'
import { loadSave } from '../game/save'

/**
 * Draws every sprite into the texture cache and hands over to the menu. There
 * is nothing to download, so this is a single frame in practice.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  create(): void {
    buildTextures(this.textures, this.anims)
    sfx.setMuted(loadSave().muted)
    this.scene.start('Menu')
  }
}
