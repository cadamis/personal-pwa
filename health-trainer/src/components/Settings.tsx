import { useState } from 'react'
import { currentProgramWeek } from '../lib/progression'
import type { ProgressHook, SessionSettings } from '../state/useProgress'

interface Props {
  progress: ProgressHook
}

export default function Settings({ progress }: Props) {
  const { state, setProgramStart, updateSessionSettings, resetAll } = progress
  const week = currentProgramWeek(state.programStart)
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="px-5 pt-8">
      <h1 className="text-3xl font-semibold text-white">Settings</h1>

      <div className="mt-6 space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-medium text-slate-300">Program</h2>
          <p className="mt-1 text-xs text-slate-500">
            Started {state.programStart} · currently week {week}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="text-xs text-slate-400" htmlFor="start">
              Change start date
            </label>
            <input
              id="start"
              type="date"
              value={state.programStart}
              onChange={e => e.target.value && setProgramStart(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white"
            />
          </div>
        </div>

        <AutoModeCard sessionSettings={state.sessionSettings} onChange={updateSessionSettings} />

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-medium text-slate-300">Targets</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Every exercise's target is just a plain number — it only changes when you adjust it
            with the +/- buttons during a session. That adjustment becomes the new standard for
            that exercise immediately, including later rounds in the same session.
          </p>
        </div>

        <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-4">
          <h2 className="text-sm font-medium text-red-300">Reset all data</h2>
          <p className="mt-1 text-xs text-red-200/70">
            Clears completions, weight history, working baselines, and program start.
          </p>
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="mt-3 rounded-lg border border-red-800 px-3 py-1.5 text-sm text-red-200 hover:bg-red-900/30"
            >
              Reset…
            </button>
          ) : (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  resetAll()
                  setConfirming(false)
                }}
                className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-red-400"
              >
                Confirm reset
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className={`inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-emerald-500' : 'bg-slate-700'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

function AutoModeCard({
  sessionSettings,
  onChange,
}: {
  sessionSettings: SessionSettings
  onChange: (patch: Partial<SessionSettings>) => void
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="text-sm font-medium text-slate-300">Auto mode</h2>
      <p className="mt-1 text-xs text-slate-500">
        Circuit exercises auto-advance so you don't have to tap through each one.
      </p>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-slate-200">Auto-advance exercises</div>
          <div className="text-xs text-slate-500">Timed holds auto-start; reps use a timer below</div>
        </div>
        <ToggleSwitch
          checked={sessionSettings.autoMode}
          onChange={autoMode => onChange({ autoMode })}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-800 pt-3">
        <div>
          <div className="text-sm text-slate-200">Seconds per rep</div>
          <div className="text-xs text-slate-500">
            Sets each rep exercise's auto-advance time (target reps × this)
          </div>
        </div>
        <input
          type="number"
          inputMode="decimal"
          min={0.5}
          max={5}
          step={0.5}
          value={sessionSettings.secondsPerRep}
          onChange={e => {
            const n = parseFloat(e.target.value)
            if (!Number.isFinite(n) || n <= 0) return
            onChange({ secondsPerRep: Math.min(5, Math.max(0.5, n)) })
          }}
          className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-right text-sm text-white outline-none focus:border-emerald-500"
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-800 pt-3">
        <div>
          <div className="text-sm text-slate-200">Sound cues</div>
          <div className="text-xs text-slate-500">3-2-1 beeps + chime as a timed exercise ends</div>
        </div>
        <ToggleSwitch
          checked={sessionSettings.soundEnabled}
          onChange={soundEnabled => onChange({ soundEnabled })}
        />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Within a round, exercises flow straight into each other — no rest screen. Starting a new
        round always waits for you to tap continue, with no timer either way.
      </p>
    </div>
  )
}
