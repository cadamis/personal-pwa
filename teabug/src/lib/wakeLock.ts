import { useEffect, useRef } from 'react'

// Holds a screen wake lock while `active` is true. A game day runs for ten real
// minutes and is mostly watched rather than tapped, so without this the tablet
// dims and locks mid-service.
//
// Browsers release the lock whenever the tab is hidden, so it's re-acquired on
// the next return to visibility. Feature-detected: on browsers without support
// this does nothing, which is simply today's behaviour.
export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let cancelled = false

    const request = async () => {
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          sentinel.release()
          return
        }
        // Clear our handle when the browser drops the lock on its own,
        // otherwise the visibility handler below thinks one is still held and
        // never re-requests.
        sentinel.addEventListener('release', () => {
          if (sentinelRef.current === sentinel) sentinelRef.current = null
        })
        sentinelRef.current = sentinel
      } catch {
        // Rejected (power-save mode, low battery, etc.) — nothing to do.
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && sentinelRef.current === null) {
        request()
      }
    }

    request()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      sentinelRef.current?.release()
      sentinelRef.current = null
    }
  }, [active])
}
