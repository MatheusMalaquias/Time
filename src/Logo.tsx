import { useId } from 'react'

/** Marca "Time": um T dentro de um anel de progresso do dia. */
export function Logo({ size = 40 }: { size?: number }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" role="img" aria-label="Time" className="shrink-0">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill="#0f172a" />
      <circle cx="256" cy="256" r="148" fill="none" stroke="#1e293b" strokeWidth="40" />
      <circle cx="256" cy="256" r="148" fill="none" stroke={`url(#${id})`} strokeWidth="40" strokeLinecap="round" strokeDasharray="700 930" transform="rotate(-90 256 256)" />
      <path d="M198 222H314M256 222V320" fill="none" stroke="#f8fafc" strokeWidth="38" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Brand({ size = 56, center = false }: { size?: number; center?: boolean }) {
  return (
    <div className={`flex flex-col gap-3 ${center ? 'items-center text-center' : ''}`}>
      <div className={`flex items-center gap-3 ${center ? 'flex-col' : ''}`}>
        <Logo size={size} />
        <h1 className="text-4xl font-bold tracking-tight">Time</h1>
      </div>
      <div>
        <p className="text-lg font-medium text-slate-100">Make time for what matters.</p>
        <p className="text-sm text-slate-400">Organize your time. Own your day.</p>
      </div>
    </div>
  )
}
