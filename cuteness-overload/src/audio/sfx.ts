/**
 * Procedural sound effects.
 *
 * Synthesised with WebAudio rather than loaded as files — a handful of oscillator
 * blips is a few hundred bytes of code instead of a few hundred KB of audio, and
 * it keeps the "no binary assets" rule intact. The context is created lazily on
 * the first user gesture because mobile browsers refuse to start audio before
 * one.
 */

type Wave = OscillatorType

interface Blip {
  wave: Wave
  /** Start and end frequency in Hz; the pitch slides between them. */
  from: number
  to: number
  /** Seconds. */
  duration: number
  gain: number
  /** Delay before this blip, in seconds, for little arpeggios. */
  at?: number
}

const SOUNDS: Record<string, Blip[]> = {
  pop: [{ wave: 'triangle', from: 720, to: 1080, duration: 0.06, gain: 0.1 }],
  squish: [
    { wave: 'sine', from: 420, to: 120, duration: 0.14, gain: 0.14 },
    { wave: 'triangle', from: 900, to: 300, duration: 0.09, gain: 0.07 },
  ],
  coin: [
    { wave: 'square', from: 1180, to: 1180, duration: 0.05, gain: 0.06 },
    { wave: 'square', from: 1560, to: 1560, duration: 0.08, gain: 0.06, at: 0.05 },
  ],
  heart: [{ wave: 'sine', from: 880, to: 1320, duration: 0.07, gain: 0.05 }],
  snack: [
    { wave: 'triangle', from: 520, to: 780, duration: 0.09, gain: 0.1 },
    { wave: 'sine', from: 780, to: 1040, duration: 0.12, gain: 0.08, at: 0.08 },
  ],
  levelup: [
    { wave: 'triangle', from: 660, to: 660, duration: 0.1, gain: 0.11 },
    { wave: 'triangle', from: 880, to: 880, duration: 0.1, gain: 0.11, at: 0.09 },
    { wave: 'triangle', from: 1170, to: 1170, duration: 0.16, gain: 0.12, at: 0.18 },
  ],
  hurt: [
    { wave: 'sawtooth', from: 300, to: 90, duration: 0.2, gain: 0.13 },
    { wave: 'square', from: 180, to: 70, duration: 0.16, gain: 0.07, at: 0.03 },
  ],
  tap: [{ wave: 'triangle', from: 520, to: 700, duration: 0.05, gain: 0.09 }],
  boss: [
    { wave: 'sawtooth', from: 140, to: 90, duration: 0.5, gain: 0.13 },
    { wave: 'square', from: 70, to: 60, duration: 0.7, gain: 0.09, at: 0.1 },
  ],
  win: [
    { wave: 'triangle', from: 660, to: 660, duration: 0.12, gain: 0.12 },
    { wave: 'triangle', from: 830, to: 830, duration: 0.12, gain: 0.12, at: 0.12 },
    { wave: 'triangle', from: 990, to: 990, duration: 0.12, gain: 0.12, at: 0.24 },
    { wave: 'triangle', from: 1320, to: 1320, duration: 0.32, gain: 0.14, at: 0.36 },
  ],
  lose: [
    { wave: 'triangle', from: 520, to: 500, duration: 0.18, gain: 0.11 },
    { wave: 'triangle', from: 420, to: 400, duration: 0.18, gain: 0.11, at: 0.18 },
    { wave: 'sine', from: 320, to: 180, duration: 0.5, gain: 0.12, at: 0.36 },
  ],
}

export type SoundName = keyof typeof SOUNDS

class Sfx {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private muted = false
  /** Stops a burst of 30 simultaneous hits turning into a wall of noise. */
  private lastPlayed = new Map<string, number>()

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.01)
    }
  }

  get isMuted(): boolean {
    return this.muted
  }

  /** Call from a pointer/key handler so mobile browsers allow audio. */
  unlock(): void {
    const ctx = this.ensure()
    if (ctx && ctx.state === 'suspended') void ctx.resume()
  }

  play(name: SoundName, throttleMs = 40): void {
    if (this.muted) return
    const ctx = this.ensure()
    if (!ctx || !this.master) return

    const now = ctx.currentTime
    const last = this.lastPlayed.get(name) ?? -1
    if (now - last < throttleMs / 1000) return
    this.lastPlayed.set(name, now)

    for (const blip of SOUNDS[name]) {
      const start = now + (blip.at ?? 0)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = blip.wave
      osc.frequency.setValueAtTime(blip.from, start)
      if (blip.to !== blip.from) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, blip.to), start + blip.duration)
      }
      // Quick attack, exponential decay — reads as "cute blip" rather than "beep".
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(blip.gain, start + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + blip.duration)
      osc.connect(gain).connect(this.master)
      osc.start(start)
      osc.stop(start + blip.duration + 0.02)
    }
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx
    try {
      this.ctx = new AudioContext()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 1
      this.master.connect(this.ctx.destination)
      return this.ctx
    } catch {
      return null // No audio available; the game is still perfectly playable.
    }
  }
}

export const sfx = new Sfx()
