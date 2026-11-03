import type { LivePlane } from './api'

/** Transponder codes pilots set to signal trouble. */
export const EMERGENCY_SQUAWKS: Record<string, string> = {
  '7500': 'Hijacking',
  '7600': 'Radio failure',
  '7700': 'General emergency',
}

export function emergency(plane: LivePlane): string | null {
  return (plane.squawk && EMERGENCY_SQUAWKS[plane.squawk]) ?? null
}

export type Kind = 'heavy' | 'jet' | 'light' | 'helicopter' | 'ground'

export const KIND_LABELS: Record<Kind, string> = {
  heavy: 'Heavy jets',
  jet: 'Airliners & jets',
  light: 'Small planes',
  helicopter: 'Helicopters',
  ground: 'Ground vehicles',
}

/**
 * What sort of aircraft this is, from its ADS-B size class. Most aircraft don't send one,
 * so fall back on the callsign: airline flights look like "UAL123", private US planes like "N123AB".
 */
export function kind(plane: LivePlane): Kind {
  switch (plane.category) {
    case 2:
    case 9:
    case 12:
      return 'light'
    case 3:
    case 4:
    case 7:
      return 'jet'
    case 5:
    case 6:
      return 'heavy'
    case 8:
      return 'helicopter'
    case 16:
    case 17:
      return 'ground'
  }
  if (plane.callsign && /^N\d/.test(plane.callsign)) return 'light'
  return 'jet'
}

export function displayName(plane: { callsign: string | null; icao24: string }): string {
  return plane.callsign ?? plane.icao24.toUpperCase()
}

const METERS_PER_DEGREE = 111_320
/** Don't guess where a plane is for longer than this after its last report. */
const MAX_EXTRAPOLATE_S = 60

/**
 * Where the plane should be now, estimated from its last reported position, speed and heading.
 * Reports arrive every 30 seconds; this is what keeps planes gliding across the map in between.
 */
export function extrapolate(plane: LivePlane, nowMs: number): [number, number] {
  if (plane.onGround || plane.velocityMs == null || plane.headingDeg == null) {
    return [plane.latitude, plane.longitude]
  }
  const seconds = Math.min(Math.max((nowMs - Date.parse(plane.observedAt)) / 1000, 0), MAX_EXTRAPOLATE_S)
  const meters = plane.velocityMs * seconds
  const heading = (plane.headingDeg * Math.PI) / 180
  const lat = plane.latitude + (meters * Math.cos(heading)) / METERS_PER_DEGREE
  const lon =
    plane.longitude + (meters * Math.sin(heading)) / (METERS_PER_DEGREE * Math.cos((plane.latitude * Math.PI) / 180))
  return [lat, lon]
}

/** Distance in km between two points (haversine). */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(a))
}

/** Compass bearing in degrees from the first point to the second. */
export function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180
  const y = Math.sin((lon2 - lon1) * rad) * Math.cos(lat2 * rad)
  const x =
    Math.cos(lat1 * rad) * Math.sin(lat2 * rad) - Math.sin(lat1 * rad) * Math.cos(lat2 * rad) * Math.cos((lon2 - lon1) * rad)
  return ((Math.atan2(y, x) / rad) + 360) % 360
}

/** The smaller angle between two compass headings, 0 to 180. */
export function headingDifference(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360
  return diff > 180 ? 360 - diff : diff
}

/** Map icon outlines, drawn pointing north in a 24×24 box. */
export const ICON_PATHS: Record<Kind, string> = {
  jet: 'M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z',
  heavy:
    'M12 1c-.9 0-1.4.9-1.4 2v5.3L1 13.6v2.2l9.6-2.6v4.9l-2.6 2v1.6l4-1.1 4 1.1v-1.6l-2.6-2v-4.9l9.6 2.6v-2.2l-9.6-5.3V3c0-1.1-.5-2-1.4-2zM4.5 12.4v-1.7h1.6v.8zm15 0-1.6-.9v-.8h1.6z',
  light: 'M11 2h2v5h9v2.4l-9 .8V18l3 1.6V21l-4-.8-4 .8v-1.4l3-1.6v-7.8l-9-.8V7h9z',
  helicopter:
    'M12 5.5a3 3 0 0 1 3 3V13a3 3 0 0 1-2 2.8V21h2v1.5H9V21h2v-5.2A3 3 0 0 1 9 13V8.5a3 3 0 0 1 3-3zM2.5 3.6l1.1-1.1L12 10.9l8.4-8.4 1.1 1.1-8.4 8.4 8.4 8.4-1.1 1.1-8.4-8.4-8.4 8.4-1.1-1.1 8.4-8.4z',
  ground: 'M8 6h8a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z',
}

export const ICON_SIZES: Record<Kind, number> = { heavy: 28, jet: 22, light: 18, helicopter: 20, ground: 12 }

export const KIND_NAMES: Record<Kind, string> = {
  heavy: 'Heavy jet',
  jet: 'Jet',
  light: 'Small plane',
  helicopter: 'Helicopter',
  ground: 'Ground vehicle',
}

/** Whether the aircraft reported its size class, rather than us guessing from the callsign. */
export function kindReported(plane: LivePlane): boolean {
  return plane.category != null && plane.category >= 2
}

/** A break in reports this long means the plane landed or left the area, so what came before was another flight. */
const NEW_FLIGHT_GAP_MS = 30 * 60_000

/** Where the flight that includes position `end` began: after a long gap, or at its last ground position. */
function flightStart(track: { observedAt: string; onGround: boolean }[], end: number): number {
  let start = 0
  for (let i = 1; i <= end; i++) {
    const gap = Date.parse(track[i].observedAt) - Date.parse(track[i - 1].observedAt)
    if (gap > NEW_FLIGHT_GAP_MS) start = i
    // Keep the last ground position so the line starts on the runway.
    else if (track[i - 1].onGround && !track[i].onGround) start = i - 1
  }
  return start
}

/**
 * Just the current flight out of a plane's recent positions. Without this, a plane that landed
 * and took off again would show both flights joined together. For a plane on the ground now,
 * that's the flight that brought it here.
 */
export function currentFlight<T extends { observedAt: string; onGround: boolean }>(track: T[]): T[] {
  let end = track.length - 1
  while (end > 0 && track[end].onGround) end--
  return track.slice(flightStart(track, end))
}
