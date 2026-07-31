import { create } from 'zustand'
import {
  DEFAULT_INGREDIENTS,
  DEFAULT_MENU_ITEMS,
  GAME_CONFIG,
  ingredientEntries,
} from '../game/constants'
import type {
  Customer,
  IngredientId,
  IngredientStock,
  MenuItem,
  TableOccupancy,
  Transaction,
} from '../game/constants'

const SAVE_KEY = 'teabug-save'

export interface GameState {
  money: number
  dayCount: number
  /** Minutes since midnight. */
  gameTime: number
  dayRunning: boolean
  dayEnded: boolean
  ingredients: IngredientStock
  menuItems: MenuItem[]
  /** Customers currently on the canvas. Transient — never persisted. */
  customers: Customer[]
  dailyRevenue: number
  totalRevenue: number
  transactions: Transaction[]
  lastSpawnTime: number
  /** Game-minutes until the next customer arrives. */
  nextSpawnIn: number
  tableOccupancy: TableOccupancy
}

export type PrepResult =
  | { success: true }
  | { success: false; reason: string }

export interface GameActions {
  startDay: () => void
  pauseDay: () => void
  endDay: () => void
  newDay: () => void
  tickTime: (deltaGameMinutes: number) => void
  addCustomer: (customer: Customer) => void
  updateCustomer: (id: string, updates: Partial<Customer>) => void
  removeCustomer: (id: string) => void
  seatCustomer: (customerId: string, tableId: number) => void
  serveCustomer: (customerId: string) => void
  setNextSpawnIn: (minutes: number) => void
  addIngredient: (ingredientId: IngredientId, qty: number) => void
  purchaseIngredients: (ingredientId: IngredientId, qty: number, totalCost: number) => void
  setMenuPrice: (itemId: string, price: number) => void
  prepBatch: (itemId: string) => PrepResult
  resetSave: () => void
}

export type GameStore = GameState & GameActions

function buildDefaultMenu(): MenuItem[] {
  return DEFAULT_MENU_ITEMS.map(item => ({
    ...item,
    price: item.defaultPrice,
  }))
}

function getDefaultState(): GameState {
  return {
    money: GAME_CONFIG.START_MONEY,
    dayCount: 1,
    gameTime: GAME_CONFIG.START_HOUR * 60,
    dayRunning: false,
    dayEnded: false,
    ingredients: { ...DEFAULT_INGREDIENTS },
    menuItems: buildDefaultMenu(),
    customers: [],
    dailyRevenue: 0,
    totalRevenue: 0,
    transactions: [],
    lastSpawnTime: GAME_CONFIG.START_HOUR * 60,
    nextSpawnIn: 5,
    tableOccupancy: {},
  }
}

// A save is untyped JSON that may predate the current shape, so it's treated as
// a partial overlay on the defaults. This is the only place that assumption is
// made; everything downstream works with a complete GameState.
function loadSave(): Partial<GameState> | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Partial<GameState>
  } catch {
    return null
  }
}

function saveToDisk(state: GameState): void {
  // Live customers and seating are transient, so they're reset rather than saved.
  const { customers: _customers, ...rest } = state
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...rest, customers: [], tableOccupancy: {} }))
  } catch { /* storage full */ }
}

const saved = loadSave()
const initial: GameState = saved ? { ...getDefaultState(), ...saved } : getDefaultState()

export const useGameStore = create<GameStore>()((set, get) => ({
  ...initial,

  // ─── Time & Day ──────────────────────────────────────────────────────────────

  startDay: () => {
    set({ dayRunning: true, dayEnded: false })
    saveToDisk(get())
  },

  pauseDay: () => {
    set({ dayRunning: false })
    saveToDisk(get())
  },

  endDay: () => {
    const state = get()
    set({
      dayRunning: false,
      dayEnded: true,
      totalRevenue: state.totalRevenue + state.dailyRevenue,
      customers: [],
      tableOccupancy: {},
    })
    saveToDisk(get())
  },

  newDay: () => {
    const state = get()
    const next: GameState = {
      ...getDefaultState(),
      // carry over money, inventory, menu settings, revenue totals
      money: state.money,
      dayCount: state.dayCount + 1,
      ingredients: { ...state.ingredients },
      menuItems: state.menuItems.map(i => ({ ...i })),
      totalRevenue: state.totalRevenue + state.dailyRevenue,
      dailyRevenue: 0,
      transactions: [],
    }
    set(next)
    saveToDisk(next)
  },

  tickTime: (deltaGameMinutes) => {
    const state = get()
    if (!state.dayRunning) return
    const newTime = state.gameTime + deltaGameMinutes
    if (newTime >= GAME_CONFIG.END_HOUR * 60) {
      get().endDay()
      return
    }
    set({ gameTime: newTime })
  },

  // ─── Customers ───────────────────────────────────────────────────────────────

  addCustomer: (customer) => {
    set(s => ({
      customers: [...s.customers, customer],
      lastSpawnTime: s.gameTime,
    }))
  },

  updateCustomer: (id, updates) => {
    set(s => ({
      customers: s.customers.map(c => c.id === id ? { ...c, ...updates } : c),
    }))
  },

  removeCustomer: (id) => {
    set(s => {
      const customer = s.customers.find(c => c.id === id)
      const newOccupancy = { ...s.tableOccupancy }
      // An un-seated customer has tableId null, which is not a table to free.
      if (customer && customer.tableId !== null) delete newOccupancy[customer.tableId]
      return {
        customers: s.customers.filter(c => c.id !== id),
        tableOccupancy: newOccupancy,
      }
    })
  },

  seatCustomer: (customerId, tableId) => {
    set(s => ({
      customers: s.customers.map(c => c.id === customerId ? { ...c, tableId, state: 'seated' } : c),
      tableOccupancy: { ...s.tableOccupancy, [tableId]: customerId },
    }))
  },

  serveCustomer: (customerId) => {
    const state = get()
    const customer = state.customers.find(c => c.id === customerId)
    if (!customer || !customer.order) return

    const order = customer.order
    const menuItem = state.menuItems.find(m => m.id === order.itemId)
    if (!menuItem || menuItem.stocked < 1) {
      // Item unavailable, customer leaves unhappy
      get().updateCustomer(customerId, { state: 'leaving', mood: 'unhappy' })
      return
    }

    const price = menuItem.price
    const transaction: Transaction = {
      time: state.gameTime,
      customerName: customer.name,
      itemName: menuItem.name,
      amount: price,
    }

    set(s => ({
      money: s.money + price,
      dailyRevenue: s.dailyRevenue + price,
      transactions: [transaction, ...s.transactions].slice(0, 50),
      menuItems: s.menuItems.map(m =>
        m.id === menuItem.id ? { ...m, stocked: m.stocked - 1 } : m
      ),
      customers: s.customers.map(c =>
        c.id === customerId ? { ...c, state: 'served', mood: 'happy' } : c
      ),
    }))
    saveToDisk(get())
  },

  setNextSpawnIn: (minutes) => {
    set({ nextSpawnIn: minutes })
  },

  // ─── Inventory ────────────────────────────────────────────────────────────────

  addIngredient: (ingredientId, qty) => {
    set(s => ({
      ingredients: {
        ...s.ingredients,
        [ingredientId]: (s.ingredients[ingredientId] || 0) + qty,
      },
    }))
    saveToDisk(get())
  },

  purchaseIngredients: (ingredientId, qty, totalCost) => {
    set(s => ({
      money: s.money - totalCost,
      ingredients: {
        ...s.ingredients,
        [ingredientId]: (s.ingredients[ingredientId] || 0) + qty,
      },
    }))
    saveToDisk(get())
  },

  // ─── Menu ─────────────────────────────────────────────────────────────────────

  setMenuPrice: (itemId, price) => {
    set(s => ({
      menuItems: s.menuItems.map(m => m.id === itemId ? { ...m, price } : m),
    }))
    saveToDisk(get())
  },

  prepBatch: (itemId) => {
    const state = get()
    const item = state.menuItems.find(m => m.id === itemId)
    if (!item) return { success: false, reason: 'Item not found' }

    // Check we have enough ingredients for PREP_BATCH_SIZE batches
    const batchSize = GAME_CONFIG.PREP_BATCH_SIZE
    for (const [ingId, qty] of ingredientEntries(item.ingredients)) {
      if ((state.ingredients[ingId] || 0) < qty * batchSize) {
        return { success: false, reason: `Not enough ${ingId}` }
      }
    }

    const newIngredients: IngredientStock = { ...state.ingredients }
    for (const [ingId, qty] of ingredientEntries(item.ingredients)) {
      newIngredients[ingId] = (newIngredients[ingId] || 0) - qty * batchSize
    }

    set(s => ({
      ingredients: newIngredients,
      menuItems: s.menuItems.map(m =>
        m.id === itemId ? { ...m, stocked: m.stocked + batchSize } : m
      ),
    }))
    saveToDisk(get())
    return { success: true }
  },

  resetSave: () => {
    localStorage.removeItem(SAVE_KEY)
    set(getDefaultState())
  },
}))
