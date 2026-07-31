import { useEffect, useMemo, useRef, useState } from 'react'
import {
  EXERCISES,
  SESSIONS,
  type Exercise,
  type ExerciseId,
  type Session,
} from '../data/program'
import { resolveTarget } from '../lib/progression'
import { playCountdownTick, playRestOverChime, primeAudio } from '../lib/audio'
import { useWakeLock } from '../lib/wakeLock'
import type { ExerciseResult, ProgressHook, SessionSettings, SetResult } from '../state/useProgress'

interface Props {
  sessionId: string
  progress: ProgressHook
  onExit: () => void
}

interface ExerciseStep {
  kind: 'exercise'
  exerciseId: ExerciseId
  setIndex: number
  totalSets: number
  target: number
  ex: Exercise
}

// A timed rest countdown — only used for sequence-format sessions (mobility/micro),
// which keep their per-pose breather regardless of auto mode.
interface RestStep {
  kind: 'rest'
  seconds: number
  nextExerciseName: string
}

// A manual "tap to continue" screen with no timer — circuits always pause here
// between rounds, in both auto and manual mode.
interface ReadyStep {
  kind: 'ready'
  nextExerciseName: string
  roundTransition: { newRound: number; totalRounds: number }
}

type PlanStep = ExerciseStep | RestStep | ReadyStep

function buildPlan(
  session: Session,
  states: ProgressHook['state']['exerciseStates'],
): PlanStep[] {
  return session.format === 'circuit' ? buildCircuitPlan(session, states) : buildSequencePlan(session, states)
}

function buildCircuitPlan(
  session: Session,
  states: ProgressHook['state']['exerciseStates'],
): PlanStep[] {
  const resolved = session.exerciseIds.map(id => {
    const ex = EXERCISES[id as ExerciseId]
    const info = resolveTarget(ex, states[id])
    return { id: id as ExerciseId, ex, info }
  })
  const totalRounds = Math.max(...resolved.map(r => r.ex.sets))

  const exSteps: ExerciseStep[] = []
  for (let round = 0; round < totalRounds; round++) {
    for (const { id, ex, info } of resolved) {
      if (round >= ex.sets) continue
      exSteps.push({
        kind: 'exercise',
        exerciseId: id,
        setIndex: round,
        totalSets: ex.sets,
        target: info.target,
        ex,
      })
    }
  }

  const plan: PlanStep[] = []
  for (let i = 0; i < exSteps.length; i++) {
    const step = exSteps[i]
    if (!step) continue
    const prev = exSteps[i - 1]
    if (prev && step.setIndex > prev.setIndex) {
      plan.push({
        kind: 'ready',
        nextExerciseName: step.ex.name,
        roundTransition: { newRound: step.setIndex + 1, totalRounds },
      })
    }
    plan.push(step)
  }
  return plan
}

function buildSequencePlan(
  session: Session,
  states: ProgressHook['state']['exerciseStates'],
): PlanStep[] {
  const exSteps: ExerciseStep[] = []
  for (const id of session.exerciseIds) {
    const ex = EXERCISES[id as ExerciseId]
    const info = resolveTarget(ex, states[id])
    for (let i = 0; i < ex.sets; i++) {
      exSteps.push({
        kind: 'exercise',
        exerciseId: id as ExerciseId,
        setIndex: i,
        totalSets: ex.sets,
        target: info.target,
        ex,
      })
    }
  }

  const plan: PlanStep[] = []
  for (let i = 0; i < exSteps.length; i++) {
    const step = exSteps[i]
    if (!step) continue
    plan.push(step)
    const next = exSteps[i + 1]
    if (!next) continue
    const restSeconds = step.ex.restSeconds
    if (restSeconds > 0) {
      plan.push({ kind: 'rest', seconds: restSeconds, nextExerciseName: next.ex.name })
    }
  }
  return plan
}

export default function SessionPlayer({ sessionId, progress, onExit }: Props) {
  const session = SESSIONS.find(s => s.id === sessionId)

  const plan = useMemo<PlanStep[]>(() => {
    if (!session) return []
    return buildPlan(session, progress.state.exerciseStates)
  }, [session, progress.state.exerciseStates])

  const totalExerciseSteps = useMemo(
    () => plan.filter(s => s.kind === 'exercise').length,
    [plan],
  )

  const [stepIdx, setStepIdx] = useState(0)
  const [results, setResults] = useState<Record<string, SetResult[]>>({})

  // Prime the AudioContext as soon as each step appears, well before any countdown on
  // it reaches its last 3 seconds — an idle context auto-suspends between exercises,
  // and resuming it takes real time.
  useEffect(() => {
    if (progress.state.sessionSettings.soundEnabled) primeAudio()
  }, [stepIdx, progress.state.sessionSettings.soundEnabled])

  // Keep the screen awake for the whole session — otherwise the phone's display
  // timeout kicks in mid-hold, which defeats auto mode's hands-free point.
  useWakeLock(true)

  if (!session) {
    return (
      <div className="p-6 text-slate-300">
        Unknown session.
        <button className="ml-2 underline" onClick={onExit}>Back</button>
      </div>
    )
  }

  const step = plan[stepIdx]

  if (!step) {
    const exerciseResults: ExerciseResult[] = Object.entries(results).map(([exerciseId, sets]) => ({
      exerciseId,
      sets,
    }))
    return (
      <SessionSummary
        title={session.title}
        results={exerciseResults}
        onSave={() => {
          progress.recordCompletion({ sessionId: session.id, results: exerciseResults })
          onExit()
        }}
        onCancel={onExit}
      />
    )
  }

  const finishExercise = (achieved: number) => {
    if (step.kind !== 'exercise') return
    setResults(r => {
      const key = step.exerciseId
      const prior = r[key] ?? []
      return {
        ...r,
        [key]: [...prior, { setIndex: step.setIndex, achieved, target: step.target }],
      }
    })
    setStepIdx(i => i + 1)
  }

  const advance = () => setStepIdx(i => i + 1)

  const doneExCount = plan.slice(0, stepIdx).filter(s => s.kind === 'exercise').length
  const exOrdinal = doneExCount + 1

  return (
    <div className="px-5 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <button onClick={onExit} className="text-sm text-slate-400 hover:text-white">
          ← Back
        </button>
        <span className="text-xs text-slate-500">
          Exercise {exOrdinal} / {totalExerciseSteps}
        </span>
      </header>

      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{session.title}</p>

      {step.kind === 'exercise' ? (
        <ExerciseView
          key={stepIdx}
          step={step}
          onComplete={finishExercise}
          format={session.format}
          sessionSettings={progress.state.sessionSettings}
          onAdjustBaseline={n => progress.setWorkingBaseline(step.exerciseId, n)}
        />
      ) : step.kind === 'rest' ? (
        <RestView
          key={stepIdx}
          step={step}
          onDone={advance}
          soundEnabled={progress.state.sessionSettings.soundEnabled}
        />
      ) : (
        <ReadyView key={stepIdx} step={step} onContinue={advance} />
      )}

      <SessionMeter plan={plan} stepIdx={stepIdx} />
    </div>
  )
}

function ExerciseView({
  step,
  onComplete,
  format,
  sessionSettings,
  onAdjustBaseline,
}: {
  step: ExerciseStep
  onComplete: (n: number) => void
  format: Session['format']
  sessionSettings: SessionSettings
  onAdjustBaseline: (n: number) => void
}) {
  const setLabel = format === 'circuit' ? 'Round' : 'Set'
  return (
    <>
      <h2 className="mt-1 text-2xl font-semibold text-white">{step.ex.name}</h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">{step.ex.cue}</p>
      <p className="mt-1 text-xs text-slate-500">
        {setLabel} {step.setIndex + 1} of {step.totalSets}
      </p>

      <div className="mt-6">
        <ExerciseInterface
          step={step}
          onComplete={onComplete}
          sessionSettings={sessionSettings}
          onAdjustBaseline={onAdjustBaseline}
        />
      </div>
    </>
  )
}

function ReadyView({ step, onContinue }: { step: ReadyStep; onContinue: () => void }) {
  return (
    <>
      <h2 className="mt-1 text-2xl font-semibold text-white">Round {step.roundTransition.newRound}</h2>
      <p className="mt-2 text-sm text-slate-400">
        Next up <span className="text-slate-200">{step.nextExerciseName}</span> — round{' '}
        {step.roundTransition.newRound} of {step.roundTransition.totalRounds}
      </p>
      <div className="mt-6">
        <button
          onClick={onContinue}
          className="w-full rounded-2xl bg-emerald-500 px-6 py-4 text-lg font-semibold text-slate-950 hover:bg-emerald-400"
        >
          Start round {step.roundTransition.newRound}
        </button>
      </div>
    </>
  )
}

function RestView({
  step,
  onDone,
  soundEnabled,
}: {
  step: RestStep
  onDone: () => void
  soundEnabled: boolean
}) {
  return (
    <>
      <h2 className="mt-1 text-2xl font-semibold text-white">Rest</h2>
      <p className="mt-2 text-sm text-slate-400">
        Next up <span className="text-slate-200">{step.nextExerciseName}</span>
      </p>
      <div className="mt-6">
        <RestTimer seconds={step.seconds} soundEnabled={soundEnabled} onDone={onDone} />
      </div>
    </>
  )
}

const COUNTDOWN_TICK_THRESHOLD = 3

function RestTimer({
  seconds,
  soundEnabled,
  onDone,
}: {
  seconds: number
  soundEnabled: boolean
  onDone: () => void
}) {
  const [remaining, setRemaining] = useState(seconds)
  const [running, setRunning] = useState(true)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (running && intervalRef.current == null) {
      intervalRef.current = window.setInterval(() => {
        setRemaining(r => Math.max(0, r - 1))
      }, 1000)
    }
    if (!running && intervalRef.current != null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => {
      if (intervalRef.current != null) clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [running])

  useEffect(() => {
    if (!soundEnabled || !running) return
    if (remaining > 0 && remaining <= COUNTDOWN_TICK_THRESHOLD) {
      playCountdownTick()
    } else if (remaining === 0) {
      playRestOverChime()
    }
  }, [remaining, running, soundEnabled])

  useEffect(() => {
    if (remaining === 0 && running) {
      setRunning(false)
      onDone()
    }
  }, [remaining, running, onDone])

  const pct = remaining / seconds

  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
      <TimerRing pct={pct} color="rgb(148 163 184)">
        <div className="text-5xl font-semibold tabular-nums text-white">{remaining}</div>
        <div className="text-xs uppercase tracking-[0.15em] text-slate-500">seconds rest</div>
      </TimerRing>
      <div className="flex w-full gap-3">
        <button
          onClick={() => setRunning(r => !r)}
          className="flex-1 rounded-2xl border border-slate-700 px-6 py-4 text-sm text-slate-300 hover:border-slate-500"
        >
          {running ? 'Pause' : 'Resume'}
        </button>
        <button
          onClick={onDone}
          className="rounded-2xl bg-emerald-500 px-6 py-4 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
        >
          Skip rest
        </button>
      </div>
    </div>
  )
}

function ExerciseInterface({
  step,
  onComplete,
  sessionSettings,
  onAdjustBaseline,
}: {
  step: ExerciseStep
  onComplete: (n: number) => void
  sessionSettings: SessionSettings
  onAdjustBaseline: (n: number) => void
}) {
  const timed = step.ex.kind === 'timed' || step.ex.kind === 'per-side-timed'
  const perSide = step.ex.kind === 'per-side-reps' || step.ex.kind === 'per-side-timed'
  const autoMode = sessionSettings.autoMode

  if (timed) {
    return (
      <TimedExercise
        seconds={step.target}
        perSide={perSide}
        autoStart={autoMode}
        soundEnabled={sessionSettings.soundEnabled}
        onComplete={onComplete}
        onAdjustBaseline={onAdjustBaseline}
      />
    )
  }
  if (autoMode) {
    const duration = Math.max(
      3,
      Math.round(step.target * sessionSettings.secondsPerRep * (perSide ? 2 : 1)),
    )
    return (
      <AutoRepsExercise
        target={step.target}
        perSide={perSide}
        seconds={duration}
        soundEnabled={sessionSettings.soundEnabled}
        onComplete={onComplete}
        onAdjustBaseline={onAdjustBaseline}
      />
    )
  }
  return (
    <RepsExercise
      target={step.target}
      perSide={perSide}
      onComplete={onComplete}
      onAdjustBaseline={onAdjustBaseline}
    />
  )
}

function RepsExercise({
  target,
  perSide,
  onComplete,
  onAdjustBaseline,
}: {
  target: number
  perSide: boolean
  onComplete: (n: number) => void
  onAdjustBaseline: (n: number) => void
}) {
  const [n, setN] = useState(target)
  const adjust = (delta: number) => {
    setN(v => {
      const next = Math.max(0, v + delta)
      onAdjustBaseline(next)
      return next
    })
  }
  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="text-center">
        <div className="text-6xl font-semibold tabular-nums text-white">{n}</div>
        <div className="mt-1 text-xs uppercase tracking-[0.15em] text-slate-500">
          {perSide ? 'reps per side' : 'reps'}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <RoundButton onClick={() => adjust(-1)} aria-label="Decrease">−</RoundButton>
        <RoundButton onClick={() => adjust(1)} aria-label="Increase">+</RoundButton>
      </div>
      <button
        onClick={() => onComplete(n)}
        className="w-full rounded-2xl bg-emerald-500 px-6 py-4 text-lg font-semibold text-slate-950 hover:bg-emerald-400"
      >
        Set complete
      </button>
    </div>
  )
}

// Auto-mode reps: same editable counter as RepsExercise, but a background timer
// (target reps × seconds-per-rep) auto-advances so nothing needs to be tapped mid-circuit.
// A manual "Done" tap still works if you finish early.
function AutoRepsExercise({
  target,
  perSide,
  seconds,
  soundEnabled,
  onComplete,
  onAdjustBaseline,
}: {
  target: number
  perSide: boolean
  seconds: number
  soundEnabled: boolean
  onComplete: (n: number) => void
  onAdjustBaseline: (n: number) => void
}) {
  const [n, setN] = useState(target)
  const [remaining, setRemaining] = useState(seconds)
  const nRef = useRef(n)
  nRef.current = n
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const id = window.setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!soundEnabled) return
    if (remaining > 0 && remaining <= COUNTDOWN_TICK_THRESHOLD) playCountdownTick()
  }, [remaining, soundEnabled])

  useEffect(() => {
    if (remaining === 0) {
      if (soundEnabled) playRestOverChime()
      onCompleteRef.current(nRef.current)
    }
  }, [remaining, soundEnabled])

  const adjust = (delta: number) => {
    setN(v => {
      const next = Math.max(0, v + delta)
      onAdjustBaseline(next)
      return next
    })
  }

  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="text-center">
        <div className="text-6xl font-semibold tabular-nums text-white">{n}</div>
        <div className="mt-1 text-xs uppercase tracking-[0.15em] text-slate-500">
          {perSide ? 'reps per side' : 'reps'}
        </div>
        <div className="mt-2 text-xs text-emerald-400">next exercise in {remaining}s</div>
      </div>
      <div className="flex items-center gap-3">
        <RoundButton onClick={() => adjust(-1)} aria-label="Decrease">−</RoundButton>
        <RoundButton onClick={() => adjust(1)} aria-label="Increase">+</RoundButton>
      </div>
      <button
        onClick={() => onComplete(n)}
        className="w-full rounded-2xl bg-emerald-500 px-6 py-4 text-lg font-semibold text-slate-950 hover:bg-emerald-400"
      >
        Done ({n})
      </button>
    </div>
  )
}

const MIN_ADJUSTABLE_SECONDS = 5
const TIME_ADJUST_STEP = 5

// A countdown from the target — same in both modes; auto mode just starts it
// automatically and manual mode waits for a tap. Hitting zero always logs the
// full target and advances (no confirmation step in either mode, matching how
// reps' "Set complete" and auto-mode's timer both just move on when you're done).
function TimedExercise({
  seconds,
  perSide,
  autoStart = false,
  soundEnabled = false,
  onComplete,
  onAdjustBaseline,
}: {
  seconds: number
  perSide: boolean
  autoStart?: boolean
  soundEnabled?: boolean
  onComplete: (achievedSeconds: number) => void
  onAdjustBaseline: (seconds: number) => void
}) {
  // `target` is the adjustable hold duration (per side); `seconds` is just its initial value.
  const [target, setTarget] = useState(seconds)
  const [remaining, setRemaining] = useState(seconds)
  const [running, setRunning] = useState(autoStart)
  const [side, setSide] = useState<'left' | 'right' | null>(perSide ? 'left' : null)
  const intervalRef = useRef<number | null>(null)
  // Tracks the latest target synchronously so back-to-back taps (faster than a
  // render cycle) each add/subtract from the real current value, not a stale one.
  const targetRef = useRef(target)

  useEffect(() => {
    if (running && intervalRef.current == null) {
      intervalRef.current = window.setInterval(() => {
        setRemaining(r => Math.max(0, r - 1))
      }, 1000)
    }
    if (!running && intervalRef.current != null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => {
      if (intervalRef.current != null) clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [running])

  useEffect(() => {
    if (!soundEnabled || !running) return
    if (remaining > 0 && remaining <= COUNTDOWN_TICK_THRESHOLD) playCountdownTick()
  }, [remaining, running, soundEnabled])

  useEffect(() => {
    if (remaining === 0 && running) {
      if (soundEnabled) playRestOverChime()
      setRunning(false)
      if (perSide && side === 'left') {
        setSide('right')
        setRemaining(target)
        setRunning(autoStart)
      } else {
        onComplete(perSide ? target * 2 : target)
      }
    }
  }, [remaining, running, perSide, side, target, onComplete, soundEnabled, autoStart])

  const adjust = (delta: number) => {
    const next = Math.max(MIN_ADJUSTABLE_SECONDS, targetRef.current + delta)
    targetRef.current = next
    setTarget(next)
    setRemaining(next)
    onAdjustBaseline(next)
  }

  const pct = remaining / target

  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <TimerRing pct={pct} color="rgb(52 211 153)">
        <div className="text-5xl font-semibold tabular-nums text-white">{remaining}</div>
        <div className="text-xs uppercase tracking-[0.15em] text-slate-500">seconds</div>
        {perSide && side && (
          <div className="mt-1 text-xs font-medium text-emerald-400">
            {side === 'left' ? 'LEFT' : 'RIGHT'} side
          </div>
        )}
      </TimerRing>

      {!running && (
        <div className="flex items-center gap-3">
          <RoundButton onClick={() => adjust(-TIME_ADJUST_STEP)} aria-label="Decrease hold time">
            −
          </RoundButton>
          <span className="w-20 text-center text-xs text-slate-500">adjust hold</span>
          <RoundButton onClick={() => adjust(TIME_ADJUST_STEP)} aria-label="Increase hold time">
            +
          </RoundButton>
        </div>
      )}

      <div className="flex w-full gap-3">
        <button
          onClick={() => {
            if (remaining === 0) setRemaining(target)
            setRunning(r => !r)
          }}
          className="flex-1 rounded-2xl bg-emerald-500 px-6 py-4 text-lg font-semibold text-slate-950 hover:bg-emerald-400"
        >
          {running ? 'Pause' : remaining === 0 ? 'Restart' : 'Start'}
        </button>
        <button
          onClick={() => onComplete(target - remaining)}
          className="rounded-2xl border border-slate-700 px-4 py-4 text-sm text-slate-300 hover:border-slate-500"
        >
          Skip
        </button>
      </div>
    </div>
  )
}

function TimerRing({
  pct,
  color,
  children,
}: {
  pct: number
  color: string
  children: React.ReactNode
}) {
  return (
    <div className="relative h-48 w-48">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="rgb(30 41 59)" strokeWidth="6" />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={`${2 * Math.PI * 45}`}
          strokeDashoffset={`${2 * Math.PI * 45 * (1 - pct)}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

function RoundButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, ...rest } = props
  return (
    <button
      {...rest}
      className={`flex h-14 w-14 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-2xl text-white transition hover:border-emerald-500 ${className ?? ''}`}
    />
  )
}

function SessionMeter({ plan, stepIdx }: { plan: PlanStep[]; stepIdx: number }) {
  const exSteps = plan.filter((s): s is ExerciseStep => s.kind === 'exercise')
  const doneExCount = plan.slice(0, stepIdx).filter(s => s.kind === 'exercise').length
  const currentStep = plan[stepIdx]
  const onExercise = currentStep?.kind === 'exercise'
  return (
    <div className="mt-8 flex items-center gap-1">
      {exSteps.map((_, i) => {
        const done = i < doneExCount
        const upcoming = i === doneExCount
        const cls = done
          ? 'bg-emerald-500'
          : upcoming
          ? onExercise
            ? 'bg-emerald-500/50'
            : 'bg-emerald-500/25'
          : 'bg-slate-800'
        return <div key={i} className={`h-1.5 flex-1 rounded-full ${cls}`} />
      })}
    </div>
  )
}

function SessionSummary({
  title,
  results,
  onSave,
  onCancel,
}: {
  title: string
  results: ExerciseResult[]
  onSave: () => void
  onCancel: () => void
}) {
  const totalSets = results.reduce((n, r) => n + r.sets.length, 0)

  return (
    <div className="px-5 pt-8">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Session done</p>
      <h1 className="mt-1 text-3xl font-semibold text-white">Nice work</h1>
      <p className="mt-2 text-sm text-slate-400">
        {title} · {totalSets} sets
      </p>

      <div className="mt-6 space-y-3">
        {results.map(r => {
          const ex = EXERCISES[r.exerciseId as ExerciseId]
          return (
            <div key={r.exerciseId} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="font-medium text-white">{ex?.name ?? r.exerciseId}</h3>
                <span className="text-xs text-slate-500">target {r.sets[0]?.target}</span>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                {r.sets.map(s => s.achieved).join(' · ')}
              </p>
            </div>
          )
        })}
      </div>

      <div className="mt-8 flex gap-3">
        <button
          onClick={onSave}
          className="flex-1 rounded-2xl bg-emerald-500 px-6 py-4 text-lg font-semibold text-slate-950 hover:bg-emerald-400"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="rounded-2xl border border-slate-700 px-6 py-4 text-slate-300 hover:border-slate-500"
        >
          Discard
        </button>
      </div>
    </div>
  )
}
