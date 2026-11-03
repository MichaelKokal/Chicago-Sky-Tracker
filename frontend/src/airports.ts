import type { LivePlane } from './api'
import { bearingDeg, distanceKm, headingDifference } from './planes'

export interface Airport {
  code: string
  name: string
  lat: number
  lon: number
  /** How far from the center point a plane on the ground still counts as being at this airport. */
  groundRadiusKm: number
  major: boolean
}

export const AIRPORTS: Airport[] = [
  { code: 'ORD', name: "Chicago O'Hare International", lat: 41.9786, lon: -87.9048, groundRadiusKm: 5, major: true },
  { code: 'MDW', name: 'Chicago Midway International', lat: 41.7868, lon: -87.7522, groundRadiusKm: 2.5, major: true },
  { code: 'PWK', name: 'Chicago Executive', lat: 42.1142, lon: -87.9015, groundRadiusKm: 2, major: false },
  { code: 'DPA', name: 'DuPage', lat: 41.9078, lon: -88.2486, groundRadiusKm: 2.5, major: false },
  { code: 'GYY', name: 'Gary/Chicago International', lat: 41.6163, lon: -87.4128, groundRadiusKm: 2.5, major: false },
  { code: 'ARR', name: 'Aurora Municipal', lat: 41.7719, lon: -88.4757, groundRadiusKm: 2, major: false },
  { code: 'LOT', name: 'Lewis University', lat: 41.6073, lon: -88.0962, groundRadiusKm: 1.5, major: false },
]

export interface AirportTraffic {
  arriving: { plane: LivePlane; distanceKm: number }[]
  departing: { plane: LivePlane; distanceKm: number }[]
  onGround: { plane: LivePlane; distanceKm: number }[]
}

/** Only planes this close and this low are counted as arriving at or leaving an airport. */
const TERMINAL_KM = 45
const TERMINAL_ALTITUDE_M = 3500
/** A plane has to be pointed within this many degrees of the airport (or directly away from it). */
const HEADING_CONE = 50

/**
 * Sorts live planes into arriving, departing and on the ground at each airport.
 * There's no flight plan data, so this goes by what the plane is doing: low, descending and pointed
 * at an airport means it's on approach; low, climbing and pointed away means it just took off.
 * A plane that fits more than one airport goes to the closest.
 */
export function airportTraffic(planes: LivePlane[]): Map<string, AirportTraffic> {
  const traffic = new Map<string, AirportTraffic>(
    AIRPORTS.map((a) => [a.code, { arriving: [], departing: [], onGround: [] }]),
  )

  for (const plane of planes) {
    let best: { airport: Airport; distanceKm: number; list: keyof AirportTraffic } | null = null
    for (const airport of AIRPORTS) {
      const km = distanceKm(plane.latitude, plane.longitude, airport.lat, airport.lon)
      const list = classify(plane, airport, km)
      if (list && (!best || km < best.distanceKm)) best = { airport, distanceKm: km, list }
    }
    if (best) traffic.get(best.airport.code)![best.list].push({ plane, distanceKm: best.distanceKm })
  }

  for (const t of traffic.values()) {
    t.arriving.sort((a, b) => a.distanceKm - b.distanceKm)
    t.departing.sort((a, b) => a.distanceKm - b.distanceKm)
    t.onGround.sort((a, b) => a.distanceKm - b.distanceKm)
  }
  return traffic
}

function classify(plane: LivePlane, airport: Airport, km: number): keyof AirportTraffic | null {
  if (plane.onGround) return km <= airport.groundRadiusKm ? 'onGround' : null
  if (km > TERMINAL_KM || plane.altitudeM == null || plane.altitudeM > TERMINAL_ALTITUDE_M) return null
  if (plane.headingDeg == null || plane.verticalRateMs == null) return null

  const toAirport = bearingDeg(plane.latitude, plane.longitude, airport.lat, airport.lon)
  if (plane.verticalRateMs < -1 && headingDifference(plane.headingDeg, toAirport) < HEADING_CONE) return 'arriving'
  if (plane.verticalRateMs > 1 && headingDifference(plane.headingDeg, (toAirport + 180) % 360) < HEADING_CONE) {
    return 'departing'
  }
  return null
}
