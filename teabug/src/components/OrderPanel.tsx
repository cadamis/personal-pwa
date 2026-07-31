import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { INGREDIENTS } from '../game/constants'
import type { IngredientCategory, IngredientEntry, IngredientId } from '../game/constants'

/** One line in the "recent orders" feed. */
interface OrderLogEntry {
  id: number
  text: string
}

// Bulk pricing: buy more, save more
function getBulkPrice(costPerUnit: number, qty: number): number {
  if (qty >= 20) return costPerUnit * 0.80
  if (qty >= 10) return costPerUnit * 0.90
  return costPerUnit
}

const CATEGORY_LABELS = {
  tea:    { label: 'Teas & Leaves',   icon: '🍵' },
  dairy:  { label: 'Dairy & Cream',   icon: '🥛' },
  sweet:  { label: 'Sweeteners',      icon: '🍬' },
  baking: { label: 'Baking Staples',  icon: '🌾' },
  fruit:  { label: 'Fresh Fruits',    icon: '🍋' },
  spice:  { label: 'Spices & Herbs',  icon: '🌶️' },
} satisfies Record<IngredientCategory, { label: string; icon: string }>

// Fixed display order, and the source of truth for grouping below.
const CATEGORY_ORDER = ['tea', 'dairy', 'sweet', 'baking', 'fruit', 'spice'] as const

function OrderRow({ ing, currentStock, money, onOrder }: {
  ing: IngredientEntry
  currentStock: number
  money: number
  onOrder: (ingredientId: IngredientId, qty: number, totalCost: number) => void
}) {
  const [qty, setQty] = useState(10)
  const [ordered, setOrdered] = useState(false)

  const effectivePrice = getBulkPrice(ing.costPerUnit, qty)
  const totalCost = effectivePrice * qty
  const canAfford = money >= totalCost
  const discount = qty >= 20 ? 20 : qty >= 10 ? 10 : 0

  function handleOrder() {
    onOrder(ing.id, qty, totalCost)
    setOrdered(true)
    setTimeout(() => setOrdered(false), 2000)
  }

  return (
    <div className="order-row">
      <div className="order-row-info">
        <span className="order-emoji">{ing.emoji}</span>
        <div className="order-details">
          <span className="order-name">{ing.name}</span>
          <span className="order-stock-current">
            In stock: <strong>{currentStock}</strong>
          </span>
        </div>
      </div>

      <div className="order-row-controls">
        {/* Stepper rather than a number input: on a tablet a number field pops
            the on-screen keyboard, which covers the shop and is fiddly for a
            kid. The value is display-only and the buttons carry the edit. */}
        <div className="qty-stepper">
          <button
            className="qty-btn"
            aria-label={`Order fewer ${ing.name}`}
            disabled={qty <= 1}
            onClick={() => setQty(q => Math.max(1, q - 5))}
          >−</button>
          <span className="qty-value" aria-live="polite">{qty}</span>
          <button
            className="qty-btn"
            aria-label={`Order more ${ing.name}`}
            disabled={qty >= 50}
            onClick={() => setQty(q => Math.min(50, q + 5))}
          >+</button>
        </div>

        <div className="order-cost-info">
          <span className="per-unit-cost">${effectivePrice.toFixed(2)}/unit</span>
          {discount > 0 && <span className="discount-badge">−{discount}% bulk</span>}
          <span className={`total-cost ${canAfford ? '' : 'unaffordable'}`}>
            ${totalCost.toFixed(2)}
          </span>
        </div>

        <button
          className={`btn btn-order ${!canAfford ? 'btn-disabled' : ordered ? 'btn-success' : 'btn-primary'}`}
          disabled={!canAfford}
          onClick={handleOrder}
        >
          {ordered ? '✓ Ordered!' : 'Buy'}
        </button>
      </div>
    </div>
  )
}

export default function OrderPanel() {
  const ingredients = useGameStore(s => s.ingredients)
  const money = useGameStore(s => s.money)
  const purchaseIngredients = useGameStore(s => s.purchaseIngredients)
  const transactions = useGameStore(s => s.transactions)
  const dailyRevenue = useGameStore(s => s.dailyRevenue)
  const totalRevenue = useGameStore(s => s.totalRevenue)

  const [orderLog, setOrderLog] = useState<OrderLogEntry[]>([])

  function handleOrder(ingredientId: IngredientId, qty: number, totalCost: number) {
    purchaseIngredients(ingredientId, qty, totalCost)
    const ing = INGREDIENTS[ingredientId]
    setOrderLog(prev => [
      { id: Date.now(), text: `Ordered ${qty}× ${ing.name} for $${totalCost.toFixed(2)}` },
      ...prev.slice(0, 9),
    ])
  }

  const grouped = CATEGORY_ORDER
    .map(cat => ({ cat, items: Object.values(INGREDIENTS).filter(ing => ing.category === cat) }))
    .filter(group => group.items.length > 0)

  return (
    <div className="panel order-panel">
      <div className="panel-header">
        <h2 className="panel-title">🛒 Order Supplies</h2>
        <p className="panel-subtitle">Restock your pantry — bulk orders get a discount</p>
      </div>

      <div className="order-summary-bar">
        <div className="order-stat">
          <span className="order-stat-label">Balance</span>
          <span className="order-stat-value money">${money.toFixed(2)}</span>
        </div>
        <div className="order-stat">
          <span className="order-stat-label">Today's Revenue</span>
          <span className="order-stat-value revenue">+${dailyRevenue.toFixed(2)}</span>
        </div>
        <div className="order-stat">
          <span className="order-stat-label">Total Revenue</span>
          <span className="order-stat-value">+${(totalRevenue + dailyRevenue).toFixed(2)}</span>
        </div>
      </div>

      <div className="bulk-tip">
        <span className="bulk-tip-icon">💡</span>
        Buy <strong>10+</strong> units for 10% off &nbsp;|&nbsp; Buy <strong>20+</strong> units for 20% off
      </div>

      <div className="order-categories">
        {grouped.map(({ cat, items }) => {
          const { label, icon } = CATEGORY_LABELS[cat]
          return (
            <div key={cat} className="order-category">
              <h3 className="order-category-title">{icon} {label}</h3>
              <div className="order-rows">
                {items.map(ing => (
                  <OrderRow
                    key={ing.id}
                    ing={ing}
                    currentStock={ingredients[ing.id] || 0}
                    money={money}
                    onOrder={handleOrder}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {orderLog.length > 0 && (
        <div className="order-log">
          <h3 className="order-log-title">Recent Orders</h3>
          <ul className="order-log-list">
            {orderLog.map(entry => (
              <li key={entry.id} className="order-log-item">✓ {entry.text}</li>
            ))}
          </ul>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="transactions-log">
          <h3 className="transactions-title">☕ Sales Log (Today)</h3>
          <div className="transactions-list">
            {transactions.slice(0, 15).map((t, i) => {
              const h = Math.floor(t.time / 60)
              const m = Math.floor(t.time % 60)
              const ampm = h < 12 ? 'AM' : 'PM'
              const dh = h > 12 ? h - 12 : h === 0 ? 12 : h
              return (
                <div key={i} className="transaction-item">
                  <span className="t-time">{dh}:{m.toString().padStart(2,'0')} {ampm}</span>
                  <span className="t-name">{t.customerName}</span>
                  <span className="t-item">{t.itemName}</span>
                  <span className="t-amount">+${t.amount.toFixed(2)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
