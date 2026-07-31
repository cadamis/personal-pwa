import { create } from 'zustand'
import { DEFAULT_INGREDIENTS, DEFAULT_MENU_ITEMS, GAME_CONFIG } from '../game/constants.js'

const SAVE_KEY = 'teabug-save'

function buildDefaultMenu() {
  return DEFAULT_MENU_ITEMS.map(item => ({
    ...item,
    price: item.defaultPrice,
  }))
}

function getDefaultState() {
  return {
    money: GAME_CONFIG.START_MONEY,
    dayCount: 1,
    gameTime: GAME_CONFIG.START_HOUR * 60, // minutes since midnight
    dayRunning: false,
    dayEnded: false,
    ingredients: { ...DEFAULT_INGREDIENTS },
    menuItems: buildDefaultMenu(),
    customers: [],          // active canvas customers
    dailyRevenue: 0,
    totalRevenue: 0,
    transactions: [],       // { time, customerName, itemName, amount }
    lastSpawnTime: GAME_CONFIG.START_HOUR * 60,
    nextSpawnIn: 5,         // game-minutes until next spawn
    tableOccupancy: {},     // tableId -> customerId
  }
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveToDisk(state) {
  const { customers, ...rest } = state
  // Don't save live customer state (transient), reset on load
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...rest, customers: [], tableOccupancy: {} }))
  } catch { /* storage full */ }
}

const saved = loadSave()
const initial = saved ? { ...getDefaultState(), ...saved } : getDefaultState()

export const useGameStore = create((set, get) => ({
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
    const next = {
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
      if (customer?.tableId !== undefined) delete newOccupancy[customer.tableId]
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

    const menuItem = state.menuItems.find(m => m.id === customer.order.itemId)
    if (!menuItem || menuItem.stocked < 1) {
      // Item unavailable, customer leaves unhappy
      get().updateCustomer(customerId, { state: 'leaving', mood: 'unhappy' })
      return
    }

    const price = menuItem.price
    const transaction = {
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
    for (const [ingId, qty] of Object.entries(item.ingredients)) {
      if ((state.ingredients[ingId] || 0) < qty * batchSize) {
        return { success: false, reason: `Not enough ${ingId}` }
      }
    }

    const newIngredients = { ...state.ingredients }
    for (const [ingId, qty] of Object.entries(item.ingredients)) {
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
