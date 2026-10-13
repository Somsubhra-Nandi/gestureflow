let apiPromise: Promise<typeof YT> | null = null

/** Loads the official YouTube IFrame Player API once. */
export function loadYouTubeApi(): Promise<typeof YT> {
  apiPromise ??= new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT)
    const w = window as unknown as { onYouTubeIframeAPIReady?: () => void }
    w.onYouTubeIframeAPIReady = () => resolve(window.YT)
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.onerror = () => {
      apiPromise = null
      reject(new Error('Failed to load the YouTube player API.'))
    }
    document.head.appendChild(script)
  })
  return apiPromise
}

/** Accepts a bare video ID or watch / youtu.be / shorts / embed / live URLs. */
export function parseVideoId(input: string): string | null {
  const s = input.trim()
  if (/^[\w-]{11}$/.test(s)) return s
  try {
    const url = new URL(s.includes('://') ? s : `https://${s}`)
    const host = url.hostname.replace(/^(www|m|music)\./, '')
    let id: string | null = null
    if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0]
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      id = url.searchParams.get('v') ?? url.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/)?.[1] ?? null
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null
  } catch {
    return null
  }
}
