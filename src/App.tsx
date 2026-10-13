import { useState } from 'react'
import CameraPanel from './components/CameraPanel'
import { useHandTracking } from './lib/useHandTracking'

export default function App() {
  const [handVisible, setHandVisible] = useState(false)
  const camera = useHandTracking(true, (features) => setHandVisible(features !== null))

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">GestureFlow</h1>
        <button className="btn-primary">Train New Gesture</button>
      </header>
      <main className="grid items-start gap-5 lg:grid-cols-[1.55fr_1fr]">
        <section className="panel aspect-video" />
        <CameraPanel {...camera} handVisible={handVisible} onStart={camera.start} />
      </main>
      <section className="panel mt-5 min-h-40" />
    </div>
  )
}
