import { describe, it, expect, vi } from 'vitest'
import { createMockCtx } from './mockCanvas'

// We import the internal drawing helpers indirectly by importing and calling render()
// To test individual animal functions we reach into renderer.js via the render() export.
// The renderer module only exports `render`, so we test through it by passing a single
// synthetic customer with each animal type.

import { render } from '../game/renderer'
import { CANVAS_W, CANVAS_H, MENU_CATEGORIES } from '../game/constants'
import { CUSTOMERS } from '../game/constants'
import type { AnimalKind, Customer } from '../game/constants'

// Build a minimal customer object at a stable position
function makeCustomer(animal: AnimalKind, overrides: Partial<Customer> = {}): Customer {
  return {
    id: `test_${animal}`,
    name: 'Tester',
    animal,
    color: '#888',
    preferredCategory: MENU_CATEGORIES.HOT_TEA,
    budget: 'mid',
    mood: 'neutral',
    state: 'waiting',
    x: 300,
    y: 250,
    targetX: 300,
    targetY: 250,
    order: { itemId: 'blackTeaCup', itemName: 'Black Tea', itemEmoji: '☕' },
    tableId: 0,
    patience: 20,
    patienceRemaining: 15,
    serviceTimer: 3,
    ...overrides,
  }
}

const BASE_RENDER_OPTS = {
  tableOccupancy: { 0: 'test' },
  gameTimeMinutes: 540, // 9 AM
  dayRunning: true,
  dayEnded: false,
}

describe('renderer – render() does not throw', () => {
  it('renders with no customers', () => {
    const ctx = createMockCtx()
    expect(() =>
      render(ctx, { ...BASE_RENDER_OPTS, customers: [] })
    ).not.toThrow()
  })

  it('renders the closed-shop overlay (not running)', () => {
    const ctx = createMockCtx()
    expect(() =>
      render(ctx, { ...BASE_RENDER_OPTS, customers: [], dayRunning: false, dayEnded: false })
    ).not.toThrow()
  })

  it('renders the day-ended overlay', () => {
    const ctx = createMockCtx()
    expect(() =>
      render(ctx, { ...BASE_RENDER_OPTS, customers: [], dayRunning: false, dayEnded: true })
    ).not.toThrow()
  })
})

describe('renderer – each animal sprite draws without throwing', () => {
  const animalTypes = CUSTOMERS.map(c => c.animal)

  animalTypes.forEach(animal => {
    it(`draws ${animal} in "waiting" state`, () => {
      const ctx = createMockCtx()
      expect(() =>
        render(ctx, { ...BASE_RENDER_OPTS, customers: [makeCustomer(animal)] })
      ).not.toThrow()
    })

    it(`draws ${animal} in "seated" state (no order)`, () => {
      const ctx = createMockCtx()
      expect(() =>
        render(ctx, {
          ...BASE_RENDER_OPTS,
          customers: [makeCustomer(animal, { state: 'seated', order: null })],
        })
      ).not.toThrow()
    })

    it(`draws ${animal} in "leaving" state`, () => {
      const ctx = createMockCtx()
      expect(() =>
        render(ctx, {
          ...BASE_RENDER_OPTS,
          customers: [makeCustomer(animal, { state: 'leaving', mood: 'unhappy' })],
        })
      ).not.toThrow()
    })

    it(`draws ${animal} in "served" (happy) state`, () => {
      const ctx = createMockCtx()
      expect(() =>
        render(ctx, {
          ...BASE_RENDER_OPTS,
          customers: [makeCustomer(animal, { state: 'served', mood: 'happy' })],
        })
      ).not.toThrow()
    })

    it(`draws ${animal} with impatient mood`, () => {
      const ctx = createMockCtx()
      expect(() =>
        render(ctx, {
          ...BASE_RENDER_OPTS,
          customers: [makeCustomer(animal, { mood: 'impatient' })],
        })
      ).not.toThrow()
    })
  })

  it('draws a customer with unknown animal type (falls back to frog)', () => {
    const ctx = createMockCtx()
    expect(() =>
      render(ctx, {
        ...BASE_RENDER_OPTS,
        // Deliberately off-type: proves the sprite switch's default branch holds.
        customers: [{ ...makeCustomer('frog'), animal: 'unknownAnimal' as AnimalKind }],
      })
    ).not.toThrow()
  })

  it('draws a customer with undefined animal (falls back to frog)', () => {
    const ctx = createMockCtx()
    expect(() =>
      render(ctx, {
        ...BASE_RENDER_OPTS,
        // Deliberately off-type: proves `animal || 'frog'` still guards.
        customers: [{ ...makeCustomer('frog'), animal: undefined as unknown as AnimalKind }],
      })
    ).not.toThrow()
  })

  it('renders multiple customers at the same time', () => {
    const ctx = createMockCtx()
    const allCustomers = CUSTOMERS.map(c =>
      makeCustomer(c.animal, { id: `test_${c.animal}`, name: c.name, x: 200 + Math.random() * 400, y: 150 + Math.random() * 300 })
    )
    expect(() =>
      render(ctx, { ...BASE_RENDER_OPTS, customers: allCustomers })
    ).not.toThrow()
  })
})

describe('renderer – canvas calls sanity', () => {
  it('calls clearRect once per render', () => {
    const ctx = createMockCtx()
    render(ctx, { ...BASE_RENDER_OPTS, customers: [] })
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, CANVAS_W, CANVAS_H)
    expect(ctx.clearRect).toHaveBeenCalledTimes(1)
  })

  it('calls beginPath at least once for each customer', () => {
    const ctx = createMockCtx()
    const before = 0
    render(ctx, { ...BASE_RENDER_OPTS, customers: [makeCustomer('frog')] })
    expect(vi.mocked(ctx.beginPath).mock.calls.length).toBeGreaterThan(before)
  })

  it('draws speech bubble (calls fillText) for waiting customer', () => {
    const ctx = createMockCtx()
    render(ctx, { ...BASE_RENDER_OPTS, customers: [makeCustomer('ant', { state: 'waiting' })] })
    // fillText is called for speech bubble + name tag
    expect(vi.mocked(ctx.fillText).mock.calls.length).toBeGreaterThan(0)
  })
})
