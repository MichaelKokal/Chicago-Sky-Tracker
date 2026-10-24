import { useEffect, useState } from 'react'
import { api, type AirlineCount, type HourCount, type Summary } from '../api'
import { dateAndTime } from '../format'

function hourLabel(hour: number) {
  if (hour === 0) return '12a'
  if (hour === 12) return '12p'
  return hour < 12 ? `${hour}a` : `${hour - 12}p`
}

export function StatsPanel() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [hourly, setHourly] = useState<HourCount[]>([])
  const [airlines, setAirlines] = useState<AirlineCount[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    Promise.all([api.summary(), api.hourly(), api.airlines()])
      .then(([s, h, a]) => {
        setSummary(s)
        setHourly(h)
        setAirlines(a)
      })
      .catch(() => setError(true))
  }, [])

  if (error) return <div className="card error">Couldn't load stats.</div>
  if (!summary) return <div className="card muted">Loading stats…</div>

  // Fill in hours with no data so the chart always shows a full day.
  const byHour = Array.from({ length: 24 }, (_, hour) => hourly.find((h) => h.hour === hour)?.avgAircraft ?? 0)
  const busiest = Math.max(...byHour, 1)
  const topAirline = Math.max(...airlines.map((a) => a.aircraft), 1)

  return (
    <div className="card stats">
      <h2>The skies so far</h2>
      <div className="tiles">
        <div className="tile">
          <span className="tile-value">{summary.totalPositions.toLocaleString()}</span>
          <span className="tile-label">positions recorded</span>
        </div>
        <div className="tile">
          <span className="tile-value">{summary.totalAircraft.toLocaleString()}</span>
          <span className="tile-label">different aircraft</span>
        </div>
        <div className="tile">
          <span className="tile-value">{summary.aircraftLast24h.toLocaleString()}</span>
          <span className="tile-label">in the last 24h</span>
        </div>
      </div>
      {summary.trackingSince && <p className="muted small">Tracking since {dateAndTime(summary.trackingSince)}</p>}

      <h3>Busiest hours (avg aircraft, last 7 days)</h3>
      <div className="hour-chart">
        {byHour.map((count, hour) => (
          <div key={hour} className="hour-bar" title={`${hourLabel(hour)}: ${count} aircraft`}>
            <div className="hour-fill" style={{ height: `${(count / busiest) * 100}%` }} />
            {hour % 6 === 0 && <span className="hour-label">{hourLabel(hour)}</span>}
          </div>
        ))}
      </div>

      <h3>Top airlines (last 7 days)</h3>
      <ul className="bar-list">
        {airlines.map((a) => (
          <li key={a.airline}>
            <span className="bar-name">{a.airline}</span>
            <span className="bar-track">
              <span className="bar-fill" style={{ width: `${(a.aircraft / topAirline) * 100}%` }} />
            </span>
            <span className="bar-value">{a.aircraft}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
