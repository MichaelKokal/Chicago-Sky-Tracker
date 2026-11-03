import type { Airport, AirportTraffic } from '../airports'
import type { LivePlane } from '../api'
import { feet, miles } from '../format'
import { displayName } from '../planes'

interface Props {
  airport: Airport
  traffic: AirportTraffic
  onSelect: (icao24: string) => void
  onClose: () => void
}

function FlightList({ title, empty, flights, onSelect, showAltitude }: {
  title: string
  empty: string
  flights: { plane: LivePlane; distanceKm: number }[]
  onSelect: (icao24: string) => void
  showAltitude: boolean
}) {
  return (
    <>
      <h3>
        {title} <span className="count">{flights.length}</span>
      </h3>
      {flights.length === 0 ? (
        <p className="muted small">{empty}</p>
      ) : (
        <ul className="board">
          {flights.map(({ plane, distanceKm }) => (
            <li key={plane.icao24}>
              <button onClick={() => onSelect(plane.icao24)}>
                <span className="callsign">{displayName(plane)}</span>
                <span className="muted">{plane.airline ?? 'Unknown operator'}</span>
                <span className="meta">
                  {showAltitude ? `${feet(plane.altitudeM)} · ${miles(distanceKm * 1000)}` : 'At the airport'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

/** A live arrivals and departures board for one airport, worked out from what planes nearby are doing. */
export function AirportPanel({ airport, traffic, onSelect, onClose }: Props) {
  return (
    <div className="card airport-panel">
      <div className="card-header">
        <div>
          <h2>{airport.code}</h2>
          <p className="muted">{airport.name}</p>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <FlightList
        title="Arriving"
        empty="Nothing on approach right now."
        flights={traffic.arriving}
        onSelect={onSelect}
        showAltitude
      />
      <FlightList
        title="Departing"
        empty="Nothing climbing out right now."
        flights={traffic.departing}
        onSelect={onSelect}
        showAltitude
      />
      <FlightList
        title="On the ground"
        empty="No aircraft on the ground are reporting their position."
        flights={traffic.onGround}
        onSelect={onSelect}
        showAltitude={false}
      />
      <p className="muted small">
        There's no flight plan data, so this goes by what each plane is doing: low, descending and headed for the
        airport counts as arriving; low, climbing and headed away counts as departing.
      </p>
    </div>
  )
}
