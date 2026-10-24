export interface LivePlane {
  icao24: string
  callsign: string | null
  airline: string | null
  originCountry: string
  observedAt: string
  latitude: number
  longitude: number
  altitudeM: number | null
  velocityMs: number | null
  headingDeg: number | null
  verticalRateMs: number | null
  onGround: boolean
}

export interface TrackPoint {
  observedAt: string
  latitude: number
  longitude: number
  altitudeM: number | null
  onGround: boolean
}

export interface Overhead {
  icao24: string
  callsign: string | null
  airline: string | null
  observedAt: string
  altitudeM: number | null
  distanceM: number
}

export interface Summary {
  totalPositions: number
  totalAircraft: number
  aircraftLast24h: number
  trackingSince: string | null
}

export interface HourCount {
  hour: number
  avgAircraft: number
}

export interface AirlineCount {
  airline: string
  aircraft: number
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`)
  }
  return response.json()
}

export const api = {
  live: () => get<LivePlane[]>('/api/flights/live'),
  track: (icao24: string, hours = 6) => get<TrackPoint[]>(`/api/flights/${icao24}/track?hours=${hours}`),
  overhead: (lat: number, lon: number, radiusKm: number, hours: number) =>
    get<Overhead[]>(`/api/overhead?lat=${lat}&lon=${lon}&radiusKm=${radiusKm}&hours=${hours}`),
  summary: () => get<Summary>('/api/stats/summary'),
  hourly: (days = 7) => get<HourCount[]>(`/api/stats/hourly?days=${days}`),
  airlines: (days = 7) => get<AirlineCount[]>(`/api/stats/airlines?days=${days}`),
}

/** Turns a typed address into coordinates using OpenStreetMap's free geocoder. */
export async function geocode(address: string): Promise<{ lat: number; lon: number; label: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`
  const results = await get<{ lat: string; lon: string; display_name: string }[]>(url)
  if (results.length === 0) return null
  return { lat: Number(results[0].lat), lon: Number(results[0].lon), label: results[0].display_name }
}
