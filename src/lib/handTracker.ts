import { HandLandmarker } from '@mediapipe/tasks-vision'
import wasmLoaderPath from '@mediapipe/tasks-vision/vision_wasm_internal.js?url'
import wasmBinaryPath from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url'

// The WASM runtime is bundled locally; only the model file is fetched from Google's CDN.
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

let landmarkerPromise: Promise<HandLandmarker> | null = null

function create(delegate: 'GPU' | 'CPU') {
  return HandLandmarker.createFromOptions(
    { wasmLoaderPath, wasmBinaryPath },
    {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.5,
    },
  )
}

/** Loads the hand landmarker once (GPU first, CPU fallback) and caches it. */
export function loadHandLandmarker(): Promise<HandLandmarker> {
  landmarkerPromise ??= create('GPU').catch(() => create('CPU'))
  landmarkerPromise.catch(() => (landmarkerPromise = null))
  return landmarkerPromise
}
