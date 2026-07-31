import { describe, it, expect } from 'vitest'
import { createCustomer, findFreeTable, getSpawnInterval, pickOrder } from '../game/customers.js'
import { CUSTOMERS, GAME_CONFIG, TABLE_POSITIONS, MENU_CATEGORIES } from '../game/constants.js'

// ─── createCustomer ───────────────────────────────────────────────────────────

describe('createCustomer', () => {
  it('returns an object with required fields', () => {
    const c = createCustomer(480)
    expect(c).toHaveProperty('id')
    expect(c).toHaveProperty('name')
    expect(c).toHaveProperty('animal')
    expect(c).toHaveProperty('color')
    expect(c).toHaveProperty('state', 'entering')
    expect(c).toHaveProperty('mood', 'neutral')
    expect(c).toHaveProperty('patience')
    expect(c).toHaveProperty('patienceRemaining')
    expect(c).toHaveProperty('preferredCategory')
    expect(c).toHaveProperty('budget')
    expect(c).toHaveProperty('order', null)
    expect(c).toHaveProperty('tableId', null)
    expect(c).toHaveProperty('x')
    expect(c).toHaveProperty('y')
  })

  it('animal is always a known animal type', () => {
    const knownAnimals = CUSTOMERS.map(c => c.animal)
    for (let i = 0; i < 20; i++) {
      const c = createCustomer(480 + i * 30)
      expect(knownAnimals).toContain(c.animal)
    }
  })

  it('patienceRemaining equals patience on creation', () => {
    const c = createCustomer(540)
    expect(c.patienceRemaining).toBe(c.patience)
  })

  it('patience is within configured bounds', () => {
    for (let i = 0; i < 10; i++) {
      const c = createCustomer(600)
      expect(c.patience).toBeGreaterThanOrEqual(GAME_CONFIG.CUSTOMER_PATIENCE_MIN)
      expect(c.patience).toBeLessThanOrEqual(GAME_CONFIG.CUSTOMER_PATIENCE_MAX)
    }
  })

  it('generates unique ids for sequential customers', () => {
    const ids = new Set()
    for (let i = 0; i < 10; i++) {
      ids.add(createCustomer(480).id)
    }
    expect(ids.size).toBe(10)
  })

  it('budget is "low", "mid", or "high"', () => {
    const valid = new Set(['low', 'mid', 'high'])
    for (let i = 0; i < 20; i++) {
      expect(valid.has(createCustomer(480).budget)).toBe(true)
    }
  })

  it('x starts near the door position', () => {
    const c = createCustomer(480)
    expect(c.x).toBeGreaterThan(380)
    expect(c.x).toBeLessThan(420)
  })
})

// ─── findFreeTable ────────────────────────────────────────────────────────────

describe('findFreeTable', () => {
  it('returns a table when none are occupied', () => {
    const table = findFreeTable({})
    expect(table).not.toBeNull()
    expect(table).toHaveProperty('id')
    expect(table).toHaveProperty('x')
    expect(table).toHaveProperty('y')
  })

  it('returns null when all tables are occupied', () => {
    const full = {}
    TABLE_POSITIONS.forEach(t => { full[t.id] = 'someone' })
    expect(findFreeTable(full)).toBeNull()
  })

  it('never returns an occupied table', () => {
    const occupancy = { 0: 'a', 1: 'b', 2: 'c' }
    for (let i = 0; i < 20; i++) {
      const t = findFreeTable(occupancy)
      if (t) expect([0, 1, 2]).not.toContain(t.id)
    }
  })
})

// ─── getSpawnInterval ─────────────────────────────────────────────────────────

describe('getSpawnInterval', () => {
  it('returns a positive finite number at various times', () => {
    const times = [480, 540, 720, 840, 960, 1080, 1140]
    times.forEach(t => {
      const interval = getSpawnInterval(t)
      expect(interval).toBeGreaterThan(0)
      expect(Number.isFinite(interval)).toBe(true)
    })
  })

  it('midday spawn interval is shorter than evening (rush vs slow)', () => {
    const samples = 20
    let middaySum = 0, eveningSum = 0
    for (let i = 0; i < samples; i++) {
      middaySum += getSpawnInterval(780)   // 1 PM (lunch rush)
      eveningSum += getSpawnInterval(1080) // 6 PM (slow)
    }
    // Lunch rush should have shorter avg interval
    expect(middaySum / samples).toBeLessThan(eveningSum / samples)
  })
})

// ─── pickOrder ────────────────────────────────────────────────────────────────

const SAMPLE_MENU = [
  { id: 'blackTeaCup', name: 'Black Tea', emoji: '☕', category: MENU_CATEGORIES.HOT_TEA,   price: 2.50, stocked: 5 },
  { id: 'icedTea',     name: 'Iced Tea',  emoji: '🧋', category: MENU_CATEGORIES.ICED_TEA,  price: 3.25, stocked: 5 },
  { id: 'scone',       name: 'Scone',     emoji: '🫓', category: MENU_CATEGORIES.PASTRY,    price: 3.50, stocked: 5 },
  { id: 'chaiLatte',   name: 'Chai',      emoji: '☕', category: MENU_CATEGORIES.SPECIALTY, price: 4.00, stocked: 5 },
  { id: 'cookie',      name: 'Cookie',    emoji: '🍪', category: MENU_CATEGORIES.SWEET,     price: 2.25, stocked: 5 },
]

describe('pickOrder', () => {
  it('returns null when no items are stocked', () => {
    const emptyMenu = SAMPLE_MENU.map(m => ({ ...m, stocked: 0 }))
    expect(pickOrder(emptyMenu, MENU_CATEGORIES.HOT_TEA, 'mid', 540)).toBeNull()
  })

  it('returns an item with id, name, emoji when items are stocked', () => {
    const result = pickOrder(SAMPLE_MENU, MENU_CATEGORIES.HOT_TEA, 'mid', 540)
    expect(result).not.toBeNull()
    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('name')
    expect(result).toHaveProperty('emoji')
  })

  it('never picks an out-of-stock item', () => {
    const menu = SAMPLE_MENU.map((m, i) => ({ ...m, stocked: i === 0 ? 0 : 5 }))
    for (let i = 0; i < 30; i++) {
      const result = pickOrder(menu, MENU_CATEGORIES.HOT_TEA, 'mid', 540)
      if (result) expect(result.id).not.toBe('blackTeaCup')
    }
  })

  it('respects budget – low-budget customer avoids expensive items', () => {
    const expensiveMenu = [
      { id: 'cheap', name: 'Cheap Tea', emoji: '☕', category: MENU_CATEGORIES.HOT_TEA, price: 1.50, stocked: 5 },
      { id: 'pricey', name: 'Fancy', emoji: '🫖', category: MENU_CATEGORIES.SPECIALTY, price: 10.00, stocked: 5 },
    ]
    let pickedExpensive = 0
    for (let i = 0; i < 30; i++) {
      const r = pickOrder(expensiveMenu, MENU_CATEGORIES.HOT_TEA, 'low', 540)
      if (r?.id === 'pricey') pickedExpensive++
    }
    // Low-budget customers should rarely (or never) pick the $10 item
    expect(pickedExpensive).toBeLessThan(5)
  })

  it('works across all time periods without throwing', () => {
    const timePeriods = [480, 540, 660, 780, 900, 1020, 1140]
    timePeriods.forEach(t => {
      expect(() => pickOrder(SAMPLE_MENU, MENU_CATEGORIES.HOT_TEA, 'mid', t)).not.toThrow()
    })
  })
})
