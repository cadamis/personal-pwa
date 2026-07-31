import { useCallback, useEffect, useState } from 'react'
import { EXERCISES } from '../data/program'
import { todayISO, type ExerciseBaselineState } from '../lib/progression'

export interface SetResult {
  setIndex: number
  achieved: number
  target: number
}

export interface ExerciseResult {
  exerciseId: string
  sets: SetResult[]
}

export interface Completion {
  id: string
  completedAt: string
  date: string
  sessionId: string
  results: ExerciseResult[]
}

export interface WeightEntry {
  date: string
  lbs: number
}

export interface SessionSettings {
  autoMode: boolean
  secondsPerRep: number
  soundEnabled: boolean
}

export interface ProgressState {
  version: 2
  programStart: string
  weightHistory: WeightEntry[]
  completions: Completion[]
  exerciseStates: Record<string, ExerciseBaselineState>
  sessionSettings: SessionSettings
}

const KEY = 'health-trainer-state'

export const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  autoMode: false,
  secondsPerRep: 2,
  soundEnabled: true,
}

function buildExerciseStates(): Record<string, ExerciseBaselineState> {
  const out: Record<string, ExerciseBaselineState> = {}
  for (const ex of Object.values(EXERCISES)) {
    out[ex.id] = { workingBaseline: ex.baseline }
  }
  return out
}

// Additive backfill for existing saves made before some exercise had persisted
// state — never overwrites an existing entry, only fills gaps.
function ensureAllExerciseStates(
  existing: Record<string, ExerciseBaselineState>,
): Record<string, ExerciseBaselineState> {
  const out = { ...existing }
  for (const ex of Object.values(EXERCISES)) {
    if (!out[ex.id]) out[ex.id] = { workingBaseline: ex.baseline }
  }
  return out
}

const initialState = (): ProgressState => ({
  version: 2,
  programStart: todayISO(),
  weightHistory: [],
  completions: [],
  exerciseStates: buildExerciseStates(),
  sessionSettings: DEFAULT_SESSION_SETTINGS,
})

// v1 -> v2: replaced fixed rest-timer durations (betweenExercises/betweenRounds/beforeAmrap)
// with auto-mode pacing settings. Preserves all real workout data; only reshapes settings.
// Exercise baselines carry over as-is — any stray AMRAP-era fields (lastAmrapDate,
// lastAmrapResult) just sit unused in storage, harmless.
function migrate(raw: unknown): ProgressState {
  if (!raw || typeof raw !== 'object') return initialState()
  const anyRaw = raw as Record<string, unknown>
  if (anyRaw.version === 2) return raw as ProgressState
  const oldRestSettings = anyRaw.restSettings as { soundEnabled?: boolean } | undefined
  return {
    version: 2,
    programStart: (anyRaw.programStart as string) ?? todayISO(),
    weightHistory: (anyRaw.weightHistory as WeightEntry[]) ?? [],
    completions: (anyRaw.completions as Completion[]) ?? [],
    exerciseStates: (anyRaw.exerciseStates as Record<string, ExerciseBaselineState>) ?? {},
    sessionSettings: {
      ...DEFAULT_SESSION_SETTINGS,
      soundEnabled: oldRestSettings?.soundEnabled ?? DEFAULT_SESSION_SETTINGS.soundEnabled,
    },
  }
}

function load(): ProgressState {
  if (typeof localStorage === 'undefined') return initialState()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return initialState()
    const state = migrate(JSON.parse(raw))
    return { ...state, exerciseStates: ensureAllExerciseStates(state.exerciseStates) }
  } catch {
    return initialState()
  }
}

export function useProgress() {
  const [state, setState] = useState<ProgressState>(load)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state))
  }, [state])

  const recordCompletion = useCallback(
    (draft: { sessionId: string; results: ExerciseResult[] }) => {
      const now = new Date()
      const iso = now.toISOString()
      const dateISO = todayISO(now)
      setState(s => ({
        ...s,
        completions: [
          ...s.completions,
          {
            id: iso + '-' + Math.random().toString(36).slice(2, 8),
            completedAt: iso,
            date: dateISO,
            sessionId: draft.sessionId,
            results: draft.results,
          },
        ],
      }))
    },
    [],
  )

  const logWeight = useCallback((lbs: number) => {
    setState(s => {
      const date = todayISO()
      const rest = s.weightHistory.filter(w => w.date !== date)
      const next = [...rest, { date, lbs }].sort((a, b) => a.date.localeCompare(b.date))
      return { ...s, weightHistory: next }
    })
  }, [])

  const setProgramStart = useCallback((iso: string) => {
    setState(s => ({ ...s, programStart: iso }))
  }, [])

  const updateSessionSettings = useCallback((patch: Partial<SessionSettings>) => {
    setState(s => ({ ...s, sessionSettings: { ...s.sessionSettings, ...patch } }))
  }, [])

  const setWorkingBaseline = useCallback((exerciseId: string, workingBaseline: number) => {
    setState(s => ({
      ...s,
      exerciseStates: {
        ...s.exerciseStates,
        [exerciseId]: { workingBaseline },
      },
    }))
  }, [])

  const resetAll = useCallback(() => {
    setState(initialState())
  }, [])

  return {
    state,
    recordCompletion,
    logWeight,
    setProgramStart,
    updateSessionSettings,
    setWorkingBaseline,
    resetAll,
  }
}

export type ProgressHook = ReturnType<typeof useProgress>
