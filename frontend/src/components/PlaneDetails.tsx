import { useState } from 'react'
import type { LivePlane, TrackPoint } from '../api'
import { dateAndTime, feet, feetPerMinute, mph, timeOfDay } from '../format'
import { displayName, emergency, kind, KIND_NAMES, kindReported } from '../planes'
import { ProfileChart } from './ProfileChart'

interface Props {
  plane: LivePlane
  track: TrackPoint[]
  follow: boolean
  onFollowChange: (follow: boolean) => void
  onClose: () => void
}

export function PlaneDetails({ plane, track, follow, onFollowChange, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const firstSeen = track[0]?.observedAt
  const alert = emergency(plane)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be refused; the link is still in the address bar.
    }
  }

  return (
    <div className={`card plane-details${alert ? ' alert' : ''}`}>
      <div className="card-header">
        <div>
          <h2>{displayName(plane)}</h2>
          <p className="muted">{plane.airline ?? 'Unknown operator'}</p>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      {alert && (
        <p className="alert-banner">
          Squawking {plane.squawk}: {alert}
        </p>
      )}

      <div className="big-facts">
        <div>
          <span className="tile-label">Altitude</span>
          <span className="tile-value">{plane.onGround ? 'Ground' : feet(plane.altitudeM)}</span>
        </div>
        <div>
          <span className="tile-label">Speed</span>
          <span className="tile-value">{mph(plane.velocityMs)}</span>
        </div>
        <div>
          <span className="tile-label">Heading</span>
          <span className="tile-value">{plane.headingDeg == null ? '—' : `${Math.round(plane.headingDeg)}°`}</span>
        </div>
      </div>

      <ProfileChart track={track} />

      <dl className="facts">
        <dt>Vertical</dt>
        <dd>{feetPerMinute(plane.verticalRateMs)}</dd>
        <dt>Type</dt>
        <dd>{KIND_NAMES[kind(plane)]}{kindReported(plane) ? '' : ' (best guess)'}</dd>
        <dt>Squawk</dt>
        <dd className="mono">{plane.squawk ?? '—'}</dd>
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

      <div className="button-row">
        <button className={follow ? 'toggle on' : 'toggle'} onClick={() => onFollowChange(!follow)}>
          {follow ? 'Following' : 'Follow'}
        </button>
        <button className="toggle" onClick={copyLink}>
          {copied ? 'Link copied' : 'Copy link'}
        </button>
      </div>
      <p className="muted small">The line on the map shows the last 6 hours, colored by altitude.</p>
    </div>
  )
}
