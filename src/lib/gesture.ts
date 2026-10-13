import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

export type Action = 'playPause' | 'forward' | 'backward'

export const ACTIONS: Record<Action, { label: string; icon: string }> = {
  playPause: { label: 'Play / Pause', icon: '⏯' },
  forward: { label: 'Skip +10s', icon: '⏩' },
  backward: { label: 'Skip −10s', icon: '⏪' },
}

export interface Gesture {
  id: string
  name: string
  action: Action
  samples: number[][]
  createdAt: number
}

/** Depth is noisier than x/y, so it counts for less in distances. */
const Z_WEIGHT = 0.5

/**
 * The single normalization pipeline used for BOTH training samples and live recognition.
 * Landmarks -> square pixel-proportional units -> translate so the wrist is the origin
 * -> divide by palm size. Output is a 63-dim vector that ignores where the hand is in the
 * frame and how far it is from the camera, but keeps orientation (thumbs up != thumbs down).
 */
export function toFeatures(landmarks: NormalizedLandmark[], aspect: number): number[] {
  // x is normalized by frame width and y by height; rescale x (and z, which shares x's scale).
  const pts = landmarks.map((p) => [p.x * aspect, p.y, p.z * aspect])
  const [wx, wy, wz] = pts[0]
  const rel = pts.map(([x, y, z]) => [x - wx, y - wy, z - wz])
  // Palm size: mean wrist distance to index, middle and pinky knuckles.
  const scale = ([5, 9, 17].reduce((s, i) => s + Math.hypot(...rel[i]), 0) / 3) || 1
  return rel.flatMap(([x, y, z]) => [x / scale, y / scale, (z / scale) * Z_WEIGHT])
}
