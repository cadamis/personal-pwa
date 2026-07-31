import { useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { INGREDIENTS, GAME_CONFIG, MENU_CATEGORIES } from '../game/constants.js'

const CATEGORY_DISPLAY = {
  [MENU_CATEGORIES.HOT_TEA]:  { label: 'Hot Teas',         icon: '☕' },
  [MENU_CATEGORIES.ICED_TEA]: { label: 'Iced & Cold',      icon: '🧋' },
  [MENU_CATEGORIES.SPECIALTY]:{ label: 'Specialty Drinks', icon: '🫖' },
  [MENU_CATEGORIES.PASTRY]:   { label: 'Pastries',         icon: '🫓' },
  [MENU_CATEGORIES.SWEET]:    { label: 'Sweets',           icon: '🍪' },
}

// Price adjusts a quarter at a time — matches how the menu prices are written
// and keeps the stepper to a sensible number of taps.
const PRICE_STEP = 0.25

function ingredientCost(ingredients) {
  return Object.entries(ingredients).reduce((sum, [id, qty]) => {
    return sum + (INGREDIENTS[id]?.costPerUnit || 0) * qty
  }, 0)
}

function canPrep(item, ingredientStock) {
  return Object.entries(item.ingredients).every(
    ([id, qty]) => (ingredientStock[id] || 0) >= qty * GAME_CONFIG.PREP_BATCH_SIZE
  )
}

function PrepResult({ result, onClose }) {
  if (!result) return null
  return (
    <div className={`prep-toast ${result.success ? 'success' : 'error'}`}>
      {result.success
        ? `✓ Prepped ${GAME_CONFIG.PREP_BATCH_SIZE} batches!`
        : `✗ ${result.reason}`}
      <button className="toast-close" onClick={onClose}>×</button>
    </div>
  )
}

function MenuItem({ item, ingredientStock }) {
  const setMenuPrice = useGameStore(s => s.setMenuPrice)
  const prepBatch = useGameStore(s => s.prepBatch)
  const [prepResult, setPrepResult] = useState(null)

  const cost = ingredientCost(item.ingredients) * GAME_CONFIG.PREP_BATCH_SIZE
  const singleCost = ingredientCost(item.ingredients)
  const margin = item.price - singleCost
  const marginPct = singleCost > 0 ? (margin / singleCost * 100) : 0

  const possible = canPrep(item, ingredientStock)

  // Adjust in 25c steps rather than via a number field: a number input pops the
  // tablet's on-screen keyboard, which covers the menu and is awkward for a kid.
  function adjustPrice(delta) {
    const next = Math.max(PRICE_STEP, Math.round((item.price + delta) * 100) / 100)
    setMenuPrice(item.id, next)
  }

  function handlePrep() {
    const result = prepBatch(item.id)
    setPrepResult(result)
    setTimeout(() => setPrepResult(null), 2500)
  }

  return (
    <div className={`menu-item-card ${item.stocked === 0 ? 'out-of-stock' : ''}`}>
      <PrepResult result={prepResult} onClose={() => setPrepResult(null)} />

      <div className="menu-item-header">
        <span className="menu-item-emoji">{item.emoji}</span>
        <div className="menu-item-title">
          <span className="menu-item-name">{item.name}</span>
          <span className="menu-item-desc">{item.description}</span>
        </div>
        <div className={`stock-indicator ${item.stocked === 0 ? 'empty' : item.stocked <= 2 ? 'low' : 'ok'}`}>
          <span className="stock-count">{item.stocked}</span>
          <span className="stock-label">in stock</span>
        </div>
      </div>

      <div className="menu-item-body">
        {/* Ingredients list */}
        <div className="ingredients-list">
          <span className="ingredients-label">Ingredients:</span>
          <div className="ingredient-tags">
            {Object.entries(item.ingredients).map(([id, qty]) => {
              const ing = INGREDIENTS[id]
              const hasEnough = (ingredientStock[id] || 0) >= qty
              return (
                <span key={id} className={`ing-tag ${hasEnough ? '' : 'ing-missing'}`}>
                  {ing?.emoji} {qty}× {ing?.name || id}
                </span>
              )
            })}
          </div>
        </div>

        {/* Cost & margin */}
        <div className="cost-info">
          <span className="cost-label">Ingredient cost:</span>
          <span className="cost-value">${singleCost.toFixed(2)}/serving</span>
          <span className={`margin-badge ${marginPct > 50 ? 'good' : marginPct > 20 ? 'ok' : 'thin'}`}>
            {marginPct > 0 ? `+${marginPct.toFixed(0)}% margin` : 'below cost!'}
          </span>
        </div>

        {/* Price editor */}
        <div className="price-editor">
          <span className="price-editor-label">Sale Price</span>
          <div className="qty-stepper price-stepper">
            <button
              className="qty-btn"
              aria-label={`Lower the price of ${item.name}`}
              disabled={item.price <= PRICE_STEP}
              onClick={() => adjustPrice(-PRICE_STEP)}
            >−</button>
            <span className="qty-value price-value" aria-live="polite">
              ${item.price.toFixed(2)}
            </span>
            <button
              className="qty-btn"
              aria-label={`Raise the price of ${item.name}`}
              onClick={() => adjustPrice(PRICE_STEP)}
            >+</button>
          </div>
        </div>

        {/* Prep button */}
        <div className="prep-section">
          <button
            className={`btn btn-prep ${possible ? 'btn-primary' : 'btn-disabled'}`}
            disabled={!possible}
            onClick={handlePrep}
          >
            🍳 Prep {GAME_CONFIG.PREP_BATCH_SIZE} Batches
          </button>
          <div className="prep-cost">
            <span className="prep-cost-label">Costs:</span>
            {Object.entries(item.ingredients).map(([id, qty], i, arr) => {
              const needed = qty * GAME_CONFIG.PREP_BATCH_SIZE
              const have   = ingredientStock[id] || 0
              const short  = have < needed
              const ing    = INGREDIENTS[id]
              return (
                <span key={id} className={`prep-cost-ing ${short ? 'prep-cost-short' : 'prep-cost-ok'}`}>
                  {ing?.emoji} {needed}× {ing?.name || id}
                  {short && <span className="prep-cost-have"> ({have} on hand)</span>}
                  {i < arr.length - 1 ? ',' : ''}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MenuPanel() {
  const menuItems = useGameStore(s => s.menuItems)
  const ingredients = useGameStore(s => s.ingredients)

  const byCategory = {}
  menuItems.forEach(item => {
    if (!byCategory[item.category]) byCategory[item.category] = []
    byCategory[item.category].push(item)
  })

  const totalStocked = menuItems.reduce((s, m) => s + m.stocked, 0)
  const outOfStock = menuItems.filter(m => m.stocked === 0).length

  return (
    <div className="panel menu-panel">
      <div className="panel-header">
        <h2 className="panel-title">📋 Menu & Preparation</h2>
        <p className="panel-subtitle">Set prices, prep batches, and keep the menu stocked</p>
      </div>

      <div className="menu-stats-bar">
        <div className="menu-stat">
          <span className="menu-stat-value">{totalStocked}</span>
          <span className="menu-stat-label">Total stocked</span>
        </div>
        <div className="menu-stat">
          <span className={`menu-stat-value ${outOfStock > 0 ? 'warn' : ''}`}>{outOfStock}</span>
          <span className="menu-stat-label">Out of stock</span>
        </div>
        <div className="menu-stat">
          <span className="menu-stat-value">{menuItems.length}</span>
          <span className="menu-stat-label">Menu items</span>
        </div>
      </div>

      {outOfStock > 0 && (
        <div className="alert alert-warning">
          <strong>⚠ {outOfStock} items are out of stock</strong> — customers won't be able to order them!
        </div>
      )}

      {Object.entries(byCategory).map(([cat, items]) => {
        const { label, icon } = CATEGORY_DISPLAY[cat] || { label: cat, icon: '•' }
        return (
          <div key={cat} className="menu-category-section">
            <h3 className="menu-category-title">{icon} {label}</h3>
            <div className="menu-items-list">
              {items.map(item => (
                <MenuItem key={item.id} item={item} ingredientStock={ingredients} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
