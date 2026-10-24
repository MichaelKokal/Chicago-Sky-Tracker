import type { LivePlane, TrackPoint } from '../api'
import { dateAndTime, feet, feetPerMinute, mph, timeOfDay } from '../format'

interface Props {
  plane: LivePlane
  track: TrackPoint[]
  onClose: () => void
}

export function PlaneDetails({ plane, track, onClose }: Props) {
  const firstSeen = track[0]?.observedAt

  return (
    <div className="card plane-details">
      <div className="card-header">
        <div>
          <h2>{plane.callsign ?? plane.icao24.toUpperCase()}</h2>
          <p className="muted">{plane.airline ?? 'Unknown operator'}</p>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <dl className="facts">
        <dt>Altitude</dt>
        <dd>{plane.onGround ? 'On the ground' : feet(plane.altitudeM)}</dd>
        <dt>Speed</dt>
        <dd>{mph(plane.velocityMs)}</dd>
        <dt>Heading</dt>
        <dd>{plane.headingDeg == null ? '—' : `${Math.round(plane.headingDeg)}°`}</dd>
        <dt>Vertical</dt>
        <dd>{feetPerMinute(plane.verticalRateMs)}</dd>
        <dt>Registered in</dt>
        <dd>{plane.originCountry}</dd>
        <dt>Transponder</dt>
        <dd className="mono">{plane.icao24}</dd>
        <dt>Last update</dt>
        <dd>{timeOfDay(plane.observedAt)}</dd>
        {firstSeen && (
          <>
            <dt>Tracked since</dt>
            <dd>{dateAndTime(firstSeen)}</dd>
          </>
        )}
      </dl>
      <p className="muted small">The blue line shows where this aircraft has flown in the last 6 hours.</p>
    </div>
  )
}
