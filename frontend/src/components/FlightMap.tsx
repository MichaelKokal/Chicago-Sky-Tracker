import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo } from 'react'
import { Circle, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { AIRPORTS, type Airport } from '../airports'
import type { LivePlane, TrackPoint } from '../api'
import type { Clock } from '../clock'
import { altitudeColor } from '../format'
import type { MapStyle } from '../settings'
import { PlaneLayer } from './PlaneLayer'

const CHICAGO: [number, number] = [41.9, -87.8]

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services'
const ESRI_CREDIT =
  'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, HERE, Garmin, Maxar, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/** Esri's free basemaps (no API key), each with place names drawn as a separate layer on top. */
const BASEMAPS: Record<MapStyle, { base: string; labels: string }> = {
  dark: { base: 'Canvas/World_Dark_Gray_Base', labels: 'Canvas/World_Dark_Gray_Reference' },
  light: { base: 'Canvas/World_Light_Gray_Base', labels: 'Canvas/World_Light_Gray_Reference' },
  satellite: { base: 'World_Imagery', labels: 'Reference/World_Boundaries_and_Places' },
}

function ClickToPick({ onPick }: { onPick?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(event) {
      onPick?.(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

/** Flies the map to a point whenever a new focus request comes in (search results, shared links). */
function FocusOn({ focus }: { focus: Focus | null }) {
  const map = useMap()
  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lon], Math.max(map.getZoom(), focus.zoom), { duration: 1.2 })
  }, [map, focus])
  return null
}

/** Dragging the map means you want to look around, not keep chasing the selected plane. */
function StopFollowOnDrag({ onDrag }: { onDrag: () => void }) {
  useMapEvents({ dragstart: onDrag })
  return null
}

/** The flown path, split into pieces colored by altitude, like the planes themselves. */
function TrackLine({ track }: { track: TrackPoint[] }) {
  const segments = useMemo(() => {
    const result: { color: string; points: [number, number][] }[] = []
    for (const point of track) {
      const color = altitudeColor(point.altitudeM, point.onGround)
      const latLng: [number, number] = [point.latitude, point.longitude]
      const last = result[result.length - 1]
      if (last && last.color === color) {
        last.points.push(latLng)
      } else {
        // Start each piece at the end of the last one so the line has no gaps.
        result.push({ color, points: last ? [last.points[last.points.length - 1], latLng] : [latLng] })
      }
    }
    return result.filter((s) => s.points.length > 1)
  }, [track])

  return (
    <>
      {segments.map((s, i) => (
        <Polyline key={i} positions={s.points} pathOptions={{ color: s.color, weight: 3, opacity: 0.9 }} />
      ))}
    </>
  )
}

function airportIcon(airport: Airport, active: boolean) {
  return L.divIcon({
    className: `airport-icon${airport.major ? ' major' : ''}${active ? ' active' : ''}`,
    iconSize: [0, 0],
    html: `<span class="airport-dot"></span><span class="airport-code">${airport.code}</span>`,
  })
}

export interface Focus {
  lat: number
  lon: number
  zoom: number
}

interface Props {
  planes: LivePlane[]
  clock: Clock
  selected: string | null
  track: TrackPoint[]
  onSelect: (icao24: string) => void
  follow: boolean
  onStopFollowing: () => void
  labels: boolean
  mapStyle: MapStyle
  isFaded: (plane: LivePlane) => boolean
  airport: string | null
  onSelectAirport: (code: string) => void
  focus: Focus | null
  pin?: { lat: number; lon: number; radiusKm: number } | null
  onMapClick?: (lat: number, lon: number) => void
}

export function FlightMap(props: Props) {
  const { planes, clock, selected, track, onSelect, follow, labels, mapStyle, isFaded, pin, onMapClick } = props
  const basemap = BASEMAPS[mapStyle]

  return (
    <MapContainer center={CHICAGO} zoom={9} className={`map map-${mapStyle}`} zoomControl={false}>
      <TileLayer key={basemap.base} attribution={ESRI_CREDIT} url={`${ESRI}/${basemap.base}/MapServer/tile/{z}/{y}/{x}`} maxNativeZoom={16} />
      <TileLayer key={basemap.labels} url={`${ESRI}/${basemap.labels}/MapServer/tile/{z}/{y}/{x}`} maxNativeZoom={16} />
      <ClickToPick onPick={onMapClick} />
      <StopFollowOnDrag onDrag={props.onStopFollowing} />
      <FocusOn focus={props.focus} />
      {pin && (
        <Circle
          center={[pin.lat, pin.lon]}
          radius={pin.radiusKm * 1000}
          pathOptions={{ color: '#f472b6', fillColor: '#f472b6', fillOpacity: 0.12, weight: 2 }}
        />
      )}
      {AIRPORTS.map((airport) => (
        <Marker
          key={airport.code}
          position={[airport.lat, airport.lon]}
          icon={airportIcon(airport, airport.code === props.airport)}
          eventHandlers={{ click: () => props.onSelectAirport(airport.code) }}
        />
      ))}
      <TrackLine track={track} />
      <PlaneLayer
        planes={planes}
        clock={clock}
        selected={selected}
        follow={follow}
        labels={labels}
        isFaded={isFaded}
        onSelect={onSelect}
      />
    </MapContainer>
  )
}
