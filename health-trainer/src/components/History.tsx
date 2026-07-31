import { SESSIONS, findExercise } from '../data/program'
import { currentProgramWeek } from '../lib/progression'
import type { Completion, ProgressHook } from '../state/useProgress'

interface Props {
  progress: ProgressHook
}

export default function History({ progress }: Props) {
  const { completions, weightHistory, programStart } = progress.state
  const byDate = new Map<string, Completion[]>()
  for (const c of completions) {
    const list = byDate.get(c.date) ?? []
    list.push(c)
    byDate.set(c.date, list)
  }
  const dates = [...byDate.keys()].sort((a, b) => b.localeCompare(a))

  return (
    <div className="px-5 pt-8">
      <h1 className="text-3xl font-semibold text-white">History</h1>
      <p className="mt-2 text-sm text-slate-400">
        {completions.length} session{completions.length === 1 ? '' : 's'} recorded.
      </p>

      {weightHistory.length > 0 && <WeightChart entries={weightHistory} />}

      {completions.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">No sessions yet. Start on the Today tab.</p>
      )}

      <div className="mt-6 space-y-4">
        {dates.map(date => (
          <div key={date}>
            <h2 className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {date} · Week {currentProgramWeek(programStart, date)}
            </h2>
            <div className="mt-2 space-y-2">
              {byDate.get(date)!.map(c => {
                const s = SESSIONS.find(s => s.id === c.sessionId)
                return (
                  <div key={c.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                    <h3 className="font-medium text-white">{s?.title ?? c.sessionId}</h3>
                    <ul className="mt-2 space-y-1 text-sm text-slate-400">
                      {c.results.map(r => {
                        const ex = findExercise(r.exerciseId)
                        return (
                          <li key={r.exerciseId} className="flex flex-wrap items-baseline gap-2">
                            <span className="text-slate-300">{ex?.name ?? r.exerciseId}:</span>
                            <span className="tabular-nums">
                              {r.sets.map(set => set.achieved).join(' · ')}
                            </span>
                            <span className="text-xs text-slate-600">
                              (target {r.sets[0]?.target})
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function WeightChart({ entries }: { entries: { date: string; lbs: number }[] }) {
  const recent = entries.slice(-30)
  const min = Math.min(...recent.map(e => e.lbs))
  const max = Math.max(...recent.map(e => e.lbs))
  const range = Math.max(1, max - min)
  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-slate-300">Weight</h2>
        <span className="text-xs text-slate-500">
          {recent[0]?.lbs} → {recent.at(-1)?.lbs} lbs
        </span>
      </div>
      <div className="mt-3 flex items-end gap-1 overflow-x-auto pb-2">
        {recent.map((w, i) => {
          const h = 24 + ((w.lbs - min) / range) * 56
          return (
            <div key={i} className="flex min-w-6 flex-col items-center gap-1">
              <div
                className="w-3 rounded-t bg-emerald-500"
                style={{ height: `${h}px` }}
                title={`${w.lbs} lbs on ${w.date}`}
              />
              <span className="text-[9px] text-slate-500">{w.date.slice(5)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
