// ─── Ingredients ─────────────────────────────────────────────────────────────

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
}

// ─── Menu Items ───────────────────────────────────────────────────────────────

// Categories for time-of-day preference matching
export const MENU_CATEGORIES = {
  HOT_TEA:   'hot_tea',
  ICED_TEA:  'iced_tea',
  SPECIALTY:  'specialty',
  PASTRY:    'pastry',
  SWEET:     'sweet',
}

export const DEFAULT_MENU_ITEMS = [
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
}

// Game minutes per real millisecond
// Total game-minutes = (20-8)*60 = 720 over 10 real minutes (600000ms)
export const GAME_SPEED = 720 / (10 * 60 * 1000) // game-min per real-ms

// ─── Canvas Layout ────────────────────────────────────────────────────────────

export const CANVAS_W = 800
export const CANVAS_H = 520

// Table seats (center positions) — 8 tables in a 4×2 grid
export const TABLE_POSITIONS = [
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

export const CUSTOMERS = [
  { name: 'Froggo',   animal: 'frog',        color: '#5cb85c' },
  { name: 'Boxie',    animal: 'boxElderBug', color: '#2c2c2c' },
  { name: 'Scales',   animal: 'snake',       color: '#7cb87c' },
  { name: 'Sue',      animal: 'ladybug',     color: '#e53935' },
  { name: 'Anthony',  animal: 'ant',         color: '#5D4037' },
  { name: 'Flo',      animal: 'butterfly',   color: '#AB47BC' },
  { name: 'Lady',     animal: 'spider',      color: '#37474F' },
]
