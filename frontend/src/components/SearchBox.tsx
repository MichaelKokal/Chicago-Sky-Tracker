import { useState, type KeyboardEvent } from 'react'
import { AIRPORTS, type Airport } from '../airports'
import type { LivePlane } from '../api'
import { feet } from '../format'
import { displayName } from '../planes'

type Result = { type: 'plane'; plane: LivePlane } | { type: 'airport'; airport: Airport }

const MAX_RESULTS = 8

function search(query: string, planes: LivePlane[]): Result[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const airports: Result[] = AIRPORTS.filter(
    (a) => a.code.toLowerCase().startsWith(q) || a.name.toLowerCase().includes(q),
  ).map((airport) => ({ type: 'airport', airport }))
  const matches: Result[] = planes
    .filter(
      (p) =>
        p.callsign?.toLowerCase().includes(q) ||
        p.icao24.startsWith(q) ||
        p.squawk === q ||
        p.airline?.toLowerCase().includes(q),
    )
    // Callsigns that start with what was typed are the likeliest match.
    .sort((a, b) => Number(!a.callsign?.toLowerCase().startsWith(q)) - Number(!b.callsign?.toLowerCase().startsWith(q)))
    .map((plane) => ({ type: 'plane', plane }))
  return [...airports, ...matches].slice(0, MAX_RESULTS)
}

interface Props {
  planes: LivePlane[]
  onSelectPlane: (plane: LivePlane) => void
  onSelectAirport: (airport: Airport) => void
}

/** Find a flight by callsign, airline, transponder code or squawk, or jump to an airport. */
export function SearchBox({ planes, onSelectPlane, onSelectAirport }: Props) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const results = search(query, planes)

  function choose(result: Result) {
    if (result.type === 'plane') onSelectPlane(result.plane)
    else onSelectAirport(result.airport)
    setQuery('')
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') setActive((i) => Math.min(i + 1, results.length - 1))
    else if (event.key === 'ArrowUp') setActive((i) => Math.max(i - 1, 0))
    else if (event.key === 'Enter' && results[active]) choose(results[active])
    else if (event.key === 'Escape') setQuery('')
    else return
    event.preventDefault()
  }

  return (
    <div className="search">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
        }}
        onKeyDown={onKeyDown}
        placeholder="Search flight, airline, airport…"
        aria-label="Search flights and airports"
      />
      {query.trim() && (
        <ul className="search-results">
          {results.length === 0 && <li className="muted small empty">Nothing in the air matches that right now.</li>}
          {results.map((r, i) => (
            <li key={r.type === 'plane' ? r.plane.icao24 : r.airport.code}>
              <button className={i === active ? 'active' : ''} onMouseEnter={() => setActive(i)} onClick={() => choose(r)}>
                {r.type === 'plane' ? (
                  <>
                    <span className="callsign">{displayName(r.plane)}</span>
                    <span className="muted small">
                      {r.plane.airline ?? 'Unknown operator'} · {r.plane.onGround ? 'on ground' : feet(r.plane.altitudeM)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="callsign">{r.airport.code}</span>
                    <span className="muted small">{r.airport.name}</span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
