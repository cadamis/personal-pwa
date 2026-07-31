import { useEffect, useState } from 'react'
import Today from './components/Today'
import SessionPlayer from './components/SessionPlayer'
import History from './components/History'
import Settings from './components/Settings'
import { useProgress } from './state/useProgress'

type Route =
  | { name: 'today' }
  | { name: 'session'; id: string }
  | { name: 'history' }
  | { name: 'settings' }

function parseHash(): Route {
  const h = location.hash.replace(/^#/, '')
  if (h.startsWith('session/')) return { name: 'session', id: h.slice('session/'.length) }
  if (h === 'history') return { name: 'history' }
  if (h === 'settings') return { name: 'settings' }
  return { name: 'today' }
}

function useHashRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(parseHash)
  useEffect(() => {
    const onHash = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const go = (r: Route) => {
    const hash =
      r.name === 'today' ? '' :
      r.name === 'session' ? `session/${r.id}` :
      r.name
    if (location.hash.replace(/^#/, '') === hash) return
    location.hash = hash
  }
  return [route, go]
}

export default function App() {
  const [route, go] = useHashRoute()
  const progress = useProgress()

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <main className="flex-1 pb-28">
        {route.name === 'today' && (
          <Today progress={progress} onStart={id => go({ name: 'session', id })} />
        )}
        {route.name === 'session' && (
          <SessionPlayer
            key={route.id}
            sessionId={route.id}
            progress={progress}
            onExit={() => go({ name: 'today' })}
          />
        )}
        {route.name === 'history' && <History progress={progress} />}
        {route.name === 'settings' && <Settings progress={progress} />}
      </main>
      <TabBar route={route} go={go} />
    </div>
  )
}

const TABS: { key: 'today' | 'history' | 'settings'; label: string; icon: React.ReactNode }[] = [
  { key: 'today', label: 'Today', icon: <IconSun /> },
  { key: 'history', label: 'History', icon: <IconChart /> },
  { key: 'settings', label: 'Settings', icon: <IconGear /> },
]

function TabBar({ route, go }: { route: Route; go: (r: Route) => void }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md items-stretch justify-around border-t border-slate-800 bg-slate-950/95 backdrop-blur"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.25rem)' }}
    >
      {TABS.map(t => {
        const active = route.name === t.key
        return (
          <button
            key={t.key}
            onClick={() => go({ name: t.key })}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
              active ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="h-5 w-5">{t.icon}</span>
            {t.label}
          </button>
        )
      })}
    </nav>
  )
}

function IconSun() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
    </svg>
  )
}
function IconChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 3 3 5-6" />
    </svg>
  )
}
function IconGear() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  )
}
