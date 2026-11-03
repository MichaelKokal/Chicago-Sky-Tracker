import { useState, type PointerEvent } from 'react'
import type { TrackPoint } from '../api'
import { feet, mph, timeOfDay } from '../format'

const WIDTH = 300
const HEIGHT = 96

/** Altitude (filled) and speed (line) over the flight so far, with a readout under the cursor. */
export function ProfileChart({ track }: { track: TrackPoint[] }) {
  const [hover, setHover] = useState<number | null>(null)
  if (track.length < 2) return null

  const start = Date.parse(track[0].observedAt)
  const span = Math.max(Date.parse(track[track.length - 1].observedAt) - start, 1)
  const maxAlt = Math.max(...track.map((p) => p.altitudeM ?? 0), 1)
  const maxSpeed = Math.max(...track.map((p) => p.velocityMs ?? 0), 1)
  const x = (p: TrackPoint) => ((Date.parse(p.observedAt) - start) / span) * WIDTH
  const y = (value: number, max: number) => HEIGHT - (value / max) * (HEIGHT - 6)

  const altitudeLine = track.map((p) => `${x(p).toFixed(1)},${y(p.altitudeM ?? 0, maxAlt).toFixed(1)}`).join(' ')
  const altitudeArea = `0,${HEIGHT} ${altitudeLine} ${WIDTH},${HEIGHT}`
  const speedLine = track
    .filter((p) => p.velocityMs != null)
    .map((p) => `${x(p).toFixed(1)},${y(p.velocityMs!, maxSpeed).toFixed(1)}`)
    .join(' ')

  function onMove(event: PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    const time = start + ((event.clientX - box.left) / box.width) * span
    let nearest = 0
    for (let i = 1; i < track.length; i++) {
      if (Math.abs(Date.parse(track[i].observedAt) - time) < Math.abs(Date.parse(track[nearest].observedAt) - time)) {
        nearest = i
      }
    }
    setHover(nearest)
  }

  const point = (hover != null && track[hover]) || track[track.length - 1]

  return (
    <div className="profile">
      <div className="profile-key small">
        <span><span className="swatch altitude" />Altitude</span>
        <span><span className="swatch speed" />Speed</span>
        <span className="muted profile-readout">
          {timeOfDay(point.observedAt)} · {feet(point.altitudeM)} · {mph(point.velocityMs)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="profile-chart"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <polygon points={altitudeArea} className="profile-area" />
        <polyline points={altitudeLine} className="profile-altitude" />
        <polyline points={speedLine} className="profile-speed" />
        {hover != null && <line x1={x(point)} x2={x(point)} y1={0} y2={HEIGHT} className="profile-cursor" />}
      </svg>
      <div className="profile-axis small muted">
        <span>{timeOfDay(track[0].observedAt)}</span>
        <span>{timeOfDay(track[track.length - 1].observedAt)}</span>
      </div>
    </div>
  )
}
