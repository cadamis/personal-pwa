/**
 * Every map in the game, as ASCII.
 *
 * A grid of characters is the cheapest thing to read, diff and hand-edit, and
 * it keeps the level data completely free of Phaser — which is what lets
 * {@link parseArea} be checked by a test rather than by squinting at the
 * screen. Adding an area later means adding one entry to {@link AREAS} and
 * pointing an exit at it; nothing else needs to know it exists.
 *
 * ```
 *   .  walkable ground          T  tree            b  bush
 *   ,  packed dirt / path       t  dead tree       R  rock
 *   ~  bog (walkable, slow)     #  dense thicket   F  campfire
 * ```
 */
import type { Facing } from '../art/sheets'
import type { GroundKind } from '../art/worldArt'

export const AREA_IDS = ['clearing', 'forest'] as const
export type AreaId = (typeof AREA_IDS)[number]

export type EnemyType = 'husk' | 'stalker'

export type PropKind = 'tree' | 'tree-dead' | 'rock' | 'bush' | 'campfire' | 'thicket'

/** What a map character means. */
export interface TileInfo {
  solid: boolean
  /** Which of the area's ground textures to lay under it. */
  ground: 'base' | 'alt' | 'bog'
  /** Scenery to stand on the tile, if any. */
  prop?: PropKind
  /** Movement multiplier for walkable tiles. */
  drag?: number
}

const TILE_TYPES: Record<string, TileInfo> = {
  '.': { solid: false, ground: 'base' },
  ',': { solid: false, ground: 'alt' },
  '~': { solid: false, ground: 'bog', drag: 0.55 },
  T: { solid: true, ground: 'base', prop: 'tree' },
  t: { solid: true, ground: 'base', prop: 'tree-dead' },
  R: { solid: true, ground: 'base', prop: 'rock' },
  b: { solid: true, ground: 'base', prop: 'bush' },
  '#': { solid: true, ground: 'bog', prop: 'thicket' },
  F: { solid: true, ground: 'alt', prop: 'campfire' },
}

export function tileInfo(char: string): TileInfo {
  const info = TILE_TYPES[char]
  if (!info) throw new Error(`Unknown map character: ${JSON.stringify(char)}`)
  return info
}

/** A named arrival point, in tile coordinates. */
export interface AreaSpawn {
  tx: number
  ty: number
  facing: Facing
}

/** A doorway. Standing anywhere in `rect` (tile coords) moves you on. */
export interface AreaExit {
  tx: number
  ty: number
  w: number
  h: number
  to: AreaId
  /** Name of the spawn point to arrive at in the destination area. */
  spawn: string
  label: string
}

export interface AreaDef {
  id: AreaId
  name: string
  ground: GroundKind
  altGround: GroundKind
  /** Colour laid over the whole area, and how strongly. Sets the mood. */
  tint: number
  tintAlpha: number
  /** Drifting mist, 0 for none. */
  fog: number
  tiles: string[]
  spawns: Record<string, AreaSpawn>
  exits: AreaExit[]
  enemies: Array<{ type: EnemyType; tx: number; ty: number }>
}

// The base. Safe, warm, and completely walled in except for the way north.
const CLEARING: string[] = [
  'TTTTTTTTT...TTTTTTTTT',
  'TTTTTTTT.....TTTTTTTT',
  'TT.................TT',
  'T...................T',
  'T.....b.......b.....T',
  'T...................T',
  'T........,,,........T',
  'T.......,,F,,.......T',
  'T........,,,........T',
  'T...................T',
  'T....R.........R....T',
  'TT.................TT',
  'TT......b...b......TT',
  'TTT...............TTT',
  'TTTTTTTTTTTTTTTTTTTTT',
]

// The spooky wood. Bigger, darker, a bog in the middle to funnel fights.
const FOREST: string[] = [
  '#########################',
  '##TTt...............tTT##',
  '#TT.....t.......t.....TT#',
  '#T...b.....TT.....b....T#',
  '#T.......~~~~~.........T#',
  '#Tt.....~~~~~~~......t.T#',
  '#T.......~~~~~.........T#',
  '#T...R.....b.......R...T#',
  '#T.....................T#',
  '#T..t.......t.......t..T#',
  '#T.....................T#',
  '#TT...b.........b.....TT#',
  '#T.........RR..........T#',
  '#T.....................T#',
  '#Tt...t.........t....t.T#',
  '#T.....................T#',
  '#TT...................TT#',
  '#TTT.................TTT#',
  '#TTTT...............TTTT#',
  '#TTTTTTTTTTT...TTTTTTTTT#',
  '############...##########',
]

export const AREAS: Record<AreaId, AreaDef> = {
  clearing: {
    id: 'clearing',
    name: 'The Hollow',
    ground: 'grass',
    altGround: 'dirt',
    tint: 0x2a3550,
    tintAlpha: 0.2,
    fog: 0,
    tiles: CLEARING,
    spawns: {
      start: { tx: 10, ty: 9, facing: 'up' },
      fromForest: { tx: 10, ty: 1, facing: 'down' },
    },
    exits: [
      { tx: 9, ty: 0, w: 3, h: 1, to: 'forest', spawn: 'fromClearing', label: 'The Deepwood' },
    ],
    enemies: [],
  },
  forest: {
    id: 'forest',
    name: 'The Deepwood',
    ground: 'forest',
    altGround: 'dirt',
    tint: 0x121a2c,
    tintAlpha: 0.4,
    fog: 0.38,
    tiles: FOREST,
    spawns: {
      fromClearing: { tx: 13, ty: 19, facing: 'up' },
    },
    exits: [{ tx: 12, ty: 20, w: 3, h: 1, to: 'clearing', spawn: 'fromForest', label: 'The Hollow' }],
    enemies: [
      { type: 'husk', tx: 6, ty: 16 },
      { type: 'husk', tx: 18, ty: 15 },
      { type: 'stalker', tx: 12, ty: 13 },
      { type: 'husk', tx: 4, ty: 10 },
      { type: 'husk', tx: 19, ty: 9 },
      { type: 'stalker', tx: 8, ty: 7 },
      { type: 'stalker', tx: 17, ty: 5 },
      { type: 'husk', tx: 12, ty: 2 },
    ],
  },
}

export interface ParsedCell {
  tx: number
  ty: number
  char: string
  info: TileInfo
}

export interface ParsedArea {
  width: number
  height: number
  cells: ParsedCell[]
  /** Row-major solidity, for cheap lookups. */
  solid: boolean[]
}

/**
 * Turns an area's rows into cells, checking as it goes that the map is a
 * rectangle of known characters. Both mistakes are trivially easy to make when
 * hand-editing a grid and impossible to spot in the running game — a row one
 * character short just silently shifts everything after it.
 */
export function parseArea(area: AreaDef): ParsedArea {
  const height = area.tiles.length
  if (height === 0) throw new Error(`Area ${area.id} has no rows`)
  const width = area.tiles[0].length

  const cells: ParsedCell[] = []
  const solid: boolean[] = new Array(width * height).fill(true)

  area.tiles.forEach((row, ty) => {
    if (row.length !== width) {
      throw new Error(`Area ${area.id} row ${ty} is ${row.length} wide, expected ${width}`)
    }
    for (let tx = 0; tx < width; tx++) {
      const char = row[tx]
      const info = tileInfo(char)
      cells.push({ tx, ty, char, info })
      solid[ty * width + tx] = info.solid
    }
  })

  return { width, height, cells, solid }
}

/** The tile a world position falls in. */
export function tileAt(x: number, y: number, tileSize: number): { tx: number; ty: number } {
  return { tx: Math.floor(x / tileSize), ty: Math.floor(y / tileSize) }
}

/** Centre of a tile, in world pixels. */
export function tileCenter(tx: number, ty: number, tileSize: number): { x: number; y: number } {
  return { x: (tx + 0.5) * tileSize, y: (ty + 0.5) * tileSize }
}

/** The exit covering a tile, if any. */
export function exitAt(area: AreaDef, tx: number, ty: number): AreaExit | null {
  for (const exit of area.exits) {
    if (tx >= exit.tx && tx < exit.tx + exit.w && ty >= exit.ty && ty < exit.ty + exit.h) return exit
  }
  return null
}

/** Looks up a spawn point, falling back to the area's first one. */
export function spawnPoint(area: AreaDef, name: string | undefined): AreaSpawn {
  if (name !== undefined) {
    const named = area.spawns[name]
    if (named) return named
  }
  const first = Object.values(area.spawns)[0]
  if (!first) throw new Error(`Area ${area.id} has no spawn points`)
  return first
}
