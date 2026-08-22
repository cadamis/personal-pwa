/**
 * Maps are hand-edited ASCII, so the failure modes are typos: a row one
 * character short, an exit pointing at a spawn that doesn't exist, an enemy
 * standing inside a tree. None of those throw in the running game — they just
 * quietly produce a broken level.
 */
import { describe, expect, it } from 'vitest'
import { AREAS, AREA_IDS, exitAt, parseArea, spawnPoint, tileCenter } from '../world/areas'
import { ENEMY_STATS } from '../game/enemies'

describe('area maps', () => {
  it('parses every area as a rectangle of known tiles', () => {
    for (const id of AREA_IDS) {
      const parsed = parseArea(AREAS[id])
      expect(parsed.width).toBeGreaterThan(0)
      expect(parsed.height).toBeGreaterThan(0)
      expect(parsed.cells).toHaveLength(parsed.width * parsed.height)
    }
  })

  it('rejects a ragged map', () => {
    const ragged = { ...AREAS.clearing, tiles: ['....', '...'] }
    expect(() => parseArea(ragged)).toThrow(/row 1 is 3 wide/)
  })

  it('rejects an unknown tile character', () => {
    const bogus = { ...AREAS.clearing, tiles: ['..', '.X'] }
    expect(() => parseArea(bogus)).toThrow(/Unknown map character/)
  })

  it('puts every spawn point on walkable ground inside the map', () => {
    for (const id of AREA_IDS) {
      const area = AREAS[id]
      const parsed = parseArea(area)
      for (const [name, spawn] of Object.entries(area.spawns)) {
        expect(spawn.tx, `${id}.${name} x`).toBeGreaterThanOrEqual(0)
        expect(spawn.tx, `${id}.${name} x`).toBeLessThan(parsed.width)
        expect(spawn.ty, `${id}.${name} y`).toBeGreaterThanOrEqual(0)
        expect(spawn.ty, `${id}.${name} y`).toBeLessThan(parsed.height)
        expect(parsed.solid[spawn.ty * parsed.width + spawn.tx], `${id}.${name} is solid`).toBe(false)
      }
    }
  })

  it('lands every exit on a spawn point that exists in the target area', () => {
    for (const id of AREA_IDS) {
      for (const exit of AREAS[id].exits) {
        const target = AREAS[exit.to]
        expect(target, `${id} -> ${exit.to}`).toBeDefined()
        expect(target.spawns[exit.spawn], `${id} -> ${exit.to}.${exit.spawn}`).toBeDefined()
      }
    }
  })

  it('leaves every exit tile walkable, so it can be reached', () => {
    for (const id of AREA_IDS) {
      const area = AREAS[id]
      const parsed = parseArea(area)
      for (const exit of area.exits) {
        for (let ty = exit.ty; ty < exit.ty + exit.h; ty++) {
          for (let tx = exit.tx; tx < exit.tx + exit.w; tx++) {
            expect(parsed.solid[ty * parsed.width + tx], `${id} exit tile ${tx},${ty}`).toBe(false)
          }
        }
      }
    }
  })

  it('never spawns an enemy inside solid ground', () => {
    for (const id of AREA_IDS) {
      const area = AREAS[id]
      const parsed = parseArea(area)
      for (const enemy of area.enemies) {
        expect(ENEMY_STATS[enemy.type], `${id} enemy type`).toBeDefined()
        expect(
          parsed.solid[enemy.ty * parsed.width + enemy.tx],
          `${id} ${enemy.type} at ${enemy.tx},${enemy.ty}`,
        ).toBe(false)
      }
    }
  })

  it('finds exits by tile, and only inside their rect', () => {
    const clearing = AREAS.clearing
    const exit = clearing.exits[0]
    expect(exitAt(clearing, exit.tx, exit.ty)).toBe(exit)
    expect(exitAt(clearing, exit.tx + exit.w, exit.ty)).toBeNull()
    expect(exitAt(clearing, exit.tx, exit.ty + exit.h)).toBeNull()
  })

  it('falls back to the first spawn when the named one is missing', () => {
    expect(spawnPoint(AREAS.clearing, 'nope')).toBe(AREAS.clearing.spawns.start)
    expect(spawnPoint(AREAS.clearing, undefined)).toBe(AREAS.clearing.spawns.start)
  })

  it('centres tiles at the middle of their cell', () => {
    expect(tileCenter(0, 0, 48)).toEqual({ x: 24, y: 24 })
    expect(tileCenter(2, 3, 48)).toEqual({ x: 120, y: 168 })
  })

  it('gives the two starting areas a way back to each other', () => {
    const outbound = AREAS.clearing.exits.some((exit) => exit.to === 'forest')
    const inbound = AREAS.forest.exits.some((exit) => exit.to === 'clearing')
    expect(outbound && inbound).toBe(true)
  })
})
