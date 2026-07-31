import { useGameStore } from '../store/gameStore'

const TABS = [
  { id: 'cafe',      label: 'Café',           icon: '🏠' },
  { id: 'menu',      label: 'Menu & Prep',    icon: '📋' },
  { id: 'inventory', label: 'Inventory',      icon: '📦' },
  { id: 'orders',    label: 'Order Supplies', icon: '🛒' },
  { id: 'help',      label: 'Help',           icon: '📖' },
] as const

/** The tabs the app can show — derived from TABS so the two can't drift. */
export type TabId = (typeof TABS)[number]['id']

export default function NavTabs({ activeTab, onTabChange }: {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}) {
  const lowIngredients = useGameStore(s => {
    return Object.values(s.ingredients).filter(qty => qty <= 5).length
  })
  const outOfStock = useGameStore(s => s.menuItems.filter(m => m.stocked === 0).length)

  return (
    <nav className="nav-tabs">
      {TABS.map(tab => {
        const badge = tab.id === 'inventory' && lowIngredients > 0 ? lowIngredients
          : tab.id === 'menu' && outOfStock > 0 ? outOfStock
          : 0
        return (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="nav-tab-icon">{tab.icon}</span>
            <span className="nav-tab-label">{tab.label}</span>
            {badge > 0 && <span className="nav-badge">{badge}</span>}
          </button>
        )
      })}
    </nav>
  )
}
