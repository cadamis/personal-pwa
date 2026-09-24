/**
 * Breakable presents, streamed around the camera like the forest's bushes.
 *
 * A present is spawned as a `still` {@link Enemy} so every weapon can already
 * pop it — the game just skips `still` Grumps wherever it aims, counts, chases
 * or takes bumps. Popped presents are remembered for the rest of the run so
 * walking back past the same spot doesn't refill it.
 */
import type Phaser from 'phaser'
import type { Enemy } from './entities'
import { hash2 } from './obstacles'

const PRESENT_TEXTURES = ['prop-present-pink', 'prop-present-mint', 'prop-present-lilac'] as const

export class PresentField {
  private readonly live = new Map<string, Enemy>()
  private readonly popped = new Set<string>()

  constructor(
    private readonly cell: number,
    private readonly chance: number,
    /** Asks the scene for a present at (x, y); null if the pool is full. */
    private readonly spawn: (x: number, y: number, texture: string, key: string) => Enemy | null,
    /** Keeps presents off the obstacle cells, which would otherwise shove them about. */
    private readonly blocked: (x: number, y: number) => boolean = () => false,
  ) {}

  update(view: Phaser.Geom.Rectangle): void {
    const { cell } = this
    const minX = Math.floor((view.x - cell * 0.5) / cell)
    const maxX = Math.floor((view.right + cell * 0.5) / cell)
    const minY = Math.floor((view.y - cell * 0.5) / cell)
    const maxY = Math.floor((view.bottom + cell * 0.5) / cell)

    for (const [key, enemy] of this.live) {
      // Popped (and pooled into something else) since we last looked.
      if (!enemy.active || enemy.propKey !== key) {
        this.live.delete(key)
        continue
      }
      const comma = key.indexOf(',')
      const cx = Number(key.slice(0, comma))
      const cy = Number(key.slice(comma + 1))
      if (cx < minX - 1 || cx > maxX + 1 || cy < minY - 1 || cy > maxY + 1) {
        enemy.retire()
        this.live.delete(key)
      }
    }

    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        const key = `${cx},${cy}`
        if (this.live.has(key) || this.popped.has(key)) continue
        if (hash2(cx, cy, 21) > this.chance) continue
        const x = (cx + 0.15 + hash2(cx, cy, 22) * 0.7) * cell
        const y = (cy + 0.15 + hash2(cx, cy, 23) * 0.7) * cell
        // Only materialise off-screen, so a present never pops into view.
        if (view.contains(x, y)) continue
        if (this.blocked(x, y)) continue
        const texture = PRESENT_TEXTURES[Math.floor(hash2(cx, cy, 24) * PRESENT_TEXTURES.length) % PRESENT_TEXTURES.length]
        const enemy = this.spawn(x, y, texture, key)
        if (enemy) this.live.set(key, enemy)
      }
    }
  }

  /** Called when a present is popped, so it stays popped. */
  pop(key: string): void {
    this.popped.add(key)
    this.live.delete(key)
  }

  get count(): number {
    return this.live.size
  }
}
