// ─── Ingredients ─────────────────────────────────────────────────────────────

export type IngredientCategory = 'tea' | 'dairy' | 'sweet' | 'baking' | 'fruit' | 'spice'

export interface Ingredient {
  id: string
  name: string
  emoji: string
  category: IngredientCategory
  costPerUnit: number
}

// `as const satisfies` gives us both: the literal keys become IngredientId (so
// INGREDIENTS[id] is total and needs no cast), while `satisfies` still checks
// every entry against the Ingredient shape.
export const INGREDIENTS = {
  blackTea:    { id: 'blackTea',    name: 'Black Tea',      emoji: '🍵', category: 'tea',    costPerUnit: 0.30 },
  greenTea:    { id: 'greenTea',    name: 'Green Tea',      emoji: '🍵', category: 'tea',    costPerUnit: 0.35 },
  oolong:      { id: 'oolong',      name: 'Oolong Tea',     emoji: '🍵', category: 'tea',    costPerUnit: 0.45 },
  herbalBlend: { id: 'herbalBlend', name: 'Herbal Blend',   emoji: '🌿', category: 'tea',    costPerUnit: 0.40 },
  milk:        { id: 'milk',        name: 'Milk',           emoji: '🥛', category: 'dairy',  costPerUnit: 0.20 },
  cream:       { id: 'cream',       name: 'Cream',          emoji: '🥛', category: 'dairy',  costPerUnit: 0.35 },
  sugar:       { id: 'sugar',       name: 'Sugar',          emoji: '🍬', category: 'sweet',  costPerUnit: 0.10 },
  honey:       { id: 'honey',       name: 'Honey',          emoji: '🍯', category: 'sweet',  costPerUnit: 0.25 },
  flour:       { id: 'flour',       name: 'Flour',          emoji: '🌾', category: 'baking', costPerUnit: 0.15 },
  butter:      { id: 'butter',      name: 'Butter',         emoji: '🧈', category: 'dairy',  costPerUnit: 0.30 },
  eggs:        { id: 'eggs',        name: 'Eggs',           emoji: '🥚', category: 'baking', costPerUnit: 0.25 },
  lemon:       { id: 'lemon',       name: 'Lemon',          emoji: '🍋', category: 'fruit',  costPerUnit: 0.20 },
  berries:     { id: 'berries',     name: 'Berries',        emoji: '🫐', category: 'fruit',  costPerUnit: 0.50 },
  spices:      { id: 'spices',      name: 'Spice Mix',      emoji: '🌶️', category: 'spice',  costPerUnit: 0.20 },
} as const satisfies Record<string, Ingredient>

export type IngredientId = keyof typeof INGREDIENTS

/**
 * An entry read out of the INGREDIENTS table. Distinct from `Ingredient`: this
 * keeps `id` narrowed to IngredientId, so passing one around and then using
 * `entry.id` to index the pantry needs no cast.
 */
export type IngredientEntry = (typeof INGREDIENTS)[IngredientId]

/** How much of each ingredient is in the pantry. */
export type IngredientStock = Record<IngredientId, number>

/** What a menu item consumes per serving — only the ingredients it uses. */
export type IngredientCost = Partial<Record<IngredientId, number>>

// Object.entries widens keys to `string`, which loses IngredientId and makes
// every pantry lookup look unsafe. This is the one place that's papered over,
// and it's sound because the input type only permits IngredientId keys.
export function ingredientEntries(cost: IngredientCost): [IngredientId, number][] {
  return Object.entries(cost) as [IngredientId, number][]
}

// Default starting stock
export const DEFAULT_INGREDIENTS = {
  blackTea:    20,
  greenTea:    20,
  oolong:      15,
  herbalBlend: 15,
  milk:        20,
  cream:       10,
  sugar:       25,
  honey:       15,
  flour:       20,
  butter:      15,
  eggs:        18,
  lemon:       12,
  berries:     10,
  spices:      12,
} satisfies IngredientStock

// ─── Menu Items ───────────────────────────────────────────────────────────────

// Categories for time-of-day preference matching
export const MENU_CATEGORIES = {
  HOT_TEA:   'hot_tea',
  ICED_TEA:  'iced_tea',
  SPECIALTY: 'specialty',
  PASTRY:    'pastry',
  SWEET:     'sweet',
} as const

export type MenuCategory = (typeof MENU_CATEGORIES)[keyof typeof MENU_CATEGORIES]

/** A menu item as authored, before the player has set a price on it. */
export interface MenuItemDef {
  id: string
  name: string
  emoji: string
  category: MenuCategory
  ingredients: IngredientCost
  defaultPrice: number
  stocked: number
  description: string
}

/** A menu item in play, carrying the price the player has chosen. */
export interface MenuItem extends MenuItemDef {
  price: number
}

export const DEFAULT_MENU_ITEMS: MenuItemDef[] = [
  {
    id: 'blackTeaCup',
    name: 'Black Tea',
    emoji: '☕',
    category: MENU_CATEGORIES.HOT_TEA,
    ingredients: { blackTea: 1, sugar: 1 },
    defaultPrice: 2.50,
    stocked: 8,
    description: 'A classic robust brew',
  },
  {
    id: 'greenTeaCup',
    name: 'Green Tea',
    emoji: '🍵',
    category: MENU_CATEGORIES.HOT_TEA,
    ingredients: { greenTea: 1, honey: 1 },
    defaultPrice: 2.75,
    stocked: 8,
    description: 'Light & grassy with honey',
  },
  {
    id: 'chaiLatte',
    name: 'Chai Latte',
    emoji: '☕',
    category: MENU_CATEGORIES.SPECIALTY,
    ingredients: { blackTea: 1, milk: 2, spices: 1, sugar: 1 },
    defaultPrice: 4.00,
    stocked: 6,
    description: 'Spiced milk tea',
  },
  {
    id: 'icedTea',
    name: 'Iced Tea',
    emoji: '🧋',
    category: MENU_CATEGORIES.ICED_TEA,
    ingredients: { blackTea: 1, sugar: 2, lemon: 1 },
    defaultPrice: 3.25,
    stocked: 8,
    description: 'Chilled & refreshing',
  },
  {
    id: 'herbalBrew',
    name: 'Herbal Brew',
    emoji: '🌿',
    category: MENU_CATEGORIES.HOT_TEA,
    ingredients: { herbalBlend: 2, honey: 1 },
    defaultPrice: 3.00,
    stocked: 6,
    description: 'Soothing garden herbs',
  },
  {
    id: 'oolongTea',
    name: 'Oolong Special',
    emoji: '🍵',
    category: MENU_CATEGORIES.SPECIALTY,
    ingredients: { oolong: 2, honey: 1 },
    defaultPrice: 3.75,
    stocked: 5,
    description: 'Semi-fermented complexity',
  },
  {
    id: 'scone',
    name: 'Butter Scone',
    emoji: '🫓',
    category: MENU_CATEGORIES.PASTRY,
    ingredients: { flour: 2, butter: 2, eggs: 1, sugar: 1 },
    defaultPrice: 3.50,
    stocked: 6,
    description: 'Flaky, buttery perfection',
  },
  {
    id: 'blueberryMuffin',
    name: 'Blueberry Muffin',
    emoji: '🧁',
    category: MENU_CATEGORIES.PASTRY,
    ingredients: { flour: 2, butter: 1, eggs: 1, berries: 2, sugar: 1 },
    defaultPrice: 3.75,
    stocked: 5,
    description: 'Bursting with berries',
  },
  {
    id: 'shortbreadCookie',
    name: 'Shortbread Cookie',
    emoji: '🍪',
    category: MENU_CATEGORIES.SWEET,
    ingredients: { flour: 1, butter: 2, sugar: 2 },
    defaultPrice: 2.25,
    stocked: 10,
    description: 'Crumbly & sweet',
  },
  {
    id: 'lemonTart',
    name: 'Lemon Tart',
    emoji: '🥧',
    category: MENU_CATEGORIES.SWEET,
    ingredients: { flour: 1, butter: 1, eggs: 2, lemon: 2, sugar: 2 },
    defaultPrice: 4.25,
    stocked: 4,
    description: 'Tangy citrus custard',
  },
  {
    id: 'creamTeaSet',
    name: 'Cream Tea Set',
    emoji: '🫖',
    category: MENU_CATEGORIES.SPECIALTY,
    ingredients: { blackTea: 1, flour: 2, butter: 2, eggs: 1, cream: 1, sugar: 1 },
    defaultPrice: 7.50,
    stocked: 3,
    description: 'Tea + scone + clotted cream',
  },
]

// ─── Game Config ──────────────────────────────────────────────────────────────

export const GAME_CONFIG = {
  START_HOUR: 8,       // 8 AM
  END_HOUR: 20,        // 8 PM
  REAL_DURATION_MS: 10 * 60 * 1000, // 10 minutes in ms
  START_MONEY: 200,
  PREP_BATCH_SIZE: 6,  // how many items per prep action
  MAX_CUSTOMERS: 8,    // max simultaneous customers on canvas
  // Spawn interval in game-minutes (random between min/max)
  SPAWN_MIN_GAME_MIN: 3,
  SPAWN_MAX_GAME_MIN: 12,
  // How long a customer waits (game-minutes) before leaving unhappy
  CUSTOMER_PATIENCE_MIN: 15,
  CUSTOMER_PATIENCE_MAX: 30,
  // Service time after order placed (game-minutes)
  SERVICE_TIME: 5,
} as const

// Game minutes per real millisecond
// Total game-minutes = (20-8)*60 = 720 over 10 real minutes (600000ms)
export const GAME_SPEED = 720 / (10 * 60 * 1000) // game-min per real-ms

// ─── Canvas Layout ────────────────────────────────────────────────────────────

export const CANVAS_W = 800
export const CANVAS_H = 520

export interface TablePosition {
  id: number
  x: number
  y: number
}

/** tableId -> id of the customer sitting there. */
export type TableOccupancy = Record<number, string>

// Table seats (center positions) — 8 tables in a 4×2 grid
export const TABLE_POSITIONS: TablePosition[] = [
  { id: 0, x: 140, y: 180 },
  { id: 1, x: 290, y: 180 },
  { id: 2, x: 510, y: 180 },
  { id: 3, x: 660, y: 180 },
  { id: 4, x: 140, y: 330 },
  { id: 5, x: 290, y: 330 },
  { id: 6, x: 510, y: 330 },
  { id: 7, x: 660, y: 330 },
]

export const DOOR_X = CANVAS_W / 2
export const DOOR_Y = CANVAS_H - 20

// ─── Customer Characters ──────────────────────────────────────────────────────

export type AnimalKind =
  | 'frog'
  | 'boxElderBug'
  | 'snake'
  | 'ladybug'
  | 'ant'
  | 'butterfly'
  | 'spider'

export interface CustomerCharacter {
  name: string
  animal: AnimalKind
  color: string
}

export const CUSTOMERS: CustomerCharacter[] = [
  { name: 'Froggo',   animal: 'frog',        color: '#5cb85c' },
  { name: 'Boxie',    animal: 'boxElderBug', color: '#2c2c2c' },
  { name: 'Scales',   animal: 'snake',       color: '#7cb87c' },
  { name: 'Sue',      animal: 'ladybug',     color: '#e53935' },
  { name: 'Anthony',  animal: 'ant',         color: '#5D4037' },
  { name: 'Flo',      animal: 'butterfly',   color: '#AB47BC' },
  { name: 'Lady',     animal: 'spider',      color: '#37474F' },
]

// ─── Live customer state ──────────────────────────────────────────────────────

export type CustomerMood = 'neutral' | 'happy' | 'unhappy' | 'impatient'

export type CustomerState =
  | 'entering'
  | 'seated'
  | 'waiting'
  | 'served'
  | 'leaving'
  | 'gone'

export type Budget = 'low' | 'mid' | 'high'

export interface CustomerOrder {
  itemId: string
  itemName: string
  itemEmoji: string
}

export interface Customer {
  id: string
  name: string
  animal: AnimalKind
  color: string
  preferredCategory: MenuCategory
  budget: Budget
  patience: number
  patienceRemaining: number
  mood: CustomerMood
  state: CustomerState
  tableId: number | null
  order: CustomerOrder | null
  serviceTimer: number
  /** Set once served, counting down the after-service linger. */
  lingerTimer?: number
  // Canvas position
  x: number
  y: number
  targetX: number
  targetY: number
}

export interface Transaction {
  time: number
  customerName: string
  itemName: string
  amount: number
}
