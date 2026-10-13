import { useEffect, useImperativeHandle, useRef, useState, type FormEvent, type ReactNode, type Ref } from 'react'
import Icon from './Icon'
import type { Action } from '../lib/gesture'
import { loadYouTubeApi, parseVideoId } from '../lib/youtube'

export interface PlayerHandle {
  run: (action: Action) => string | undefined
}

// Big Buck Bunny by the Blender Foundation (CC-BY, embeddable).
const DEFAULT_VIDEO = 'aqz-KE-bpKQ'
const SKIP_SECONDS = 10
const VOLUME_STEP = 10

const PLAYER_ERRORS: Record<number, string> = {
  2: 'Invalid video ID.',
  5: 'This video cannot be played in an HTML5 player.',
  100: 'Video not found or private.',
  101: 'The owner does not allow this video to be embedded.',
  150: 'The owner does not allow this video to be embedded.',
}

export default function YouTubePanel({ ref, overlay }: { ref: Ref<PlayerHandle>; overlay?: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YT.Player | null>(null)
  const blockTimer = useRef(0)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [error, setError] = useState('')
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState('')

  useEffect(() => {
    let cancelled = false
    const host = hostRef.current!
    loadYouTubeApi()
      .then((api) => {
        if (cancelled) return
        // YT replaces its target element with an iframe, so give it a node React doesn't own.
        const target = document.createElement('div')
        host.appendChild(target)
        playerRef.current = new api.Player(target, {
          videoId: DEFAULT_VIDEO,
          playerVars: { playsinline: 1, rel: 0 },
          events: {
            onReady: (e) => {
              setReady(true)
              setMuted(e.target.isMuted())
            },
            onStateChange: (e) => {
              const active = e.data === api.PlayerState.PLAYING || e.data === api.PlayerState.BUFFERING
              setPlaying(active)
              if (active) {
                setBlocked(false)
                setError('')
              }
            },
            onError: (e) => setError(PLAYER_ERRORS[e.data] ?? `Player error (${e.data}).`),
          },
        })
      })
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
      window.clearTimeout(blockTimer.current)
      playerRef.current?.destroy()
      playerRef.current = null
      host.replaceChildren()
    }
  }, [])

  const isPlaying = () => {
    const state = playerRef.current?.getPlayerState()
    return state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING
  }

  const play = () => {
    playerRef.current?.playVideo()
    // Browsers can refuse playback that wasn't started by a click. If nothing starts, offer a manual button.
    window.clearTimeout(blockTimer.current)
    blockTimer.current = window.setTimeout(() => !isPlaying() && setBlocked(true), 1500)
  }

  /** Runs an action and returns a short result for the on-screen feedback (e.g. "Volume 60%"). */
  const run = (action: Action): string | undefined => {
    const player = playerRef.current
    if (!player || !ready) return
    switch (action) {
      case 'playPause':
        if (isPlaying()) player.pauseVideo()
        else play()
        return
      case 'forward':
      case 'backward': {
        const delta = action === 'forward' ? SKIP_SECONDS : -SKIP_SECONDS
        const duration = player.getDuration() || Infinity
        player.seekTo(Math.max(0, Math.min(duration, player.getCurrentTime() + delta)), true)
        return
      }
      case 'volumeUp':
      case 'volumeDown': {
        const delta = action === 'volumeUp' ? VOLUME_STEP : -VOLUME_STEP
        const next = Math.max(0, Math.min(100, Math.round(player.getVolume() / VOLUME_STEP) * VOLUME_STEP + delta))
        player.setVolume(next)
        if (action === 'volumeUp' && player.isMuted()) player.unMute()
        setMuted(action === 'volumeUp' ? false : player.isMuted())
        return `Volume ${next}%`
      }
      case 'mute': {
        const nowMuted = !player.isMuted()
        if (nowMuted) player.mute()
        else player.unMute()
        setMuted(nowMuted)
        return nowMuted ? 'Muted' : 'Unmuted'
      }
    }
  }

  useImperativeHandle(ref, () => ({ run }))

  const loadVideo = (e: FormEvent) => {
    e.preventDefault()
    const id = parseVideoId(url)
    if (!id) return setUrlError('Not a recognizable YouTube URL or video ID.')
    setUrlError('')
    setError('')
    setBlocked(false)
    playerRef.current?.cueVideoById(id)
    setUrl('')
  }

  return (
    <section className="panel flex flex-col overflow-hidden">
      <div className="relative aspect-video bg-black">
        <div ref={hostRef} className="yt-host absolute inset-0" />
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">Loading player…</div>
        )}
        {error && (
          <div className="absolute inset-x-3 top-3 rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-200 ring-1 ring-rose-400/30 backdrop-blur">
            {error}
          </div>
        )}
        {overlay}
      </div>

      {blocked && (
        <div className="flex items-center justify-between gap-3 border-b border-amber-400/20 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-200">
          <span>The browser blocked gesture-started playback. Start it once manually and gestures will work after that.</span>
          <button className="btn-primary shrink-0 py-1.5" onClick={play}>
            <Icon name="play" /> Play
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 p-3">
        <div className="flex gap-1.5">
          <button className="btn-ghost" disabled={!ready} onClick={() => run('backward')} title="Back 10s">
            <Icon name="backward" />
          </button>
          <button className="btn-ghost min-w-24" disabled={!ready} onClick={() => run('playPause')}>
            <Icon name={playing ? 'pause' : 'play'} /> {playing ? 'Pause' : 'Play'}
          </button>
          <button className="btn-ghost" disabled={!ready} onClick={() => run('forward')} title="Forward 10s">
            <Icon name="forward" />
          </button>
        </div>
        <div className="flex gap-1.5">
          <button className="btn-ghost" disabled={!ready} onClick={() => run('volumeDown')} title="Volume down">
            <Icon name="volumeDown" />
          </button>
          <button className="btn-ghost" disabled={!ready} onClick={() => run('volumeUp')} title="Volume up">
            <Icon name="volumeUp" />
          </button>
          <button
            className={`btn-ghost ${muted ? 'text-rose-300 ring-rose-400/40' : ''}`}
            disabled={!ready}
            onClick={() => run('mute')}
            title={muted ? 'Unmute' : 'Mute'}
          >
            <Icon name="mute" />
          </button>
        </div>
        <form onSubmit={loadVideo} className="ml-auto flex min-w-60 flex-1 gap-1.5 sm:max-w-sm">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a YouTube URL…"
            className="min-w-0 flex-1 rounded-xl bg-white/[0.04] px-3 py-2 text-sm ring-1 ring-white/[0.08] outline-none placeholder:text-zinc-500 focus:ring-violet-400/60"
          />
          <button className="btn-ghost" disabled={!url.trim() || !ready}>
            Load
          </button>
        </form>
        {urlError && <p className="w-full text-right text-xs text-rose-300">{urlError}</p>}
      </div>
    </section>
  )
}
