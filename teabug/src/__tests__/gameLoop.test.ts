import { describe, it, expect, beforeEach, vi } from 'vitest'
import { tick } from '../game/gameLoop'
import type { TickState, TickStore } from '../game/gameLoop'
import type { OrderableItem } from '../game/customers'
import type { AnimalKind, Customer, TableOccupancy } from '../game/constants'
import { GAME_CONFIG, GAME_SPEED, TABLE_POSITIONS, CUSTOMERS } from '../game/constants'
import { MENU_CATEGORIES } from '../game/constants'

// ─── Minimal store mock ───────────────────────────────────────────────────────

const DEFAULT_MENU: TestMenuItem[] = [
  { id: 'blackTeaCup', name: 'Black Tea', emoji: '☕', category: MENU_CATEGORIES.HOT_TEA, price: 2.50, stocked: 8 },
  { id: 'scone',       name: 'Scone',     emoji: '🫓', category: MENU_CATEGORIES.PASTRY,   price: 3.50, stocked: 6 },
]

// `tick` is typed against the minimal slice of state it needs, so these
// fixtures can stay lightweight — no full MenuItem or zustand store required.
type TestMenuItem = OrderableItem
type TestState = TickState<TestMenuItem> & { dayEnded: boolean }

function makeStore(overrides: Partial<TestState> = {}) {
  let state: TestState = {
    dayRunning: true,
    dayEnded: false,
    gameTime: GAME_CONFIG.START_HOUR * 60, // 480
    money: 200,
    dailyRevenue: 0,
    transactions: [],
    customers: [],
    tableOccupancy: {},
    menuItems: DEFAULT_MENU.map(m => ({ ...m })),
    lastSpawnTime: GAME_CONFIG.START_HOUR * 60,
    nextSpawnIn: 5, // spawn after 5 game-minutes
    endDay: () => {},
    ...overrides,
  }

  const endDay = vi.fn(() => {
    state = { ...state, dayRunning: false, dayEnded: true, customers: [], tableOccupancy: {} }
  })

  const store: TickStore<TestMenuItem> = {
    getState: () => ({ ...state, endDay }),
    setState: vi.fn((partial: Partial<TestState>) => {
      state = { ...state, ...partial }
    }),
  }

  return { store, getState: () => state, endDay }
}

// Helper: advance time by N game-minutes in small steps
function advanceGameMinutes(
  store: TickStore<TestMenuItem>,
  gameMinutes: number,
  stepMs = 16,
) {
  const msPerGameMin = 1 / GAME_SPEED
  const totalMs = gameMinutes * msPerGameMin
  let elapsed = 0
  while (elapsed < totalMs) {
    const delta = Math.min(stepMs, totalMs - elapsed)
    tick(delta, store)
    elapsed += delta
  }
}

// ─── Basic time advancement ───────────────────────────────────────────────────

describe('tick – time advancement', () => {
  it('advances gameTime when day is running', () => {
    const { store, getState } = makeStore()
    tick(16, store)
    expect(store.setState).toHaveBeenCalled()
    const call = vi.mocked(store.setState).mock.calls[vi.mocked(store.setState).mock.calls.length - 1][0]
    expect(call.gameTime).toBeGreaterThan(GAME_CONFIG.START_HOUR * 60)
  })

  it('does nothing when day is not running', () => {
    const { store } = makeStore({ dayRunning: false })
    tick(16, store)
    expect(store.setState).not.toHaveBeenCalled()
  })

  it('calls endDay when gameTime reaches END_HOUR * 60', () => {
    const endMin = GAME_CONFIG.END_HOUR * 60
    const { store, getState } = makeStore({ gameTime: endMin - 0.01 })
    tick(100, store)  // large delta to push past end
    expect(getState().dayRunning).toBe(false)
    expect(getState().dayEnded).toBe(true)
  })

  it('does not advance time past END_HOUR', () => {
    const endMin = GAME_CONFIG.END_HOUR * 60
    const { store } = makeStore({ gameTime: endMin - 0.005 })
    tick(100, store)
    const finalTime = store.getState().gameTime
    expect(finalTime).toBeLessThanOrEqual(endMin + 1) // endDay resets or stops
  })
})

// ─── Customer spawning ────────────────────────────────────────────────────────

describe('tick – customer spawning', () => {
  it('spawns a customer after nextSpawnIn game-minutes', () => {
    const { store, getState } = makeStore({ nextSpawnIn: 5 })
    // Advance 6 game-minutes to trigger spawn
    advanceGameMinutes(store, 6)
    const customers = getState().customers
    expect(customers.length).toBeGreaterThan(0)
  })

  it('spawned customer has required fields', () => {
    const { store, getState } = makeStore({ nextSpawnIn: 1 })
    advanceGameMinutes(store, 2)
    const customers = getState().customers
    expect(customers.length).toBeGreaterThan(0)
    const c = customers[0]
    expect(c).toHaveProperty('id')
    expect(c).toHaveProperty('name')
    expect(c).toHaveProperty('animal')
    expect(c).toHaveProperty('state')
    expect(c).toHaveProperty('x')
    expect(c).toHaveProperty('y')
    expect(c).toHaveProperty('tableId')
  })

  it('spawned customer is immediately seated (or has already picked an order)', () => {
    const { store, getState } = makeStore({ nextSpawnIn: 1 })
    advanceGameMinutes(store, 2)
    const c = getState().customers[0]
    // The customer spawns seated, then immediately picks an order in the same tick
    // so by the time we read state they may already be 'waiting'
    expect(['seated', 'waiting']).toContain(c.state)
    expect(c.tableId).not.toBeNull()
  })

  it('spawned customer animal is a known type', () => {
    const knownAnimals = CUSTOMERS.map(c => c.animal)
    const { store, getState } = makeStore({ nextSpawnIn: 1 })
    advanceGameMinutes(store, 2)
    const c = getState().customers[0]
    expect(knownAnimals).toContain(c.animal)
  })

  it('does not exceed MAX_CUSTOMERS', () => {
    const { store, getState } = makeStore({ nextSpawnIn: 1 })
    // Run for a very long game time
    advanceGameMinutes(store, 200)
    expect(getState().customers.length).toBeLessThanOrEqual(GAME_CONFIG.MAX_CUSTOMERS)
  })

  it('does not spawn if no free tables', () => {
    const fullOccupancy: TableOccupancy = {}
    TABLE_POSITIONS.forEach(t => { fullOccupancy[t.id] = 'cust_dummy' })
    const { store, getState } = makeStore({ nextSpawnIn: 1, tableOccupancy: fullOccupancy })
    advanceGameMinutes(store, 3)
    expect(getState().customers.length).toBe(0)
  })
})

// ─── Customer state machine ───────────────────────────────────────────────────

function makeSeatedCustomer(animal: AnimalKind = 'frog'): Customer {
  const patience = GAME_CONFIG.CUSTOMER_PATIENCE_MAX
  return {
    id: 'test_cust_1',
    name: 'Tester',
    animal,
    color: '#888',
    preferredCategory: MENU_CATEGORIES.HOT_TEA,
    budget: 'mid',
    mood: 'neutral',
    state: 'seated',
    x: TABLE_POSITIONS[0].x,
    y: TABLE_POSITIONS[0].y,
    targetX: TABLE_POSITIONS[0].x,
    targetY: TABLE_POSITIONS[0].y,
    tableId: 0,
    order: null,
    patience,
    patienceRemaining: patience,
    serviceTimer: GAME_CONFIG.SERVICE_TIME,
    lingerTimer: 8,
  }
}

// Fixtures are fixed, so a missing item means the test itself is wrong —
// fail loudly rather than propagating undefined into the assertion.
function menuItem(state: TestState, id: string): TestMenuItem {
  const item = state.menuItems.find(m => m.id === id)
  if (!item) throw new Error(`test fixture has no menu item "${id}"`)
  return item
}

describe('tick – customer state transitions', () => {
  it('seated customer picks an order and becomes "waiting"', () => {
    const customer = makeSeatedCustomer('frog')
    const { store, getState } = makeStore({
      customers: [customer],
      tableOccupancy: { 0: customer.id },
      nextSpawnIn: 9999,
    })
    tick(16, store)
    const updated = getState().customers[0]
    expect(updated.state).toBe('waiting')
    expect(updated.order).not.toBeNull()
  })

  it('waiting customer gets served after SERVICE_TIME game-minutes', () => {
    const customer: Customer = {
      ...makeSeatedCustomer('ladybug'),
      state: 'waiting',
      order: { itemId: 'blackTeaCup', itemName: 'Black Tea', itemEmoji: '☕' },
      serviceTimer: GAME_CONFIG.SERVICE_TIME,
    }
    const { store, getState } = makeStore({
      customers: [customer],
      tableOccupancy: { 0: customer.id },
      nextSpawnIn: 9999,
    })
    // Advance SERVICE_TIME + a bit
    advanceGameMinutes(store, GAME_CONFIG.SERVICE_TIME + 1)
    const updated = getState().customers.find(c => c.id === customer.id)
    if (updated) {
      expect(['served', 'leaving']).toContain(updated.state)
    }
    // Also check revenue increased
    expect(getState().money).toBeGreaterThan(200)
  })

  it('serving a customer decrements menu stock', () => {
    const customer: Customer = {
      ...makeSeatedCustomer('ant'),
      state: 'waiting',
      order: { itemId: 'blackTeaCup', itemName: 'Black Tea', itemEmoji: '☕' },
      serviceTimer: GAME_CONFIG.SERVICE_TIME,
    }
    const { store, getState } = makeStore({
      customers: [customer],
      tableOccupancy: { 0: customer.id },
      nextSpawnIn: 9999,
    })
    const initialStock = menuItem(getState(), 'blackTeaCup').stocked
    advanceGameMinutes(store, GAME_CONFIG.SERVICE_TIME + 1)
    const finalStock = menuItem(getState(), 'blackTeaCup').stocked
    expect(finalStock).toBe(initialStock - 1)
  })

  it('customer with no stocked items leaves unhappy', () => {
    const emptyMenu = DEFAULT_MENU.map(m => ({ ...m, stocked: 0 }))
    const customer = makeSeatedCustomer('butterfly')
    const { store, getState } = makeStore({
      customers: [customer],
      tableOccupancy: { 0: customer.id },
      menuItems: emptyMenu,
      nextSpawnIn: 9999,
    })
    tick(16, store)
    const updated = getState().customers.find(c => c.id === customer.id)
    if (updated) {
      expect(updated.state).toBe('leaving')
      expect(updated.mood).toBe('unhappy')
    }
  })

  it('impatient customer eventually leaves', () => {
    const customer: Customer = {
      ...makeSeatedCustomer('spider'),
      state: 'waiting',
      order: { itemId: 'blackTeaCup', itemName: 'Black Tea', itemEmoji: '☕' },
      serviceTimer: 9999,         // never served
      patience: 5,
      patienceRemaining: 5,
    }
    const { store, getState } = makeStore({
      customers: [customer],
      tableOccupancy: { 0: customer.id },
      nextSpawnIn: 9999,
    })
    advanceGameMinutes(store, 10) // past patience
    const updated = getState().customers.find(c => c.id === customer.id)
    if (updated) {
      expect(['leaving', 'unhappy']).toContain(updated.state === 'leaving' ? 'leaving' : updated.mood)
    }
  })

  it('leaving customer is eventually removed from the list', () => {
    const customer: Customer = {
      ...makeSeatedCustomer('snake'),
      state: 'leaving',
      x: 400,
      y: 530, // near exit
    }
    const { store, getState } = makeStore({
      customers: [customer],
      tableOccupancy: { 0: customer.id },
      nextSpawnIn: 9999,
    })
    // Advance a few real seconds (walking to door)
    for (let i = 0; i < 200; i++) tick(16, store)
    const remaining = getState().customers.filter(c => c.id === customer.id)
    expect(remaining.length).toBe(0)
  })
})

// ─── Single setState call per tick ───────────────────────────────────────────

describe('tick – calls setState exactly once per frame', () => {
  it('calls setState once when day is running', () => {
    const { store } = makeStore()
    tick(16, store)
    expect(store.setState).toHaveBeenCalledTimes(1)
  })

  it('calls setState once even with multiple customers', () => {
    const customers: Customer[] = [0, 1, 2].map(i => ({
      ...makeSeatedCustomer('frog'),
      id: `cust_${i}`,
      tableId: i,
      state: 'waiting',
      order: { itemId: 'blackTeaCup', itemName: 'Black Tea', itemEmoji: '☕' },
      serviceTimer: 3,
    }))
    const tableOccupancy = { 0: 'cust_0', 1: 'cust_1', 2: 'cust_2' }
    const { store } = makeStore({ customers, tableOccupancy, nextSpawnIn: 9999 })
    tick(16, store)
    expect(store.setState).toHaveBeenCalledTimes(1)
  })
})

// ─── State written by setState is well-formed ─────────────────────────────────

describe('tick – state shape is valid after tick', () => {
  it('gameTime is a finite number after tick', () => {
    const { store } = makeStore()
    tick(16, store)
    const written = vi.mocked(store.setState).mock.calls[0][0]
    expect(Number.isFinite(written.gameTime)).toBe(true)
  })

  it('customers is always an array', () => {
    const { store } = makeStore()
    tick(16, store)
    const written = vi.mocked(store.setState).mock.calls[0][0]
    expect(Array.isArray(written.customers)).toBe(true)
  })

  it('money is always a finite number', () => {
    const { store } = makeStore()
    tick(16, store)
    const written = vi.mocked(store.setState).mock.calls[0][0]
    expect(Number.isFinite(written.money)).toBe(true)
  })

  it('tableOccupancy is always a plain object', () => {
    const { store } = makeStore()
    tick(16, store)
    const written = vi.mocked(store.setState).mock.calls[0][0]
    expect(typeof written.tableOccupancy).toBe('object')
    expect(Array.isArray(written.tableOccupancy)).toBe(false)
  })
})
