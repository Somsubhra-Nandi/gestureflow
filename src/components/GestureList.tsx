import Icon from './Icon'
import { ACTIONS, type Gesture } from '../lib/gesture'

interface Props {
  gestures: Gesture[]
  matchedId: string | null
  firedId: string | null
  onRetrain: (gesture: Gesture) => void
  onDelete: (gesture: Gesture) => void
}

export default function GestureList({ gestures, matchedId, firedId, onRetrain, onDelete }: Props) {
  return (
    <section className="panel mt-5 p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-semibold">Saved gestures</h2>
        <span className="text-xs text-zinc-500">Stored locally in this browser</span>
      </div>

      {gestures.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-400">
          No gestures yet. Train two distinct poses, for example an <b className="text-zinc-200">open palm</b> for Play/Pause
          and a <b className="text-zinc-200">peace sign</b> for Skip +10s.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {gestures.map((g) => {
            const fired = g.id === firedId
            const matched = g.id === matchedId
            return (
              <div
                key={g.id}
                className={`group rounded-xl bg-white/[0.03] p-4 ring-1 transition duration-300 ${
                  fired
                    ? 'bg-emerald-400/10 ring-emerald-400/60'
                    : matched
                      ? 'ring-violet-400/50'
                      : 'ring-white/[0.06] hover:ring-white/[0.12]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{g.name}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">{g.samples.length} samples</div>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-500/10 px-2 py-1 text-xs text-violet-200 ring-1 ring-violet-400/20">
                    <Icon name={g.action} className="size-3.5" /> {ACTIONS[g.action].label}
                  </span>
                </div>
                <div className="mt-3 flex gap-3 text-xs text-zinc-500">
                  <button className="hover:text-zinc-200" onClick={() => onRetrain(g)}>
                    Retrain
                  </button>
                  <button className="hover:text-rose-300" onClick={() => onDelete(g)}>
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
