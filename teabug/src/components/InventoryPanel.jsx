import { useGameStore } from '../store/gameStore.js'
import { INGREDIENTS } from '../game/constants.js'

const LOW_STOCK_THRESHOLD = 5
const CRITICAL_THRESHOLD = 2

function StockBadge({ qty }) {
  const cls = qty <= CRITICAL_THRESHOLD
    ? 'badge badge-critical'
    : qty <= LOW_STOCK_THRESHOLD
    ? 'badge badge-low'
    : 'badge badge-ok'
  return <span className={cls}>{qty}</span>
}

function StockBar({ qty, max = 30 }) {
  const pct = Math.min(1, qty / max) * 100
  const color = qty <= CRITICAL_THRESHOLD ? 'var(--terracotta)'
    : qty <= LOW_STOCK_THRESHOLD ? '#d4a020'
    : 'var(--green)'
  return (
    <div className="stock-bar-track">
      <div
        className="stock-bar-fill"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

const CATEGORY_LABELS = {
  tea:    '🍵 Teas',
  dairy:  '🥛 Dairy',
  sweet:  '🍬 Sweeteners',
  baking: '🌾 Baking',
  fruit:  '🍋 Fruits',
  spice:  '🌶️ Spices',
}

export default function InventoryPanel() {
  const ingredients = useGameStore(s => s.ingredients)

  // Group by category
  const byCategory = {}
  Object.values(INGREDIENTS).forEach(ing => {
    if (!byCategory[ing.category]) byCategory[ing.category] = []
    byCategory[ing.category].push(ing)
  })

  const lowStockItems = Object.values(INGREDIENTS).filter(
    ing => (ingredients[ing.id] || 0) <= LOW_STOCK_THRESHOLD
  )

  return (
    <div className="panel inventory-panel">
      <div className="panel-header">
        <h2 className="panel-title">📦 Ingredient Inventory</h2>
        <p className="panel-subtitle">Track your stock levels and plan your next order</p>
      </div>

      {lowStockItems.length > 0 && (
        <div className="alert alert-warning">
          <strong>⚠ Low Stock:</strong>{' '}
          {lowStockItems.map(i => `${i.emoji} ${i.name} (${ingredients[i.id] || 0})`).join(', ')}
        </div>
      )}

      <div className="inventory-categories">
        {Object.entries(byCategory).map(([cat, items]) => (
          <div key={cat} className="inventory-category">
            <h3 className="category-title">{CATEGORY_LABELS[cat] || cat}</h3>
            <div className="ingredient-grid">
              {items.map(ing => {
                const qty = ingredients[ing.id] || 0
                const isCritical = qty <= CRITICAL_THRESHOLD
                const isLow = qty <= LOW_STOCK_THRESHOLD

                return (
                  <div
                    key={ing.id}
                    className={`ingredient-card ${isCritical ? 'critical' : isLow ? 'low' : ''}`}
                  >
                    <div className="ingredient-emoji">{ing.emoji}</div>
                    <div className="ingredient-info">
                      <div className="ingredient-name">{ing.name}</div>
                      <StockBar qty={qty} />
                    </div>
                    <StockBadge qty={qty} />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="panel-footer-note">
        Visit the <strong>Order Supplies</strong> tab to restock ingredients.
      </div>
    </div>
  )
}
