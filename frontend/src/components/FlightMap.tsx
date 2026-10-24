import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useMemo } from 'react'
import { Circle, MapContainer, Marker, Polyline, TileLayer, useMapEvents } from 'react-leaflet'
import type { LivePlane, TrackPoint } from '../api'
import { altitudeColor } from '../format'

const CHICAGO: [number, number] = [41.9, -87.8]

const PLANE_PATH =
  'M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z'

function planeIcon(plane: LivePlane, selected: boolean) {
  const color = altitudeColor(plane.altitudeM, plane.onGround)
  const size = selected ? 30 : 22
  return L.divIcon({
    className: 'plane-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="transform: rotate(${plane.headingDeg ?? 0}deg)">
      <path d="${PLANE_PATH}" fill="${color}" stroke="${selected ? '#fff' : '#0f172a'}" stroke-width="${selected ? 1.5 : 0.8}"/>
    </svg>`,
  })
}

function ClickToPick({ onPick }: { onPick?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(event) {
      onPick?.(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

interface Props {
  planes: LivePlane[]
  selected: string | null
  track: TrackPoint[]
  onSelect: (icao24: string) => void
  pin?: { lat: number; lon: number; radiusKm: number } | null
  onMapClick?: (lat: number, lon: number) => void
}

export function FlightMap({ planes, selected, track, onSelect, pin, onMapClick }: Props) {
  const trackLine = useMemo(() => track.map((p) => [p.latitude, p.longitude] as [number, number]), [track])

  return (
    <MapContainer center={CHICAGO} zoom={9} className="map" zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <ClickToPick onPick={onMapClick} />
      {trackLine.length > 1 && <Polyline positions={trackLine} pathOptions={{ color: '#38bdf8', weight: 3, opacity: 0.8 }} />}
      {pin && (
        <Circle
          center={[pin.lat, pin.lon]}
          radius={pin.radiusKm * 1000}
          pathOptions={{ color: '#f472b6', fillColor: '#f472b6', fillOpacity: 0.12, weight: 2 }}
        />
      )}
      {planes.map((plane) => (
        <Marker
          key={plane.icao24}
          position={[plane.latitude, plane.longitude]}
          icon={planeIcon(plane, plane.icao24 === selected)}
          zIndexOffset={plane.icao24 === selected ? 1000 : 0}
          eventHandlers={{ click: () => onSelect(plane.icao24) }}
        />
      ))}
    </MapContainer>
  )
}
