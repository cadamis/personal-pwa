/**
 * Save slots. This is the one part of the game that loads data it didn't write,
 * so the tests lean on the rejection cases: a slot that survives validation but
 * holds nonsense doesn't fail here, it fails several scenes later as a player
 * standing outside the map or a lookup against an area that doesn't exist.
 */
import { describe, expect, it } from 'vitest'
import {
  NAME_MAX,
  SLOT_COUNT,
  isFreshSlot,
  isValidName,
  newSlot,
  normalizeName,
  sanitizeSlot,
  sanitizeSlots,
  type SaveSlot,
} from '../game/save'
import { PLAYER_MAX_HEALTH } from '../game/constants'

const GOOD: SaveSlot = {
  name: 'ASH',
  humanoid: 'mmc',
  area: 'forest',
  x: 120,
  y: 240,
  health: 4,
  createdAt: 1000,
  updatedAt: 2000,
}

describe('normalizeName', () => {
  it('upper-cases', () => {
    expect(normalizeName('ash')).toBe('ASH')
  })

  it('drops anything not on the letter grid', () => {
    expect(normalizeName('Ré<script>ll')).toBe('RSCRIPTLL')
  })

  it('collapses runs of spaces and trims the ends', () => {
    expect(normalizeName('  ash   grey  ')).toBe('ASH GREY')
  })

  it('caps the length', () => {
    expect(normalizeName('ABCDEFGHIJKLMNOP')).toHaveLength(NAME_MAX)
  })

  it('keeps the punctuation the grid offers', () => {
    expect(normalizeName("o'ryn-3")).toBe("O'RYN-3")
  })

  it('reduces a name of only junk to nothing', () => {
    expect(normalizeName('***')).toBe('')
    expect(isValidName('***')).toBe(false)
    expect(isValidName('   ')).toBe(false)
    expect(isValidName('a')).toBe(true)
  })
})

describe('sanitizeSlot', () => {
  it('passes a good slot through', () => {
    expect(sanitizeSlot({ ...GOOD })).toEqual(GOOD)
  })

  it('rejects things that are not slots at all', () => {
    for (const raw of [null, undefined, 7, 'ASH', []]) {
      expect(sanitizeSlot(raw), String(raw)).toBeNull()
    }
  })

  it('rejects a slot with no usable name', () => {
    expect(sanitizeSlot({ ...GOOD, name: '' })).toBeNull()
    expect(sanitizeSlot({ ...GOOD, name: '???' })).toBeNull()
    expect(sanitizeSlot({ ...GOOD, name: 42 })).toBeNull()
  })

  it('rejects a form that no longer exists', () => {
    expect(sanitizeSlot({ ...GOOD, humanoid: 'wolf' })).toBeNull()
    expect(sanitizeSlot({ ...GOOD, humanoid: 'dragon' })).toBeNull()
  })

  it('carries a renamed form id forward instead of dropping the character', () => {
    // The humanoids were once named after the characters themselves. A save
    // written then must still load, or the rename quietly eats the slot.
    expect(sanitizeSlot({ ...GOOD, humanoid: 'human_m' })?.humanoid).toBe('mmc')
    expect(sanitizeSlot({ ...GOOD, humanoid: 'human_f' })?.humanoid).toBe('fmc')
    expect(sanitizeSlot({ ...GOOD, humanoid: 'human_m' })?.name).toBe('ASH')
  })

  it('rejects an area that no longer exists', () => {
    // The failure this prevents is a lookup into AREAS returning undefined,
    // several scenes away from anything that mentions saving.
    expect(sanitizeSlot({ ...GOOD, area: 'atlantis' })).toBeNull()
  })

  it('forgets an unusable position rather than throwing the character away', () => {
    // Losing a whole character to one corrupt coordinate would be worse than
    // putting them back at the campfire, so this degrades to "not yet placed".
    for (const bad of [Number.NaN, Infinity, '12', null, undefined]) {
      for (const axis of ['x', 'y'] as const) {
        const slot = sanitizeSlot({ ...GOOD, [axis]: bad })
        expect(slot, `${axis}=${String(bad)}`).not.toBeNull()
        expect(slot?.name).toBe('ASH')
        expect(slot?.x).toBeNull()
        expect(slot?.y).toBeNull()
        expect(isFreshSlot(slot as SaveSlot)).toBe(true)
      }
    }
  })

  it('keeps a position only when both axes are real', () => {
    const slot = sanitizeSlot({ ...GOOD })
    expect(slot?.x).toBe(120)
    expect(slot?.y).toBe(240)
  })

  it('normalises the name it stores', () => {
    expect(sanitizeSlot({ ...GOOD, name: '  ash  ' })?.name).toBe('ASH')
  })

  it('clamps health into a survivable range', () => {
    expect(sanitizeSlot({ ...GOOD, health: 99 })?.health).toBe(PLAYER_MAX_HEALTH)
    // Zero would load a corpse that dies before the player touches anything.
    expect(sanitizeSlot({ ...GOOD, health: 0 })?.health).toBe(1)
    expect(sanitizeSlot({ ...GOOD, health: -5 })?.health).toBe(1)
    expect(sanitizeSlot({ ...GOOD, health: 2.6 })?.health).toBe(3)
  })

  it('fills in missing health and timestamps rather than failing', () => {
    const slot = sanitizeSlot({ name: 'BRIAR', humanoid: 'fmc', area: 'clearing', x: 1, y: 2 })
    expect(slot).not.toBeNull()
    expect(slot?.health).toBe(PLAYER_MAX_HEALTH)
    expect(slot?.createdAt).toBe(0)
    expect(slot?.updatedAt).toBe(0)
  })
})

describe('sanitizeSlots', () => {
  it('always returns exactly the number of slots the screen draws', () => {
    for (const raw of [null, [], [GOOD], 'nope', [GOOD, GOOD, GOOD, GOOD, GOOD]]) {
      expect(sanitizeSlots(raw), String(raw)).toHaveLength(SLOT_COUNT)
    }
  })

  it('keeps good slots and nulls out bad ones, in place', () => {
    const slots = sanitizeSlots([{ ...GOOD }, { junk: true }, { ...GOOD, name: 'BRIAR' }])
    expect(slots[0]?.name).toBe('ASH')
    expect(slots[1]).toBeNull()
    expect(slots[2]?.name).toBe('BRIAR')
  })

  it('starts empty when there is nothing stored', () => {
    expect(sanitizeSlots(null)).toEqual([null, null, null])
  })
})

describe('newSlot', () => {
  it('starts at full health with the chosen form and a clean name', () => {
    const slot = newSlot('  ash ', 'mmc', 5)
    expect(slot.name).toBe('ASH')
    expect(slot.humanoid).toBe('mmc')
    expect(slot.health).toBe(PLAYER_MAX_HEALTH)
    expect(slot.createdAt).toBe(5)
  })

  it('is fresh, so the file select sends it to the intro', () => {
    expect(isFreshSlot(newSlot('ASH', 'mmc', 0))).toBe(true)
  })

  it('stops being fresh once it has been played and saved', () => {
    expect(isFreshSlot(GOOD)).toBe(false)
  })

  it('survives a round trip through validation', () => {
    // A fresh slot has a deliberately non-numeric position, which the validator
    // would otherwise be entirely right to throw out.
    const fresh = newSlot('ASH', 'mmc', 1)
    const loaded = sanitizeSlot(JSON.parse(JSON.stringify(fresh)))
    expect(loaded).not.toBeNull()
    expect(isFreshSlot(loaded as SaveSlot)).toBe(true)
  })
})
