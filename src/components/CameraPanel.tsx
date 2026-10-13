import type { ReactNode, RefObject } from 'react'
import type { CameraStatus } from '../lib/useHandTracking'

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  status: CameraStatus
  error: string
  fps: number
  handVisible: boolean
  onStart: () => void
  children?: ReactNode
}

export default function CameraPanel({ videoRef, canvasRef, status, error, fps, handVisible, onStart, children }: Props) {
  const running = status === 'running'
  return (
    <section className="panel flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] bg-black">
        {/* Mirrored for a natural selfie view; recognition uses the raw (unmirrored) landmarks. */}
        <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />

        {running ? (
          <div className="absolute left-3 top-3 flex gap-2 font-mono text-[11px]">
            <span className={`rounded-md px-2 py-1 backdrop-blur ${handVisible ? 'bg-emerald-500/20 text-emerald-300' : 'bg-black/50 text-zinc-400'}`}>
              {handVisible ? '● hand' : '○ no hand'}
            </span>
            <span className="rounded-md bg-black/50 px-2 py-1 text-zinc-400 backdrop-blur">{fps} fps</span>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/90 p-6 text-center">
            {status === 'denied' ? (
              <>
                <p className="font-medium text-rose-300">Camera access was blocked</p>
                <p className="max-w-xs text-sm text-zinc-400">
                  Allow camera access from the site settings in your browser's address bar, then try again.
                </p>
              </>
            ) : status === 'error' ? (
              <>
                <p className="font-medium text-rose-300">Camera unavailable</p>
                <p className="max-w-xs text-sm text-zinc-400">{error}</p>
              </>
            ) : (
              <>
                <p className="font-medium">Enable your camera</p>
                <p className="max-w-xs text-sm text-zinc-400">
                  Video is processed locally in your browser. Nothing is uploaded or stored.
                </p>
              </>
            )}
            <button className="btn-primary mt-1" onClick={onStart} disabled={status === 'starting'}>
              {status === 'starting' ? 'Starting…' : status === 'idle' ? 'Enable camera' : 'Try again'}
            </button>
          </div>
        )}
      </div>
      {children}
    </section>
  )
}
