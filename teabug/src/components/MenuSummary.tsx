import { useGameStore } from '../store/gameStore'
import { MENU_CATEGORIES } from '../game/constants'

const CATEGORY_ICON = {
  [MENU_CATEGORIES.HOT_TEA]:   '☕',
  [MENU_CATEGORIES.ICED_TEA]:  '🧋',
  [MENU_CATEGORIES.SPECIALTY]: '🫖',
  [MENU_CATEGORIES.PASTRY]:    '🫓',
  [MENU_CATEGORIES.SWEET]:     '🍪',
}

function stockClass(stocked: number): string {
  if (stocked === 0)  return 'empty'
  if (stocked <= 2)   return 'low'
  return 'ok'
}

export default function MenuSummary() {
  const menuItems = useGameStore(s => s.menuItems)

  const outCount = menuItems.filter(m => m.stocked === 0).length
  const lowCount = menuItems.filter(m => m.stocked > 0 && m.stocked <= 2).length

  return (
    <div className="menu-summary">
      <div className="menu-summary-header">
        <span className="menu-summary-title">Menu Availability</span>
        <div className="menu-summary-alerts">
          {outCount > 0 && (
            <span className="summary-alert alert-empty">{outCount} out of stock</span>
          )}
          {lowCount > 0 && (
            <span className="summary-alert alert-low">{lowCount} running low</span>
          )}
          {outCount === 0 && lowCount === 0 && (
            <span className="summary-alert alert-ok">All items stocked</span>
          )}
        </div>
      </div>

      <div className="menu-summary-grid">
        {menuItems.map(item => {
          const cls = stockClass(item.stocked)
          return (
            <div key={item.id} className={`summary-item stock-indicator ${cls}`} title={`${item.name} — ${item.stocked} left`}>
              <span className="summary-item-emoji">{item.emoji}</span>
              <div className="summary-item-info">
                <span className="summary-item-name">{item.name}</span>
                <span className="summary-item-price">${item.price.toFixed(2)}</span>
              </div>
              <span className="summary-item-stock">
                <span className="stock-count">{item.stocked}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
