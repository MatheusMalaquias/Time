const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

export const IconPanel = () => (
  <svg {...base}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
)
export const IconDay = () => (
  <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
)
export const IconMonth = () => (
  <svg {...base}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
)
export const IconBell = () => (
  <svg {...base}><path d="M6 17V11a6 6 0 1 1 12 0v6l1.5 2h-15L6 17ZM10 21a2 2 0 0 0 4 0" /></svg>
)
export const IconUser = () => (
  <svg {...base}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
)
export const IconChat = () => (
  <svg {...base}><path d="M4 5h16v11H9l-5 4V5Z" /></svg>
)
