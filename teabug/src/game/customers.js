import {
  CUSTOMERS,
  GAME_CONFIG,
  MENU_CATEGORIES,
  TABLE_POSITIONS,
  DOOR_X,
  DOOR_Y,
} from './constants.js'

// ─── Time-of-day preference weights ──────────────────────────────────────────
// Each period maps category -> weight (higher = more likely)

const TIME_PREFERENCES = [
  {
    // 8–10am: Morning
    startMin: 8 * 60,
    endMin: 10 * 60,
    weights: {
      [MENU_CATEGORIES.HOT_TEA]:  4,
      [MENU_CATEGORIES.SPECIALTY]: 2,
      [MENU_CATEGORIES.PASTRY]:   4,
      [MENU_CATEGORIES.ICED_TEA]: 1,
      [MENU_CATEGORIES.SWEET]:    1,
    },
    budgetBias: 'mid',
    spawnRate: 1.2, // multiplier on base spawn rate
  },
  {
    // 10am–12pm: Late morning
    startMin: 10 * 60,
    endMin: 12 * 60,
    weights: {
      [MENU_CATEGORIES.HOT_TEA]:  3,
      [MENU_CATEGORIES.SPECIALTY]: 3,
      [MENU_CATEGORIES.PASTRY]:   3,
      [MENU_CATEGORIES.ICED_TEA]: 2,
      [MENU_CATEGORIES.SWEET]:    2,
    },
    budgetBias: 'high',
    spawnRate: 1.0,
  },
  {
    // 12pm–2pm: Midday
    startMin: 12 * 60,
    endMin: 14 * 60,
    weights: {
      [MENU_CATEGORIES.HOT_TEA]:  2,
      [MENU_CATEGORIES.SPECIALTY]: 2,
      [MENU_CATEGORIES.PASTRY]:   3,
      [MENU_CATEGORIES.ICED_TEA]: 5,
      [MENU_CATEGORIES.SWEET]:    3,
    },
    budgetBias: 'mid',
    spawnRate: 1.4, // lunch rush
  },
  {
    // 2pm–5pm: Afternoon
    startMin: 14 * 60,
    endMin: 17 * 60,
    weights: {
      [MENU_CATEGORIES.HOT_TEA]:  2,
      [MENU_CATEGORIES.SPECIALTY]: 4,
      [MENU_CATEGORIES.PASTRY]:   2,
      [MENU_CATEGORIES.ICED_TEA]: 3,
      [MENU_CATEGORIES.SWEET]:    4,
    },
    budgetBias: 'high',
    spawnRate: 1.1,
  },
  {
    // 5pm–8pm: Evening
    startMin: 17 * 60,
    endMin: 20 * 60,
    weights: {
      [MENU_CATEGORIES.HOT_TEA]:  5,
      [MENU_CATEGORIES.SPECIALTY]: 3,
      [MENU_CATEGORIES.PASTRY]:   3,
      [MENU_CATEGORIES.ICED_TEA]: 1,
      [MENU_CATEGORIES.SWEET]:    2,
    },
    budgetBias: 'mid',
    spawnRate: 0.8, // slowing down
  },
]

function getPeriod(gameTimeMinutes) {
  return (
    TIME_PREFERENCES.find(p => gameTimeMinutes >= p.startMin && gameTimeMinutes < p.endMin) ||
    TIME_PREFERENCES[0]
  )
}

// Weighted random choice from { key: weight } object
function weightedRandom(weights) {
  const entries = Object.entries(weights)
  const total = entries.reduce((sum, [, w]) => sum + w, 0)
  let r = Math.random() * total
  for (const [key, weight] of entries) {
    r -= weight
    if (r <= 0) return key
  }
  return entries[entries.length - 1][0]
}

// Pick the best available menu item for a given preferred category + budget
export function pickOrder(menuItems, preferredCategory, budget, gameTimeMinutes) {
  const available = menuItems.filter(m => m.stocked > 0)
  if (available.length === 0) return null

  const budgetMax = budget === 'low' ? 3.0 : budget === 'mid' ? 5.5 : 9.0

  // Filter by budget
  const affordable = available.filter(m => m.price <= budgetMax)
  const candidates = affordable.length > 0 ? affordable : available

  // Score: category match + random noise
  const period = getPeriod(gameTimeMinutes)
  const scored = candidates.map(item => {
    const catWeight = period.weights[item.category] || 1
    const score = catWeight * 10 + Math.random() * 5
    return { item, score }
  })

  scored.sort((a, b) => b.score - a.score)
  // Pick from top 3 with weighted probability
  const top = scored.slice(0, Math.min(3, scored.length))
  const totalScore = top.reduce((s, x) => s + x.score, 0)
  let r = Math.random() * totalScore
  for (const { item, score } of top) {
    r -= score
    if (r <= 0) return item
  }
  return top[0].item
}

let customerCounter = 0

export function createCustomer(gameTimeMinutes) {
  const period = getPeriod(gameTimeMinutes)
  const preferredCategory = weightedRandom(period.weights)
  const budget = period.budgetBias === 'high'
    ? (Math.random() < 0.4 ? 'high' : 'mid')
    : (Math.random() < 0.3 ? 'low' : 'mid')

  const patience = GAME_CONFIG.CUSTOMER_PATIENCE_MIN +
    Math.random() * (GAME_CONFIG.CUSTOMER_PATIENCE_MAX - GAME_CONFIG.CUSTOMER_PATIENCE_MIN)

  const character = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)]
  customerCounter++

  return {
    id: `cust_${Date.now()}_${customerCounter}`,
    name: character.name,
    animal: character.animal,
    color: character.color,
    preferredCategory,
    budget,
    patience,
    patienceRemaining: patience,
    mood: 'neutral',       // 'neutral' | 'happy' | 'unhappy' | 'impatient'
    state: 'entering',     // 'entering' | 'seated' | 'waiting' | 'served' | 'leaving' | 'gone'
    tableId: null,
    order: null,
    serviceTimer: 0,
    // Canvas position
    x: DOOR_X + (Math.random() - 0.5) * 20,
    y: DOOR_Y,
    targetX: DOOR_X,
    targetY: DOOR_Y,
  }
}

// Find a free table index, or null if all full
export function findFreeTable(tableOccupancy) {
  const occupied = new Set(Object.keys(tableOccupancy).map(Number))
  const free = TABLE_POSITIONS.filter(t => !occupied.has(t.id))
  if (free.length === 0) return null
  return free[Math.floor(Math.random() * free.length)]
}

// Compute spawn interval in game-minutes based on current time period
export function getSpawnInterval(gameTimeMinutes) {
  const period = getPeriod(gameTimeMinutes)
  const base = GAME_CONFIG.SPAWN_MIN_GAME_MIN +
    Math.random() * (GAME_CONFIG.SPAWN_MAX_GAME_MIN - GAME_CONFIG.SPAWN_MIN_GAME_MIN)
  return base / period.spawnRate
}
