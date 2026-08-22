/**
 * The sheet layout is the contract between the artwork and the animation code.
 * A row number that walks off the end of the grid doesn't throw — it just shows
 * the wrong frame, or a blank one, halfway through a swing.
 */
import { describe, expect, it } from 'vitest'
import { CLIPS, FACINGS, SHEETS, animKey, clipFrames, clipSpec } from '../art/sheets'
import { FORM_IDS } from '../game/forms'

describe('sheet layout', () => {
  it('has a spec for every form', () => {
    for (const form of FORM_IDS) {
      expect(SHEETS[form]).toBeDefined()
      expect(SHEETS[form].key).toBe(form)
    }
  })

  it('keeps every clip inside its sheet', () => {
    for (const spec of Object.values(SHEETS)) {
      const total = spec.cols * spec.rows
      for (const clip of CLIPS) {
        for (const facing of FACINGS) {
          const frames = clipFrames(spec, clip, facing)
          expect(frames).toHaveLength(clipSpec(spec, clip).frames)
          for (const frame of frames) {
            expect(frame).toBeGreaterThanOrEqual(0)
            expect(frame).toBeLessThan(total)
          }
        }
      }
    }
  })

  it('never lets a clip run off the end of its row', () => {
    for (const spec of Object.values(SHEETS)) {
      for (const clip of CLIPS) {
        expect(clipSpec(spec, clip).frames).toBeLessThanOrEqual(spec.cols)
        for (const facing of FACINGS) {
          const frames = clipFrames(spec, clip, facing)
          const rows = new Set(frames.map((frame) => Math.floor(frame / spec.cols)))
          expect(rows.size).toBe(1)
        }
      }
    }
  })

  it('gives every clip and facing a distinct set of frames', () => {
    for (const spec of Object.values(SHEETS)) {
      const seen = new Set<number>()
      for (const clip of CLIPS) {
        for (const facing of FACINGS) {
          for (const frame of clipFrames(spec, clip, facing)) {
            expect(seen.has(frame)).toBe(false)
            seen.add(frame)
          }
        }
      }
    }
  })

  it('builds unique animation keys', () => {
    const keys = new Set<string>()
    for (const form of FORM_IDS) {
      for (const clip of CLIPS) {
        for (const facing of FACINGS) keys.add(animKey(form, clip, facing))
      }
    }
    expect(keys.size).toBe(FORM_IDS.length * CLIPS.length * FACINGS.length)
  })
})
