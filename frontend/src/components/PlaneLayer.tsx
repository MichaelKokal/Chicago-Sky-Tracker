import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import type { LivePlane } from '../api'
import { clockNow, type Clock } from '../clock'
import { altitudeColor } from '../format'
import { displayName, emergency, extrapolate, ICON_PATHS, ICON_SIZES, kind } from '../planes'

/** How long a plane takes to glide from where we'd guessed it was to its newly reported spot. */
const CORRECTION_MS = 2000
/** About 5 km. */
const MAX_GLIDE_DEG = 0.05
/** How often a followed plane is re-centered. */
const FOLLOW_MS = 1000

interface Tracked {
  marker: L.Marker
  plane: LivePlane
  iconKey: string
  /** Gap between where the plane was drawn and its new position when a report came in, faded out over time. */
  offset: [number, number]
  offsetAt: number
}

interface Props {
  planes: LivePlane[]
  clock: Clock
  selected: string | null
  follow: boolean
  labels: boolean
  isFaded: (plane: LivePlane) => boolean
  onSelect: (icao24: string) => void
}

function iconFor(plane: LivePlane, selected: boolean, faded: boolean, labels: boolean) {
  const type = kind(plane)
  const size = Math.round(ICON_SIZES[type] * (selected ? 1.3 : 1))
  const alert = emergency(plane) != null
  const color = alert ? '#ef4444' : altitudeColor(plane.altitudeM, plane.onGround)
  const heading = Math.round(plane.headingDeg ?? 0)
  const key = `${type}|${size}|${color}|${heading}|${selected}|${faded}|${alert}|${labels ? displayName(plane) : ''}`

  const classes = ['plane-icon', faded && 'faded', selected && 'selected', alert && 'alert'].filter(Boolean).join(' ')
  const label = labels || selected ? `<span class="plane-label">${displayName(plane)}</span>` : ''
  const icon = L.divIcon({
    className: classes,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="transform: rotate(${heading}deg)">
      <path d="${ICON_PATHS[type]}" fill="${color}" stroke="${selected ? '#fff' : '#0f172a'}" stroke-width="${selected ? 1.5 : 0.8}"/>
    </svg>${label}`,
  })
  return { icon, key }
}

/**
 * Draws every plane and moves them smoothly between position reports.
 *
 * With a couple of hundred planes moving every frame, React re-rendering a component per plane
 * would be wasteful, so this keeps Leaflet markers itself and moves them directly.
 */
export function PlaneLayer({ planes, clock, selected, follow, labels, isFaded, onSelect }: Props) {
  const map = useMap()
  const tracked = useRef(new Map<string, Tracked>())
  const clockRef = useRef(clock)
  const onSelectRef = useRef(onSelect)
  const followRef = useRef<string | null>(null)

  useEffect(() => {
    clockRef.current = clock
    onSelectRef.current = onSelect
    followRef.current = follow ? selected : null
  })

  // Add, update and remove markers when new data arrives or what they should look like changes.
  useEffect(() => {
    const now = clockNow(clockRef.current)
    const seen = new Set<string>()
    for (const plane of planes) {
      seen.add(plane.icao24)
      const isSelected = plane.icao24 === selected
      const { icon, key } = iconFor(plane, isSelected, isFaded(plane), labels)
      const target = extrapolate(plane, now)
      const existing = tracked.current.get(plane.icao24)

      if (!existing) {
        const marker = L.marker(target, { icon, keyboard: false })
          .on('click', () => onSelectRef.current(plane.icao24))
          .addTo(map)
        tracked.current.set(plane.icao24, { marker, plane, iconKey: key, offset: [0, 0], offsetAt: 0 })
        continue
      }

      if (existing.plane !== plane) {
        // Start from where the plane is drawn right now, so a new report doesn't make it jump.
        // A big gap means a jump in time (seeking during playback), where gliding would look wrong.
        const drawn = existing.marker.getLatLng()
        const offset: [number, number] = [drawn.lat - target[0], drawn.lng - target[1]]
        const small = Math.abs(offset[0]) < MAX_GLIDE_DEG && Math.abs(offset[1]) < MAX_GLIDE_DEG
        existing.offset = small ? offset : [0, 0]
        existing.offsetAt = performance.now()
        existing.plane = plane
      }
      if (existing.iconKey !== key) {
        existing.marker.setIcon(icon)
        existing.iconKey = key
      }
      existing.marker.setZIndexOffset(isSelected ? 1000 : emergency(plane) ? 500 : 0)
    }

    for (const [icao24, t] of tracked.current) {
      if (!seen.has(icao24)) {
        t.marker.remove()
        tracked.current.delete(icao24)
      }
    }
  }, [map, planes, selected, labels, isFaded])

  // Move every plane to where it should be right now, every frame.
  useEffect(() => {
    let frame = 0
    let lastFollow = 0
    const tick = () => {
      const now = clockNow(clockRef.current)
      const wall = performance.now()
      for (const t of tracked.current.values()) {
        const [lat, lon] = extrapolate(t.plane, now)
        const remaining = Math.max(0, 1 - (wall - t.offsetAt) / CORRECTION_MS)
        t.marker.setLatLng([lat + t.offset[0] * remaining, lon + t.offset[1] * remaining])
      }

      const followed = followRef.current && tracked.current.get(followRef.current)
      if (followed && wall - lastFollow > FOLLOW_MS) {
        map.panTo(followed.marker.getLatLng(), { animate: true, duration: 0.8 })
        lastFollow = wall
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [map])

  // Take the markers off the map when this layer goes away.
  useEffect(() => {
    const markers = tracked.current
    return () => {
      for (const t of markers.values()) t.marker.remove()
      markers.clear()
    }
  }, [])

  return null
}
