/**
 * Turns an {@link AreaDef} into actual scene objects: a baked ground layer,
 * collision bodies, scenery sprites, and the campfire.
 *
 * Everything it creates is tracked so {@link BuiltArea.destroy} can tear the
 * whole area down in one call when the player walks through an exit — the
 * scene itself never restarts, so the player, the camera and the input rig all
 * survive the transition.
 */
import Phaser from 'phaser'
import { DEPTH, TILE } from '../game/constants'
import { P } from '../art/palette'
import { seededRandom } from '../art/draw'
import { GROUND_VARIANTS, groundKey } from '../art/worldArt'
import { parseArea, tileCenter, type AreaDef, type ParsedArea, type PropKind } from './areas'

/** Collider footprint per prop, in px. Trees and thickets fill their tile. */
const PROP_BODY: Record<PropKind, { w: number; h: number; dy: number }> = {
  tree: { w: TILE, h: TILE, dy: 0 },
  'tree-dead': { w: TILE, h: TILE, dy: 0 },
  thicket: { w: TILE, h: TILE, dy: 0 },
  rock: { w: 42, h: 28, dy: 8 },
  bush: { w: 38, h: 24, dy: 10 },
  campfire: { w: 40, h: 30, dy: 6 },
}

/** Props that fill their whole tile, and so can be merged into long runs. */
const FULL_TILE: ReadonlySet<PropKind> = new Set<PropKind>(['tree', 'tree-dead', 'thicket'])

/** How high above the tile's bottom edge a prop's base sits. */
const PROP_FOOT = 6

export interface BuiltArea {
  def: AreaDef
  parsed: ParsedArea
  widthPx: number
  heightPx: number
  solids: Phaser.Physics.Arcade.StaticGroup
  /** World position of the campfire, if the area has one. */
  campfire: { x: number; y: number } | null
  /** Movement multiplier at a world position — bog slows you down. */
  dragAt(x: number, y: number): number
  destroy(): void
}

export function buildArea(scene: Phaser.Scene, def: AreaDef): BuiltArea {
  const parsed = parseArea(def)
  const widthPx = parsed.width * TILE
  const heightPx = parsed.height * TILE
  const created: Phaser.GameObjects.GameObject[] = []
  const rnd = seededRandom(def.id.length * 7717 + parsed.width * 31)

  // --- ground, baked into one texture so it costs a single draw call
  const ground = scene.add.renderTexture(0, 0, widthPx, heightPx).setOrigin(0, 0).setDepth(DEPTH.ground)
  ground.fill(P.void)
  for (const cell of parsed.cells) {
    const kind =
      cell.info.ground === 'bog' ? 'bog' : cell.info.ground === 'alt' ? def.altGround : def.ground
    const variant = Math.floor(rnd() * GROUND_VARIANTS)
    ground.draw(groundKey(kind, variant), cell.tx * TILE, cell.ty * TILE)
  }
  created.push(ground)

  // --- collision
  const solids = scene.physics.add.staticGroup()
  addFullTileRuns(scene, parsed, solids)
  for (const cell of parsed.cells) {
    const prop = cell.info.prop
    if (!prop || FULL_TILE.has(prop)) continue
    const body = PROP_BODY[prop]
    const center = tileCenter(cell.tx, cell.ty, TILE)
    addSolid(scene, solids, center.x, center.y + body.dy, body.w, body.h)
  }

  // --- scenery
  let campfire: { x: number; y: number } | null = null
  for (const cell of parsed.cells) {
    const prop = cell.info.prop
    if (!prop) continue
    const center = tileCenter(cell.tx, cell.ty, TILE)
    const footY = (cell.ty + 1) * TILE - PROP_FOOT

    if (prop === 'thicket') continue // Nothing to draw; it's the void beyond the map.

    if (prop === 'campfire') {
      campfire = { x: center.x, y: footY - 8 }
      created.push(...addCampfire(scene, center.x, footY))
      continue
    }

    // A little deterministic jitter, so a wall of trees doesn't read as a grid.
    const jx = (rnd() - 0.5) * 10
    const jy = (rnd() - 0.5) * 5
    const sprite = scene.add
      .image(center.x + jx, footY + jy, prop)
      .setOrigin(0.5, 1)
      .setScale(0.92 + rnd() * 0.22)
      .setFlipX(rnd() > 0.5)
      .setDepth(DEPTH.sprites + footY + jy)
    created.push(sprite)
  }

  // --- mood: a colour wash over the world, and mist on top of it
  const wash = scene.add
    .rectangle(0, 0, widthPx, heightPx, def.tint, def.tintAlpha)
    .setOrigin(0, 0)
    .setDepth(DEPTH.overlay - 20)
  created.push(wash)

  if (def.fog > 0) {
    const fog = scene.add
      .tileSprite(0, 0, widthPx, heightPx, 'fog')
      .setOrigin(0, 0)
      .setAlpha(def.fog)
      .setDepth(DEPTH.overlay - 10)
    created.push(fog)
    // Drifting, not scrolling: the mist moves independently of the camera.
    scene.tweens.add({
      targets: fog,
      tilePositionX: 256,
      duration: 26_000,
      repeat: -1,
    })
    scene.tweens.add({
      targets: fog,
      tilePositionY: 128,
      duration: 41_000,
      repeat: -1,
    })
  }

  const dragAt = (x: number, y: number): number => {
    const tx = Math.floor(x / TILE)
    const ty = Math.floor(y / TILE)
    if (tx < 0 || ty < 0 || tx >= parsed.width || ty >= parsed.height) return 1
    return parsed.cells[ty * parsed.width + tx].info.drag ?? 1
  }

  return {
    def,
    parsed,
    widthPx,
    heightPx,
    solids,
    campfire,
    dragAt,
    destroy(): void {
      for (const object of created) object.destroy()
      // Only tear the collision group down if it's still standing. This runs
      // both when swapping areas mid-scene, where the group is live, and from
      // the scene's own shutdown, where Phaser has already emptied it — and
      // clearing it twice throws, which used to take the rest of shutdown with
      // it on the way out to the title screen.
      if (solids.children) {
        solids.clear(true, true)
        solids.destroy(true)
      }
    },
  }
}

/**
 * Merges horizontal runs of full-tile solids into one body each.
 *
 * The tree walls that ring every area are long and unbroken, so this turns a
 * few hundred single-tile bodies into a few dozen — and, more usefully, removes
 * the seams between adjacent bodies that a fast-moving wolf can otherwise catch
 * a corner on.
 */
function addFullTileRuns(
  scene: Phaser.Scene,
  parsed: ParsedArea,
  solids: Phaser.Physics.Arcade.StaticGroup,
): void {
  for (let ty = 0; ty < parsed.height; ty++) {
    let runStart = -1
    for (let tx = 0; tx <= parsed.width; tx++) {
      const prop = tx < parsed.width ? parsed.cells[ty * parsed.width + tx].info.prop : undefined
      const isRun = prop !== undefined && FULL_TILE.has(prop)
      if (isRun && runStart === -1) runStart = tx
      if (!isRun && runStart !== -1) {
        const length = tx - runStart
        addSolid(
          scene,
          solids,
          (runStart + length / 2) * TILE,
          (ty + 0.5) * TILE,
          length * TILE,
          TILE,
        )
        runStart = -1
      }
    }
  }
}

/** An invisible static body. Rectangles are used so debug draw shows them. */
function addSolid(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.StaticGroup,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const rect = scene.add.rectangle(x, y, w, h).setVisible(false)
  scene.physics.add.existing(rect, true)
  group.add(rect)
}

/** The campfire: embers, a flickering flame, and the light it throws. */
function addCampfire(scene: Phaser.Scene, x: number, footY: number): Phaser.GameObjects.GameObject[] {
  const glow = scene.add
    .image(x, footY - 10, 'glow')
    .setTint(P.fire)
    .setAlpha(0.4)
    .setScale(2.2)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(DEPTH.decal)
  const logs = scene.add.image(x, footY, 'campfire').setOrigin(0.5, 1).setDepth(DEPTH.sprites + footY)
  const flame = scene.add
    .image(x, footY - 6, 'flame')
    .setOrigin(0.5, 1)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(DEPTH.sprites + footY + 1)

  scene.tweens.add({
    targets: flame,
    scaleY: { from: 0.86, to: 1.12 },
    scaleX: { from: 1.08, to: 0.9 },
    duration: 380,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })
  scene.tweens.add({
    targets: glow,
    alpha: { from: 0.32, to: 0.5 },
    scale: { from: 2.1, to: 2.45 },
    duration: 900,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })

  return [glow, logs, flame]
}
