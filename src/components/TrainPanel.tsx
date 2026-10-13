import { useEffect, useMemo, useState, type RefObject } from 'react'
import Icon from './Icon'
import { ACTIONS, distance, type Action, type Gesture } from '../lib/gesture'

export interface LatestFrame {
  features: number[] | null
  frame: number
}

interface Props {
  initial?: Gesture
  gestures: Gesture[]
  latest: RefObject<LatestFrame>
  handVisible: boolean
  cameraReady: boolean
  threshold: number
  onSave: (gesture: Gesture) => void
  onCancel: () => void
}

const SAMPLE_COUNT = 40
const COUNTDOWN = 3

type Step = 'details' | 'countdown' | 'capturing' | 'review'

export default function TrainPanel({ initial, gestures, latest, handVisible, cameraReady, threshold, onSave, onCancel }: Props) {
  const [step, setStep] = useState<Step>('details')
  const [action, setAction] = useState<Action>(
    () => initial?.action ?? (Object.keys(ACTIONS) as Action[]).find((a) => !gestures.some((g) => g.action === a)) ?? 'playPause',
  )
  const [name, setName] = useState(initial?.name ?? '')
  const [count, setCount] = useState(COUNTDOWN)
  const [samples, setSamples] = useState<number[][]>([])

  useEffect(() => {
    if (step !== 'countdown') return
    let n = COUNTDOWN
    setCount(n)
    const id = window.setInterval(() => {
      n--
      if (n > 0) setCount(n)
      else setStep('capturing')
    }, 1000)
    return () => window.clearInterval(id)
  }, [step])

  // Collect one sample per new tracked frame. Frames without a hand are skipped, which pauses progress.
  useEffect(() => {
    if (step !== 'capturing') return
    const collected: number[][] = []
    let lastFrame = latest.current.frame
    setSamples([])
    const id = window.setInterval(() => {
      const { features, frame } = latest.current
      if (frame === lastFrame || !features) return
      lastFrame = frame
      collected.push(features)
      setSamples([...collected])
      if (collected.length >= SAMPLE_COUNT) {
        window.clearInterval(id)
        setStep('review')
      }
    }, 50)
    return () => window.clearInterval(id)
  }, [step, latest])

  // Warn when the new pose sits close to another saved gesture: those two would get confused.
  const closest = useMemo(() => {
    if (step !== 'review') return null
    const others = gestures.filter((g) => g.id !== initial?.id)
    let best: { name: string; d: number } | null = null
    for (const g of others) {
      const nearest = samples.map((s) => Math.min(...g.samples.map((t) => distance(s, t)))).sort((a, b) => a - b)
      const d = nearest[Math.floor(nearest.length / 2)]
      if (!best || d < best.d) best = { name: g.name, d }
    }
    return best
  }, [step, samples, gestures, initial])

  const save = () =>
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      action,
      samples,
      createdAt: Date.now(),
    })

  return (
    <div className="border-t border-white/[0.06] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{initial ? `Retrain “${initial.name}”` : 'Train a new gesture'}</h2>
        <button className="text-xs text-zinc-400 hover:text-white" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {step === 'details' && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            setStep('countdown')
          }}
        >
          <div>
            <Label n={1}>Choose an action</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(ACTIONS) as Action[]).map((a) => (
                <button
                  type="button"
                  key={a}
                  onClick={() => setAction(a)}
                  className={`rounded-xl px-2 py-2.5 text-xs font-medium ring-1 transition ${
                    action === a
                      ? 'bg-violet-500/15 text-violet-200 ring-violet-400/50'
                      : 'bg-white/[0.03] text-zinc-400 ring-white/[0.08] hover:text-zinc-200'
                  }`}
                >
                  <Icon name={a} className="mx-auto mb-1 block size-5" />
                  {ACTIONS[a].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label n={2}>Name the gesture</Label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="e.g. Open palm, Peace sign, Fist"
              className="w-full rounded-xl bg-white/[0.04] px-3 py-2 text-sm ring-1 ring-white/[0.08] outline-none placeholder:text-zinc-500 focus:ring-violet-400/60"
            />
          </div>
          <button className="btn-primary w-full" disabled={!name.trim() || !cameraReady}>
            {cameraReady ? 'Record pose →' : 'Waiting for camera…'}
          </button>
          <p className="text-xs text-zinc-500">
            Pick a static pose that's clearly different from your other gestures and from a relaxed hand.
          </p>
        </form>
      )}

      {step === 'countdown' && (
        <div className="py-3 text-center">
          <Label n={3}>Hold your pose in view</Label>
          <div key={count} className="text-5xl font-semibold text-violet-300 tabular-nums">
            {count}
          </div>
          <HandHint visible={handVisible} />
        </div>
      )}

      {step === 'capturing' && (
        <div className="py-2">
          <Label n={4}>Capturing samples</Label>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-[width] duration-100"
              style={{ width: `${(samples.length / SAMPLE_COUNT) * 100}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-zinc-400">
            <span>Shift slightly: a bit nearer, farther, small tilts.</span>
            <span className="font-mono">
              {samples.length}/{SAMPLE_COUNT}
            </span>
          </div>
          <HandHint visible={handVisible} />
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-3">
          <Label n={5}>Save and test</Label>
          <p className="text-sm text-emerald-300">✓ Captured {samples.length} samples.</p>
          {closest && closest.d < threshold && (
            <p className="rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-200 ring-1 ring-amber-400/20">
              This pose looks very similar to “{closest.name}” (distance {closest.d.toFixed(2)}). They may get confused. Try a
              more distinct pose.
            </p>
          )}
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={() => setStep('countdown')}>
              Re-record
            </button>
            <button className="btn-primary flex-1" onClick={save}>
              Save gesture
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Label({ n, children }: { n: number; children: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-400">
      <span className="flex size-5 items-center justify-center rounded-full bg-violet-500/20 text-[11px] text-violet-200">{n}</span>
      {children}
    </div>
  )
}

function HandHint({ visible }: { visible: boolean }) {
  return visible ? null : <p className="mt-2 text-center text-xs text-amber-300">No hand detected. Show your hand to the camera.</p>
}
