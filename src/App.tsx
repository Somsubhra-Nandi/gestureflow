export default function App() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">GestureFlow</h1>
        <button className="btn-primary">Train New Gesture</button>
      </header>
      <main className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <section className="panel aspect-video" />
        <section className="panel min-h-80" />
      </main>
      <section className="panel mt-5 min-h-40" />
    </div>
  )
}
