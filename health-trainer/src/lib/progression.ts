import type { Exercise } from '../data/program'

export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function daysBetween(startISO: string, endISO: string): number {
  const a = new Date(startISO + 'T00:00:00')
  const b = new Date(endISO + 'T00:00:00')
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000)
}

export function currentProgramWeek(startISO: string, today: string = todayISO()): number {
  return Math.max(1, Math.floor(daysBetween(startISO, today) / 7) + 1)
}

export function computeStreak(dates: string[], today: string = todayISO()): number {
  if (dates.length === 0) return 0
  const set = new Set(dates)
  const cursor = new Date(today + 'T00:00:00')
  if (!set.has(today)) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (set.has(todayISO(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// Every exercise's target is just its current working baseline — a flat number
// that only ever changes when you explicitly adjust it (+/- in-session). No ramp,
// no testing, no algorithm.
export interface ExerciseBaselineState {
  workingBaseline: number
}

export interface ResolvedTarget {
  target: number
}

export function resolveTarget(ex: Exercise, exState: ExerciseBaselineState | undefined): ResolvedTarget {
  return { target: Math.round(exState?.workingBaseline ?? ex.baseline) }
}

export function formatTargetString(ex: Exercise, target: number): string {
  switch (ex.kind) {
    case 'reps':
      return `${target} × ${ex.sets}`
    case 'timed':
      return `${target}s × ${ex.sets}`
    case 'per-side-reps':
      return `${target}/side × ${ex.sets}`
    case 'per-side-timed':
      return `${target}s/side × ${ex.sets}`
  }
}
