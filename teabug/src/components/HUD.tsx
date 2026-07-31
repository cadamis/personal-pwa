import { useGameStore } from '../store/gameStore'
import { GAME_CONFIG } from '../game/constants'

function formatGameTime(minutes: number): string {
  const totalMinutes = Math.floor(minutes)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  const ampm = h < 12 ? 'AM' : 'PM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`
}

function timeProgress(gameTime: number): number {
  const start = GAME_CONFIG.START_HOUR * 60
  const end = GAME_CONFIG.END_HOUR * 60
  return Math.min(1, Math.max(0, (gameTime - start) / (end - start)))
}

export default function HUD() {
  const gameTime = useGameStore(s => s.gameTime)
  const dayRunning = useGameStore(s => s.dayRunning)
  const dayEnded = useGameStore(s => s.dayEnded)
  const money = useGameStore(s => s.money)
  const dayCount = useGameStore(s => s.dayCount)
  const dailyRevenue = useGameStore(s => s.dailyRevenue)
  const customers = useGameStore(s => s.customers)
  const startDay = useGameStore(s => s.startDay)
  const pauseDay = useGameStore(s => s.pauseDay)
  const newDay = useGameStore(s => s.newDay)
  const transactions = useGameStore(s => s.transactions)

  const progress = timeProgress(gameTime)
  const activeCustomers = customers.filter(c => c.state !== 'gone' && c.state !== 'leaving').length

  return (
    <div className="hud">
      <div className="hud-left">
        <div className="hud-brand">
          <span className="brand-icon">🫖</span>
          <span className="brand-name">Teabug</span>
          <span className="brand-day">Day {dayCount}</span>
        </div>
      </div>

      <div className="hud-center">
        <div className="time-display">
          <span className="time-label">Time</span>
          <span className="time-value">{formatGameTime(gameTime)}</span>
        </div>
        <div className="time-bar-container" title={`${Math.round(progress * 100)}% through the day`}>
          <div className="time-bar-track">
            <div
              className="time-bar-fill"
              style={{ width: `${progress * 100}%` }}
            />
            {/* Hour markers */}
            {[9,10,11,12,13,14,15,16,17,18,19].map(h => {
              const pos = ((h * 60) - GAME_CONFIG.START_HOUR * 60) / ((GAME_CONFIG.END_HOUR - GAME_CONFIG.START_HOUR) * 60) * 100
              return <div key={h} className="time-bar-marker" style={{ left: `${pos}%` }} />
            })}
          </div>
          <div className="time-bar-labels">
            <span>8 AM</span>
            <span>12 PM</span>
            <span>8 PM</span>
          </div>
        </div>
      </div>

      <div className="hud-right">
        <div className="hud-stats">
          <div className="stat-box">
            <span className="stat-label">Balance</span>
            <span className="stat-value money">${money.toFixed(2)}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Today's Revenue</span>
            <span className="stat-value revenue">+${dailyRevenue.toFixed(2)}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Guests</span>
            <span className="stat-value">{activeCustomers}</span>
          </div>
        </div>

        <div className="hud-controls">
          {!dayRunning && !dayEnded && (
            <button className="btn btn-primary btn-open" onClick={startDay}>
              🌅 Open for the Day
            </button>
          )}
          {dayRunning && (
            <button className="btn btn-secondary" onClick={pauseDay}>
              ⏸ Pause
            </button>
          )}
          {!dayRunning && dayEnded && (
            <button className="btn btn-primary" onClick={newDay}>
              🌄 Start New Day
            </button>
          )}
          {dayRunning && (
            <button className="btn btn-ghost btn-small" onClick={pauseDay} style={{marginLeft: 4}}>
            </button>
          )}
        </div>
      </div>

      {dayEnded && transactions.length > 0 && (
        <div className="day-summary-banner">
          ☕ Day ended — Revenue: <strong>${dailyRevenue.toFixed(2)}</strong> &nbsp;|&nbsp; {transactions.length} orders served
        </div>
      )}
    </div>
  )
}
