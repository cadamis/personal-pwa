import { EXERCISES, SESSIONS, type Exercise, type ExerciseId, type Session } from '../data/program'
import { computeStreak, currentProgramWeek, formatTargetString, resolveTarget, todayISO } from '../lib/progression'
import type { ProgressHook, ProgressState } from '../state/useProgress'

interface Props {
  progress: ProgressHook
  onStart: (id: string) => void
}

export default function Today({ progress, onStart }: Props) {
  const { state } = progress
  const week = currentProgramWeek(state.programStart)
  const today = todayISO()
  const doneToday = state.completions.filter(c => c.date === today)
  const streak = computeStreak(state.completions.map(c => c.date))
  const latestWeight = state.weightHistory.at(-1)

  const doneCount = doneToday.length
  const status =
    doneCount === 0
      ? 'Nothing yet — start with a 10-15 minute slice.'
      : doneCount === 1
      ? '1 slice done. Nice.'
      : `${doneCount} slices done. Great work.`

  return (
    <div className="px-5 pt-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Program week {week}</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">Today</h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
          <span>{status}</span>
          {streak > 1 && (
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
              {streak}-day streak
            </span>
          )}
        </p>
        {latestWeight && (
          <p className="mt-1 text-xs text-slate-500">
            Latest weight: {latestWeight.lbs} lbs ({latestWeight.date})
          </p>
        )}
      </header>

      <div className="space-y-3">
        {SESSIONS.map(s => (
          <SessionCard
            key={s.id}
            session={s}
            state={state}
            doneToday={doneToday.filter(c => c.sessionId === s.id).length}
            onStart={() => onStart(s.id)}
          />
        ))}
      </div>

      <WeightQuickLog progress={progress} />
    </div>
  )
}

function SessionCard({
  session,
  state,
  doneToday,
  onStart,
}: {
  session: Session
  state: ProgressState
  doneToday: number
  onStart: () => void
}) {
  const resolved = session.exerciseIds.map(id => ({
    id: id as ExerciseId,
    ex: EXERCISES[id as ExerciseId] as Exercise,
    info: resolveTarget(EXERCISES[id as ExerciseId] as Exercise, state.exerciseStates[id]),
  }))

  return (
    <button
      onClick={onStart}
      className="group w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left transition hover:border-emerald-500/40 hover:bg-slate-900"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-medium text-white">{session.title}</h3>
            {session.meetingSafe && (
              <span className="rounded bg-sky-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-sky-300">
                Meeting-safe
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-400">{session.subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-1 pt-0.5">
          <span className="text-xs text-slate-500">{session.minutes} min</span>
          {doneToday > 0 && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
              Done ×{doneToday}
            </span>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        {resolved.map(({ ex, info }, i) => (
          <span key={ex.id}>
            {i > 0 && <span className="text-slate-700"> · </span>}
            <span className="text-slate-300">{ex.name}</span>{' '}
            <span className="text-slate-500">{formatTargetString(ex, info.target)}</span>
          </span>
        ))}
      </p>
    </button>
  )
}

function WeightQuickLog({ progress }: { progress: ProgressHook }) {
  const latest = progress.state.weightHistory.at(-1)?.lbs ?? 170
  return (
    <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <h3 className="text-sm font-medium text-slate-300">Quick weight log</h3>
      <p className="mt-1 text-xs text-slate-500">Optional — records today's weight.</p>
      <form
        className="mt-3 flex gap-2"
        onSubmit={e => {
          e.preventDefault()
          const form = e.currentTarget
          const lbs = parseFloat((form.elements.namedItem('lbs') as HTMLInputElement).value)
          if (!Number.isFinite(lbs) || lbs <= 0) return
          progress.logWeight(lbs)
        }}
      >
        <input
          name="lbs"
          type="number"
          inputMode="decimal"
          step="0.1"
          defaultValue={latest}
          className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-emerald-500"
        />
        <button className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400">
          Log
        </button>
      </form>
    </div>
  )
}
