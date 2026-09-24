/**
 * An endless field of static obstacles (the forest's bushes), streamed in and
 * out around the camera.
 *
 * The world has no bounds, so there's no layout to generate up front and nowhere
 * to store one. Instead each grid cell's contents are a pure function of its
 * coordinates: walk away and back, and the same bushes are there. That also means
 * two players on the same level see the same forest, and a bush can never appear
 * on top of somebody because a cell only ever materialises off-screen.
 */
import Phaser from 'phaser'
import { ART_SCALE } from '../art/textures'
import { DEPTH } from './depth'
import type { ObstacleDef } from '../data/levels'

/**
 * Deterministic 0..1 from a pair of integers. A plain `Math.sin` hash has
 * visible diagonal banding at this cell size; this is a cheap integer mix.
 */
export function hash2(x: number, y: number, salt: number): number {
  let h = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(salt, 83492791)
  h = Math.imul(h ^ (h >>> 15), 2246822519)
  h = Math.imul(h ^ (h >>> 13), 3266489917)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export class ObstacleField {
  /** Cell key -> the sprite currently representing it. */
  private readonly live = new Map<string, Phaser.Physics.Arcade.Sprite>()

  constructor(
    private readonly group: Phaser.Physics.Arcade.StaticGroup,
    private readonly def: ObstacleDef,
  ) {}

  /**
   * Materialises the obstacles for every cell overlapping `view` (plus a margin
   * so nothing pops in at the screen edge) and retires the rest.
   */
  update(view: Phaser.Geom.Rectangle): void {
    const { cell } = this.def
    const margin = cell * 1.5
    const minX = Math.floor((view.x - margin) / cell)
    const maxX = Math.floor((view.right + margin) / cell)
    const minY = Math.floor((view.y - margin) / cell)
    const maxY = Math.floor((view.bottom + margin) / cell)

    for (const [key, sprite] of this.live) {
      const comma = key.indexOf(',')
      const cx = Number(key.slice(0, comma))
      const cy = Number(key.slice(comma + 1))
      if (cx < minX || cx > maxX || cy < minY || cy > maxY) {
        // Static bodies aren't worth pooling: destroying drops the body from the
        // RTree, which is what keeps collision checks cheap.
        sprite.destroy()
        this.live.delete(key)
      }
    }

    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        const key = `${cx},${cy}`
        if (this.live.has(key)) continue
        if (hash2(cx, cy, 1) > this.def.chance) continue
        // Jittered inside the cell so the field doesn't read as a grid.
        const x = (cx + 0.2 + hash2(cx, cy, 2) * 0.6) * cell
        const y = (cy + 0.2 + hash2(cx, cy, 3) * 0.6) * cell
        const textures = this.def.textures
        const texture = textures[Math.floor(hash2(cx, cy, 4) * textures.length) % textures.length]
        this.live.set(key, this.spawn(x, y, texture, hash2(cx, cy, 5) < 0.5))
      }
    }
  }

  private spawn(x: number, y: number, texture: string, flip: boolean): Phaser.Physics.Arcade.Sprite {
    const sprite = this.group.create(x, y, texture) as Phaser.Physics.Arcade.Sprite
    sprite.setScale(this.def.scale * ART_SCALE).setDepth(DEPTH.obstacle).setFlipX(flip)
    const body = sprite.body as Phaser.Physics.Arcade.StaticBody | null
    if (body) {
      // Same conversion as the dynamic bodies: radius is in texture pixels and
      // gets multiplied by the sprite scale, and the offset is from the frame's
      // top-left rather than its centre.
      const scale = Math.abs(sprite.scaleX) || 1
      const source = this.def.radius / scale
      body.setCircle(source, sprite.frame.width / 2 - source, sprite.frame.height / 2 - source)
      body.updateFromGameObject()
    }
    return sprite
  }

  /**
   * Whether an obstacle sits within `margin` px of (x, y). Works from the hash
   * rather than the live sprites, so it answers for cells not streamed in yet.
   */
  occupied(x: number, y: number, margin: number): boolean {
    const { cell } = this.def
    const reach = this.def.radius + margin
    const ccx = Math.floor(x / cell)
    const ccy = Math.floor(y / cell)
    for (let cy = ccy - 1; cy <= ccy + 1; cy++) {
      for (let cx = ccx - 1; cx <= ccx + 1; cx++) {
        if (hash2(cx, cy, 1) > this.def.chance) continue
        const ox = (cx + 0.2 + hash2(cx, cy, 2) * 0.6) * cell
        const oy = (cy + 0.2 + hash2(cx, cy, 3) * 0.6) * cell
        if ((ox - x) ** 2 + (oy - y) ** 2 < reach * reach) return true
      }
    }
    return false
  }

  /** Live obstacles, for line-of-sight checks. */
  all(): Iterable<Phaser.Physics.Arcade.Sprite> {
    return this.live.values()
  }

  /**
   * How far a ray from (x, y) heading `angle` travels before it meets an
   * obstacle, capped at `maxLength`. Used to stop beams passing through bushes.
   */
  rayDistance(x: number, y: number, angle: number, maxLength: number): number {
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    let nearest = maxLength
    for (const sprite of this.live.values()) {
      const ox = sprite.x - x
      const oy = sprite.y - y
      // Closest approach of the ray to the obstacle's centre.
      const along = ox * dx + oy * dy
      if (along < 0 || along - this.def.radius > nearest) continue
      const perp = Math.abs(-ox * dy + oy * dx)
      if (perp > this.def.radius) continue
      // Step back to where the ray actually enters the circle.
      const hit = along - Math.sqrt(this.def.radius * this.def.radius - perp * perp)
      if (hit >= 0 && hit < nearest) nearest = hit
    }
    return nearest
  }

  destroy(): void {
    for (const sprite of this.live.values()) sprite.destroy()
    this.live.clear()
  }
}
