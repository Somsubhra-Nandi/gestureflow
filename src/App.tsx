import { useEffect, useRef, useState } from 'react'
import CameraPanel from './components/CameraPanel'
import GestureList from './components/GestureList'
import TrainPanel, { type LatestFrame } from './components/TrainPanel'
import YouTubePanel, { type PlayerHandle } from './components/YouTubePanel'
import { loadGestures, saveGestures, type Gesture } from './lib/gesture'
import { useHandTracking } from './lib/useHandTracking'

const THRESHOLD = 0.7

export default function App() {
  const [gestures, setGestures] = useState(loadGestures)
  const [training, setTraining] = useState<{ initial?: Gesture } | null>(null)
  const [handVisible, setHandVisible] = useState(false)
  const playerRef = useRef<PlayerHandle>(null)
  const latest = useRef<LatestFrame>({ features: null, frame: 0 })

  const camera = useHandTracking(true, (features) => {
    latest.current = { features, frame: latest.current.frame + 1 }
    setHandVisible(features !== null)
  })

  useEffect(() => saveGestures(gestures), [gestures])

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
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">GestureFlow</h1>
        <button className="btn-primary" onClick={() => startTraining()} disabled={!!training}>
          Train New Gesture
        </button>
      </header>
      <main className="grid items-start gap-5 lg:grid-cols-[1.55fr_1fr]">
        <YouTubePanel ref={playerRef} />
        <CameraPanel {...camera} handVisible={handVisible} onStart={camera.start}>
          {training && (
            <TrainPanel
              key={training.initial?.id ?? 'new'}
              initial={training.initial}
              gestures={gestures}
              latest={latest}
              handVisible={handVisible}
              cameraReady={camera.status === 'running'}
              threshold={THRESHOLD}
              onSave={saveGesture}
              onCancel={() => setTraining(null)}
            />
          )}
        </CameraPanel>
      </main>
      <GestureList
        gestures={gestures}
        matchedId={null}
        firedId={null}
        onRetrain={startTraining}
        onDelete={deleteGesture}
      />
    </div>
  )
}
