/**
 * Keeps the screen awake while a run is in progress, so the tablet doesn't dim
 * during a quiet moment.
 *
 * Browsers release the lock whenever the tab is hidden, so it's re-acquired on
 * the next 'visibilitychange' back to visible — without that, the lock silently
 * stops working the first time the player switches apps. Feature-detected: on
 * browsers without support this does nothing at all.
 */
export class WakeLock {
  private sentinel: WakeLockSentinel | null = null
  private wanted = false
  private readonly onVisibilityChange = (): void => {
    if (this.wanted && document.visibilityState === 'visible' && this.sentinel === null) {
      void this.request()
    }
  }

  acquire(): void {
    if (this.wanted || !('wakeLock' in navigator)) return
    this.wanted = true
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    void this.request()
  }

  release(): void {
    if (!this.wanted) return
    this.wanted = false
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    void this.sentinel?.release()
    this.sentinel = null
  }

  private async request(): Promise<void> {
    try {
      const sentinel = await navigator.wakeLock.request('screen')
      if (!this.wanted) {
        void sentinel.release()
        return
      }
      // Clear our handle when the browser drops the lock on its own, otherwise
      // the visibility handler thinks one is still held and never re-requests.
      sentinel.addEventListener('release', () => {
        if (this.sentinel === sentinel) this.sentinel = null
      })
      this.sentinel = sentinel
    } catch {
      // Rejected (power saving, low battery) — nothing to do, the game plays on.
    }
  }
}

export const wakeLock = new WakeLock()
