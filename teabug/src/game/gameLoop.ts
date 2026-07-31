import { GAME_SPEED, GAME_CONFIG, TABLE_POSITIONS } from './constants'
import type { Customer, TableOccupancy, Transaction } from './constants'
import { createCustomer, findFreeTable, getSpawnInterval, pickOrder } from './customers'
import type { OrderableItem } from './customers'

const WALK_SPEED = 120 // canvas pixels per second

/**
 * The state `tick` reads and writes. Deliberately narrower than the full game
 * store: the loop only needs this slice, and typing it structurally keeps the
 * tests' lightweight mock store valid without casting it to the real store.
 */
export interface TickState<M extends OrderableItem = OrderableItem> {
  dayRunning: boolean
  gameTime: number
  customers: Customer[]
  tableOccupancy: TableOccupancy
  menuItems: M[]
  money: number
  dailyRevenue: number
  transactions: Transaction[]
  lastSpawnTime: number
  nextSpawnIn: number
  endDay: () => void
}

export interface TickStore<M extends OrderableItem = OrderableItem> {
  getState(): TickState<M>
  setState(partial: Partial<TickState<M>>): void
}

export function tick<M extends OrderableItem>(deltaMs: number, store: TickStore<M>): void {
  // ── Guard ─────────────────────────────────────────────────────────────────
  const state = store.getState()
  if (!state.dayRunning) return

  const deltaGameMin = deltaMs * GAME_SPEED
  const deltaRealSec = deltaMs / 1000
  const newTime = state.gameTime + deltaGameMin

  if (newTime >= GAME_CONFIG.END_HOUR * 60) {
    store.getState().endDay()
    return
  }

  // ── Read all mutable state once ────────────────────────────────────────────
  let customers: Customer[] = state.customers.map(c => ({ ...c })) // shallow-clone each
  let tableOccupancy: TableOccupancy = { ...state.tableOccupancy }
  let menuItems: M[] = state.menuItems.map(m => ({ ...m }))
  let money = state.money
  let dailyRevenue = state.dailyRevenue
  let transactions = state.transactions
  let lastSpawnTime = state.lastSpawnTime
  let nextSpawnIn = state.nextSpawnIn

  // ── Spawn ──────────────────────────────────────────────────────────────────
  const timeSinceLastSpawn = newTime - lastSpawnTime
  if (
    timeSinceLastSpawn >= nextSpawnIn &&
    customers.length < GAME_CONFIG.MAX_CUSTOMERS
  ) {
    const freeTable = findFreeTable(tableOccupancy)
    if (freeTable) {
      const c = createCustomer(newTime)
      c.state = 'seated'
      c.tableId = freeTable.id
      customers = [...customers, c]
      tableOccupancy = { ...tableOccupancy, [freeTable.id]: c.id }
      lastSpawnTime = newTime
      nextSpawnIn = getSpawnInterval(newTime)
    }
  }

  // ── Update each customer ───────────────────────────────────────────────────
  const toRemove = new Set<string>()

  customers = customers.map(customer => {
    let c = customer

    // Walk toward table
    if (
      c.tableId !== null &&
      c.tableId !== undefined &&
      (c.state === 'seated' || c.state === 'waiting' || c.state === 'served')
    ) {
      const tablePos = TABLE_POSITIONS.find(t => t.id === c.tableId)
      if (tablePos) {
        const dx = tablePos.x - c.x
        const dy = tablePos.y - c.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > 2) {
          const speed = WALK_SPEED * deltaRealSec
          c = { ...c,
            x: c.x + (dx / dist) * Math.min(speed, dist),
            y: c.y + (dy / dist) * Math.min(speed, dist),
          }
        }
      }
    }

    // Walk toward door when leaving
    if (c.state === 'leaving') {
      const exitX = 400
      const exitY = 540
      const lx = exitX - c.x
      const ly = exitY - c.y
      const ld = Math.sqrt(lx * lx + ly * ly)
      if (ld > 5) {
        const speed = WALK_SPEED * 1.3 * deltaRealSec
        c = { ...c,
          x: c.x + (lx / ld) * Math.min(speed, ld),
          y: c.y + (ly / ld) * Math.min(speed, ld),
        }
      } else {
        // Free table before marking gone
        if (c.tableId !== null && c.tableId !== undefined) {
          const { [c.tableId]: _removed, ...rest } = tableOccupancy
          tableOccupancy = rest
        }
        toRemove.add(c.id)
        return c
      }
    }

    // Seated → place order immediately
    if (c.state === 'seated' && !c.order) {
      const order = pickOrder(menuItems, c.preferredCategory, c.budget, newTime)
      if (order) {
        c = { ...c,
          order: { itemId: order.id, itemName: order.name, itemEmoji: order.emoji },
          state: 'waiting',
          serviceTimer: GAME_CONFIG.SERVICE_TIME,
        }
      } else {
        c = { ...c, state: 'leaving', mood: 'unhappy' }
      }
    }

    // Waiting → count down service timer
    if (c.state === 'waiting') {
      const newTimer = (c.serviceTimer > 0 ? c.serviceTimer : GAME_CONFIG.SERVICE_TIME) - deltaGameMin

      if (newTimer <= 0) {
        // Attempt to serve
        const menuItem = menuItems.find(m => m.id === c.order?.itemId)
        if (menuItem && menuItem.stocked > 0) {
          // Deduct stock, add revenue
          menuItems = menuItems.map(m =>
            m.id === menuItem.id ? { ...m, stocked: m.stocked - 1 } : m
          )
          const price = menuItem.price
          money += price
          dailyRevenue += price
          transactions = [
            { time: newTime, customerName: c.name, itemName: menuItem.name, amount: price },
            ...transactions,
          ].slice(0, 50)
          c = { ...c, state: 'served', mood: 'happy', lingerTimer: 8 }
        } else {
          c = { ...c, state: 'leaving', mood: 'unhappy' }
        }
      } else {
        // Countdown patience
        const newPatience = (c.patienceRemaining > 0 ? c.patienceRemaining : c.patience) - deltaGameMin
        if (newPatience <= 0) {
          c = { ...c, state: 'leaving', mood: 'unhappy', patienceRemaining: 0, serviceTimer: newTimer }
        } else {
          const mood = newPatience < c.patience * 0.3 ? 'impatient' : c.mood
          c = { ...c, serviceTimer: newTimer, patienceRemaining: newPatience, mood }
        }
      }
    }

    // Served → linger then leave
    if (c.state === 'served') {
      const linger = ((c.lingerTimer ?? 8) - deltaGameMin)
      if (linger <= 0) {
        c = { ...c, state: 'leaving', lingerTimer: 0 }
      } else {
        c = { ...c, lingerTimer: linger }
      }
    }

    return c
  })

  // Remove departed customers
  customers = customers.filter(c => !toRemove.has(c.id))

  // ── Single state write ─────────────────────────────────────────────────────
  store.setState({
    gameTime: newTime,
    lastSpawnTime,
    nextSpawnIn,
    customers,
    tableOccupancy,
    menuItems,
    money,
    dailyRevenue,
    transactions,
  })
}
