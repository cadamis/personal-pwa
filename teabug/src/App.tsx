import { useState } from 'react'
import HUD from './components/HUD'
import NavTabs from './components/NavTabs'
import type { TabId } from './components/NavTabs'
import GameCanvas from './components/GameCanvas'
import MenuSummary from './components/MenuSummary'
import InventoryPanel from './components/InventoryPanel'
import MenuPanel from './components/MenuPanel'
import OrderPanel from './components/OrderPanel'
import HelpPanel from './components/HelpPanel'
import { useGameStore } from './store/gameStore'
import { useWakeLock } from './lib/wakeLock'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('cafe')
  const resetSave = useGameStore(s => s.resetSave)
  const dayRunning = useGameStore(s => s.dayRunning)

  // A day runs for ten real minutes and is mostly watched, not tapped — keep
  // the tablet awake for its duration.
  useWakeLock(dayRunning)

  return (
    <div className="app">
      <HUD />
      <div className="app-body">
        <NavTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="app-main">
          <div className={`tab-panel ${activeTab === 'cafe' ? 'visible' : 'hidden'}`}>
            <GameCanvas />
            <MenuSummary />
          </div>
          <div className={`tab-panel ${activeTab === 'menu' ? 'visible' : 'hidden'}`}>
            <MenuPanel />
          </div>
          <div className={`tab-panel ${activeTab === 'inventory' ? 'visible' : 'hidden'}`}>
            <InventoryPanel />
          </div>
          <div className={`tab-panel ${activeTab === 'orders' ? 'visible' : 'hidden'}`}>
            <OrderPanel />
          </div>
          <div className={`tab-panel ${activeTab === 'help' ? 'visible' : 'hidden'}`}>
            <HelpPanel />
          </div>
        </main>
      </div>

      <footer className="app-footer">
        <span>Teabug Tea Room &copy; mmxxv</span>
        <button className="btn btn-ghost btn-tiny" onClick={() => {
          if (window.confirm('Reset all progress and start fresh?')) resetSave()
        }}>
          Reset Save
        </button>
      </footer>
    </div>
  )
}
