import { useEffect, useRef } from 'react'

// Requests a screen wake lock while `active` is true, so the phone doesn't lock
// mid-hold when auto mode (or a long timed exercise) goes untouched past the
// display timeout. Browsers release the lock whenever the tab is hidden — e.g.
// the phone auto-locks once, or the user switches apps — so it's re-acquired on
// the next 'visibilitychange' back to visible. Feature-detected: does nothing on
// browsers without support (a locked phone is the same experience as today).
export function useWakeLock(active: boolean) {
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
