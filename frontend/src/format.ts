export function feet(meters: number | null): string {
  return meters == null ? '—' : `${Math.round(meters * 3.28084).toLocaleString()} ft`
}

export function mph(metersPerSecond: number | null): string {
  return metersPerSecond == null ? '—' : `${Math.round(metersPerSecond * 2.23694)} mph`
}

export function miles(meters: number): string {
  return `${(meters / 1609.34).toFixed(1)} mi`
}

export function feetPerMinute(metersPerSecond: number | null): string {
  if (metersPerSecond == null) return '—'
  const fpm = Math.round(metersPerSecond * 196.85)
  if (Math.abs(fpm) < 100) return 'Level'
  return fpm > 0 ? `Climbing ${fpm.toLocaleString()} ft/min` : `Descending ${(-fpm).toLocaleString()} ft/min`
}

export function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function dateAndTime(iso: string): string {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/** Color scale for altitude, from low (warm) to cruising height (cool). */
export function altitudeColor(meters: number | null, onGround: boolean): string {
  if (onGround || meters == null) return '#94a3b8'
  if (meters < 1000) return '#f97316'
  if (meters < 3000) return '#facc15'
  if (meters < 6000) return '#4ade80'
  if (meters < 9000) return '#38bdf8'
  return '#a78bfa'
}

export const altitudeLegend = [
  { label: 'On ground', color: '#94a3b8' },
  { label: '< 3,300 ft', color: '#f97316' },
  { label: '< 10,000 ft', color: '#facc15' },
  { label: '< 20,000 ft', color: '#4ade80' },
  { label: '< 30,000 ft', color: '#38bdf8' },
  { label: '30,000+ ft', color: '#a78bfa' },
]
