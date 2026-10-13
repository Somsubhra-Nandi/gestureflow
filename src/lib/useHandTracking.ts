import { DrawingUtils, HandLandmarker } from '@mediapipe/tasks-vision'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toFeatures } from './gesture'
import { loadHandLandmarker } from './handTracker'

export type CameraStatus = 'idle' | 'starting' | 'running' | 'denied' | 'error'

/**
 * Owns the webcam stream and the per-frame detection loop. Frames never leave the browser.
 * `onFrame` receives normalized features for the detected hand, or null when no hand is visible.
 */
export function useHandTracking(active: boolean, onFrame: (features: number[] | null) => void) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const landmarkerRef = useRef<HandLandmarker | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const onFrameRef = useRef(onFrame)
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [error, setError] = useState('')
  const [fps, setFps] = useState(0)

  useEffect(() => {
    onFrameRef.current = onFrame
  })

  const fail = (message: string) => {
    setStatus('error')
    setError(message)
  }

  const start = useCallback(async () => {
    setStatus('starting')
    setError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      return fail('Camera API unavailable. Open the app on localhost or HTTPS in a modern browser.')
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      })
    } catch (e) {
      const name = (e as DOMException).name
      if (name === 'NotAllowedError' || name === 'SecurityError') return setStatus('denied')
      if (name === 'NotFoundError') return fail('No camera found.')
      if (name === 'NotReadableError') return fail('The camera is in use by another application.')
      return fail(String(e))
    }
    streamRef.current = stream
    stream.getVideoTracks()[0]?.addEventListener('ended', () => fail('The camera was disconnected.'))
    const video = videoRef.current!
    video.srcObject = stream
    await video.play().catch(() => {})
    try {
      landmarkerRef.current = await loadHandLandmarker()
    } catch {
      return fail('Could not load the hand-tracking model. Check your connection and retry.')
    }
    setStatus('running')
  }, [])

  // Release the camera on unmount.
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), [])

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const landmarker = landmarkerRef.current
    if (status !== 'running' || !active || !video || !canvas || !landmarker) return
    const ctx = canvas.getContext('2d')!
    const draw = new DrawingUtils(ctx)
    let raf = 0
    let lastVideoTime = -1
    let frames = 0
    let fpsStart = performance.now()

    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (video.readyState < 2 || video.currentTime === lastVideoTime) return
      lastVideoTime = video.currentTime
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }
      const result = landmarker.detectForVideo(video, performance.now())
      const hand = result.landmarks[0]
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (hand) {
        draw.drawConnectors(hand, HandLandmarker.HAND_CONNECTIONS, { color: '#a78bfa', lineWidth: 3 })
        draw.drawLandmarks(hand, { color: '#22d3ee', fillColor: '#083344', radius: 3.5, lineWidth: 1.5 })
      }
      onFrameRef.current(hand ? toFeatures(hand, video.videoWidth / video.videoHeight) : null)

      frames++
      const now = performance.now()
      if (now - fpsStart >= 1000) {
        setFps(Math.round((frames * 1000) / (now - fpsStart)))
        frames = 0
        fpsStart = now
      }
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      onFrameRef.current(null)
      setFps(0)
    }
  }, [status, active])

  return { videoRef, canvasRef, status, error, fps, start }
}
