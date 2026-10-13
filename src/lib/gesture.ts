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

export function distance(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2
  return Math.sqrt(sum)
}

export const DEFAULT_THRESHOLD = 0.7
const K = 5
const MIN_VOTE_SHARE = 0.6
/** Nearest gesture must be clearly closer than the runner-up (Lowe-style ratio test). */
const MAX_RATIO = 0.85

export interface Recognition {
  match: Gesture | null // accepted gesture, or null if rejected
  nearest: Gesture // closest gesture regardless of acceptance
  distance: number // distance to the nearest gesture's closest sample
  voteShare: number // share of the k nearest samples belonging to `nearest`
  ratio: number // distance / runner-up gesture's distance (0 if only one gesture)
  reason: string // why the match was rejected, '' if accepted
  ranking: { gesture: Gesture; distance: number }[]
}

/** k-NN over every stored sample, with distance, vote and ratio gates. */
export function classify(features: number[], gestures: Gesture[], threshold: number): Recognition | null {
  const neighbors: { gesture: Gesture; d: number }[] = []
  for (const gesture of gestures) for (const s of gesture.samples) neighbors.push({ gesture, d: distance(features, s) })
  if (neighbors.length === 0) return null
  neighbors.sort((a, b) => a.d - b.d)

  const ranking = gestures
    .map((gesture) => ({ gesture, distance: neighbors.find((n) => n.gesture === gesture)!.d }))
    .sort((a, b) => a.distance - b.distance)
  const nearest = ranking[0].gesture
  const knn = neighbors.slice(0, K)
  const voteShare = knn.filter((n) => n.gesture === nearest).length / knn.length
  const d = ranking[0].distance
  const ratio = ranking[1] ? d / ranking[1].distance : 0

  let reason = ''
  if (d > threshold) reason = 'No saved gesture is close enough'
  else if (voteShare < MIN_VOTE_SHARE) reason = 'Neighbors disagree'
  else if (ratio > MAX_RATIO) reason = `Too similar to “${ranking[1].gesture.name}”`

  return { match: reason ? null : nearest, nearest, distance: d, voteShare, ratio, reason, ranking }
}

const STORAGE_KEY = 'gestureflow.gestures.v1'
const FEATURE_LENGTH = 21 * 3

export function loadGestures(): Gesture[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (g: Gesture) =>
        typeof g?.id === 'string' &&
        g.action in ACTIONS &&
        Array.isArray(g.samples) &&
        g.samples.length > 0 &&
        g.samples.every((s) => Array.isArray(s) && s.length === FEATURE_LENGTH),
    )
  } catch {
    return []
  }
}

export function saveGestures(gestures: Gesture[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gestures))
  } catch {
    // Storage full or disabled: gestures still work for this session.
  }
}
