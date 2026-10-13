const PATHS = {
  play: 'M7 4.5v15l12.5-7.5z',
  pause: 'M6 4.5h4v15H6zM14 4.5h4v15h-4z',
  playPause: 'M2.5 5v14l9.5-7zM14 5h3v14h-3zM19 5h3v14h-3z',
  forward: 'M3 6v12l9-6zM12 6v12l9-6z',
  backward: 'M21 6v12l-9-6zM12 6v12l-9-6z',
}

export type IconName = keyof typeof PATHS

export default function Icon({ name, className = 'size-4' }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}
