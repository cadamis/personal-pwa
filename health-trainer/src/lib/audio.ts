let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, startOffset: number, durationMs: number, gainPeak = 0.18) {
  const audioCtx = getContext()
  if (!audioCtx) return
  const startTime = audioCtx.currentTime + startOffset
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, startTime)
  gain.gain.exponentialRampToValueAtTime(gainPeak, startTime + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationMs / 1000)
  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.start(startTime)
  osc.stop(startTime + durationMs / 1000 + 0.02)
}

// Ensures the AudioContext is created and resumed well ahead of when a tick sound is
// actually needed. Mobile browsers auto-suspend an idle context after a period of
// silence, and resume() is asynchronous — calling it right at the "3 seconds left"
// mark makes that first tick audibly late compared to the next two. Call this as
// early as possible (e.g. when a countdown starts) to give it time to warm up.
export function primeAudio() {
  getContext()
}

export function playCountdownTick() {
  tone(880, 0, 90)
}

export function playRestOverChime() {
  tone(660, 0, 100)
  tone(990, 0.11, 160)
}
