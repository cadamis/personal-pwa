/**
 * Ground decoration (flowers, clover, leaves), streamed around the camera.
 *
 * Same trick as {@link ObstacleField}: a cell's contents are a pure hash of its
 * coordinates, so walking away and back finds the same daisies, and nothing is
 * stored for the endless world. Unlike obstacles these are plain images with no
 * physics, pooled rather than destroyed because there are a lot more of them.
 */
import Phaser from 'phaser'
import { ART_SCALE } from '../art/textures'
import { DEPTH } from './depth'
import type { DecalDef } from '../data/levels'
import { hash2 } from './obstacles'

export class DecalField {
  private readonly live = new Map<string, Phaser.GameObjects.Image>()
  private readonly spare: Phaser.GameObjects.Image[] = []

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly def: DecalDef,
  ) {}

  update(view: Phaser.Geom.Rectangle): void {
    const { cell } = this.def
    const margin = cell
    const minX = Math.floor((view.x - margin) / cell)
    const maxX = Math.floor((view.right + margin) / cell)
    const minY = Math.floor((view.y - margin) / cell)
    const maxY = Math.floor((view.bottom + margin) / cell)

    for (const [key, image] of this.live) {
      const comma = key.indexOf(',')
      const cx = Number(key.slice(0, comma))
      const cy = Number(key.slice(comma + 1))
      if (cx < minX || cx > maxX || cy < minY || cy > maxY) {
        image.setVisible(false)
        this.spare.push(image)
        this.live.delete(key)
      }
    }

    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        const key = `${cx},${cy}`
        if (this.live.has(key)) continue
        if (hash2(cx, cy, 11) > this.def.chance) continue
        const textures = this.def.textures
        const texture = textures[Math.floor(hash2(cx, cy, 12) * textures.length) % textures.length]
        const x = (cx + hash2(cx, cy, 13)) * cell
        const y = (cy + hash2(cx, cy, 14)) * cell
        const image = this.spare.pop() ?? this.scene.add.image(0, 0, texture)
        image
          .setTexture(texture)
          .setPosition(x, y)
          .setScale(ART_SCALE * (0.85 + hash2(cx, cy, 15) * 0.4))
          .setFlipX(hash2(cx, cy, 16) < 0.5)
          .setAlpha(this.def.alpha)
          .setDepth(DEPTH.decals)
          .setVisible(true)
        this.live.set(key, image)
      }
    }
  }

  destroy(): void {
    for (const image of this.live.values()) image.destroy()
    for (const image of this.spare) image.destroy()
    this.live.clear()
    this.spare.length = 0
  }
}
