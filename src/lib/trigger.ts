/** A gesture must be recognized continuously for this long before it fires. */
export const HOLD_MS = 300
/** After firing, the hand must leave that gesture for this long before anything can fire again. */
export const RELEASE_MS = 300
/** Minimum time between any two actions. */
export const COOLDOWN_MS = 1200

const ANY = '*'

export type TriggerPhase = 'idle' | 'holding' | 'locked' | 'cooldown'

/**
 * Turns a noisy per-frame label stream into discrete, one-shot actions:
 * hold for HOLD_MS -> fire once -> stay latched until released -> global cooldown.
 */
export class GestureTrigger {
  private candidate: string | null = null
  private since = 0
  private latched: string | null = null
  private lastSeen = 0
  private lastFire = -Infinity

  /** Re-arm only after the hand relaxes, so whatever pose is being held right now can't fire. */
  reset(now: number) {
    this.candidate = null
    this.latched = ANY
    this.lastSeen = now
  }

  /** Feed the current frame's accepted gesture id (or null). Returns the id that fired, if any. */
  update(id: string | null, now: number): string | null {
    if (id !== this.candidate) {
      this.candidate = id
      this.since = now
    }
    if (this.latched) {
      if (id && (this.latched === ANY || id === this.latched)) {
        this.lastSeen = now
        return null
      }
      if (now - this.lastSeen < RELEASE_MS) return null
      this.latched = null
    }
    if (!id || now - this.since < HOLD_MS || now - this.lastFire < COOLDOWN_MS) return null
    this.latched = id
    this.lastSeen = now
    this.lastFire = now
    return id
  }

  status(now: number): { phase: TriggerPhase; progress: number } {
    if (this.latched) return { phase: 'locked', progress: 1 }
    if (now - this.lastFire < COOLDOWN_MS) return { phase: 'cooldown', progress: (now - this.lastFire) / COOLDOWN_MS }
    if (this.candidate) return { phase: 'holding', progress: Math.min(1, (now - this.since) / HOLD_MS) }
    return { phase: 'idle', progress: 0 }
  }
}
