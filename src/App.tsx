import { useEffect, useRef, useState } from 'react'
import CameraPanel from './components/CameraPanel'
import GestureList from './components/GestureList'
import StatusPanel from './components/StatusPanel'
import TrainPanel, { type LatestFrame } from './components/TrainPanel'
import YouTubePanel, { type PlayerHandle } from './components/YouTubePanel'
import { ACTIONS, classify, DEFAULT_THRESHOLD, loadGestures, saveGestures, type Gesture, type Recognition } from './lib/gesture'
import { GestureTrigger, type TriggerPhase } from './lib/trigger'
import { useHandTracking } from './lib/useHandTracking'

const THRESHOLD_KEY = 'gestureflow.threshold'

function loadThreshold() {
  const v = Number(localStorage.getItem(THRESHOLD_KEY))
  return v > 0 ? v : DEFAULT_THRESHOLD
}

export default function App() {
  const [gestures, setGestures] = useState(loadGestures)
  const [threshold, setThreshold] = useState(loadThreshold)
  const [training, setTraining] = useState<{ initial?: Gesture } | null>(null)
  const [detectionOn, setDetectionOn] = useState(true)
  const [handVisible, setHandVisible] = useState(false)
  const [recognition, setRecognition] = useState<{ result: Recognition | null; phase: TriggerPhase; progress: number }>({
    result: null,
    phase: 'idle',
    progress: 0,
  })
  const [fired, setFired] = useState<{ gesture: Gesture; at: number } | null>(null)
  const playerRef = useRef<PlayerHandle>(null)
  const latest = useRef<LatestFrame>({ features: null, frame: 0 })
  const trigger = useRef(new GestureTrigger())

  const camera = useHandTracking(detectionOn || !!training, (features) => {
    latest.current = { features, frame: latest.current.frame + 1 }
    setHandVisible(features !== null)
    if (training || !detectionOn) return

    const result = features ? classify(features, gestures, threshold) : null
    const now = performance.now()
    const firedId = trigger.current.update(result?.match?.id ?? null, now)
    setRecognition({ result, ...trigger.current.status(now) })
    const gesture = firedId && gestures.find((g) => g.id === firedId)
    if (gesture) {
      playerRef.current?.run(gesture.action)
      setFired({ gesture, at: Date.now() })
    }
  })

  useEffect(() => saveGestures(gestures), [gestures])
  useEffect(() => localStorage.setItem(THRESHOLD_KEY, String(threshold)), [threshold])

  // Whenever the setup changes, require the hand to relax before anything can fire.
  useEffect(() => {
    trigger.current.reset(performance.now())
    setRecognition({ result: null, phase: 'idle', progress: 0 })
  }, [gestures, training, detectionOn])

  useEffect(() => {
    if (!fired) return
    const id = window.setTimeout(() => setFired(null), 1400)
    return () => window.clearTimeout(id)
  }, [fired])

  const startTraining = (initial?: Gesture) => {
    if (camera.status === 'idle') camera.start()
    setTraining({ initial })
  }

  const saveGesture = (g: Gesture) => {
    setGestures((gs) => (gs.some((x) => x.id === g.id) ? gs.map((x) => (x.id === g.id ? g : x)) : [...gs, g]))
    setTraining(null)
  }

  const deleteGesture = (g: Gesture) => {
    if (confirm(`Delete “${g.name}”?`)) setGestures((gs) => gs.filter((x) => x.id !== g.id))
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="size-9" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">GestureFlow</h1>
            <p className="text-xs text-zinc-500">Train your own hand gestures to control YouTube</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => startTraining()} disabled={!!training}>
          + Train New Gesture
        </button>
      </header>

      <main className="grid items-start gap-5 lg:grid-cols-[1.55fr_1fr]">
        <YouTubePanel
          ref={playerRef}
          overlay={
            fired && (
              <div
                key={fired.at}
                className="animate-toast pointer-events-none absolute top-1/2 left-1/2 flex items-center gap-3 rounded-2xl bg-zinc-950/80 px-6 py-4 shadow-2xl ring-1 ring-violet-400/40 backdrop-blur"
              >
                <span className="text-3xl">{ACTIONS[fired.gesture.action].icon}</span>
                <div>
                  <div className="font-semibold">{ACTIONS[fired.gesture.action].label}</div>
                  <div className="text-xs text-zinc-400">via “{fired.gesture.name}”</div>
                </div>
              </div>
            )
          }
        />
        <CameraPanel {...camera} handVisible={handVisible} onStart={camera.start}>
          {training ? (
            <TrainPanel
              key={training.initial?.id ?? 'new'}
              initial={training.initial}
              gestures={gestures}
              latest={latest}
              handVisible={handVisible}
              cameraReady={camera.status === 'running'}
              threshold={threshold}
              onSave={saveGesture}
              onCancel={() => setTraining(null)}
            />
          ) : (
            <StatusPanel
              enabled={detectionOn}
              onToggle={() => setDetectionOn((v) => !v)}
              hasGestures={gestures.length > 0}
              handVisible={handVisible}
              result={recognition.result}
              phase={recognition.phase}
              progress={recognition.progress}
              threshold={threshold}
              onThreshold={setThreshold}
            />
          )}
        </CameraPanel>
      </main>

      <GestureList
        gestures={gestures}
        matchedId={recognition.result?.match?.id ?? null}
        firedId={fired?.gesture.id ?? null}
        onRetrain={startTraining}
        onDelete={deleteGesture}
      />
    </div>
  )
}
