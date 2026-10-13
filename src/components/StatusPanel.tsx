import Icon from './Icon'
import { ACTIONS, type Recognition } from '../lib/gesture'
import type { TriggerPhase } from '../lib/trigger'

interface Props {
  enabled: boolean
  onToggle: () => void
  hasGestures: boolean
  handVisible: boolean
  result: Recognition | null
  phase: TriggerPhase
  progress: number
  threshold: number
  onThreshold: (value: number) => void
}

const PHASE_TEXT: Record<TriggerPhase, string> = {
  idle: 'Armed',
  holding: 'Hold steady…',
  locked: 'Release your hand to re-arm',
  cooldown: 'Cooling down',
}

export default function StatusPanel(p: Props) {
  const { result } = p
  const match = result?.match ?? null

  return (
    <div className="space-y-4 border-t border-white/[0.06] p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Recognition</h2>
        <button
          onClick={p.onToggle}
          className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200"
          role="switch"
          aria-checked={p.enabled}
        >
          {p.enabled ? 'Detection on' : 'Detection off'}
          <span className={`relative h-5 w-9 rounded-full transition ${p.enabled ? 'bg-violet-500' : 'bg-zinc-700'}`}>
            <span className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${p.enabled ? 'left-4.5' : 'left-0.5'}`} />
          </span>
        </button>
      </div>

      <div className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/[0.06]">
        {!p.enabled ? (
          <span className="text-sm text-zinc-500">Gesture detection is paused.</span>
        ) : !p.hasGestures ? (
          <span className="text-sm text-zinc-500">Train a gesture to start controlling the video.</span>
        ) : !p.handVisible ? (
          <span className="text-sm text-zinc-500">Show your hand to the camera.</span>
        ) : match ? (
          <>
            <div className="min-w-0">
              <div className="truncate font-semibold text-violet-200">{match.name}</div>
              <div className="text-xs text-zinc-400">{PHASE_TEXT[p.phase]}</div>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 text-sm text-zinc-300">
              <Icon name={match.action} /> {ACTIONS[match.action].label}
            </span>
          </>
        ) : (
          <div>
            <div className="font-medium text-zinc-400">Unknown pose</div>
            <div className="text-xs text-zinc-500">{result?.reason}</div>
          </div>
        )}
      </div>

      {p.enabled && p.hasGestures && (
        <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={`h-full rounded-full ${p.phase === 'locked' ? 'bg-emerald-400' : p.phase === 'cooldown' ? 'bg-zinc-500' : 'bg-violet-400'}`}
            style={{ width: `${p.progress * 100}%` }}
          />
        </div>
      )}

      <details className="group text-xs">
        <summary className="cursor-pointer list-none text-zinc-500 select-none hover:text-zinc-300">
          <span className="inline-block transition group-open:rotate-90">›</span> Tuning &amp; distances
        </summary>
        <div className="mt-3 space-y-3 font-mono">
          <label className="flex items-center gap-3">
            <span className="w-24 text-zinc-400">threshold</span>
            <input
              type="range"
              min={0.2}
              max={3}
              step={0.05}
              value={p.threshold}
              onChange={(e) => p.onThreshold(Number(e.target.value))}
              className="flex-1 accent-violet-500"
            />
            <span className="w-10 text-right text-zinc-200">{p.threshold.toFixed(2)}</span>
          </label>
          {result ? (
            <>
              <div className="space-y-1.5">
                {result.ranking.map(({ gesture, distance }) => (
                  <div key={gesture.id} className="flex items-center gap-3">
                    <span className="w-24 truncate text-zinc-400">{gesture.name}</span>
                    <div className="relative h-1.5 flex-1 rounded-full bg-white/[0.06]">
                      {/* Bar scale: threshold sits at the midpoint marker. Shorter = closer match. */}
                      <div
                        className={`h-full rounded-full ${distance <= p.threshold ? 'bg-emerald-400' : 'bg-zinc-600'}`}
                        style={{ width: `${Math.min(1, distance / (p.threshold * 2)) * 100}%` }}
                      />
                      <div className="absolute inset-y-[-3px] left-1/2 w-px bg-zinc-400" />
                    </div>
                    <span className="w-10 text-right text-zinc-200">{distance.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>votes {Math.round(result.voteShare * 100)}%</span>
                <span>ratio {result.ratio.toFixed(2)}</span>
                <span>{result.match ? 'accepted' : 'rejected'}</span>
              </div>
            </>
          ) : (
            <p className="text-zinc-500">Distances appear here while a hand is visible.</p>
          )}
          <p className="font-sans text-zinc-500">
            Accept when distance ≤ threshold, votes ≥ 60% and ratio ≤ 0.85. Lower the threshold if relaxed hands trigger
            actions; raise it if your gesture shows as unknown.
          </p>
        </div>
      </details>
    </div>
  )
}
