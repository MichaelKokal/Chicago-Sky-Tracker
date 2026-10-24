import { useEffect, useState, type FormEvent } from 'react'
import { api, geocode, type Overhead } from '../api'
import { dateAndTime, feet, miles } from '../format'

export interface Pin {
  lat: number
  lon: number
  radiusKm: number
  label: string
}

interface Props {
  pin: Pin | null
  onPinChange: (pin: Pin) => void
  onSelect: (icao24: string) => void
}

export function OverheadPanel({ pin, onPinChange, onSelect }: Props) {
  const [address, setAddress] = useState('')
  const [radiusKm, setRadiusKm] = useState(pin?.radiusKm ?? 2)
  const [hours, setHours] = useState(24)
  const [loaded, setLoaded] = useState<{ key: string; results: Overhead[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Results belong to one exact search; while a new search is running, show "Searching…".
  const searchKey = pin ? `${pin.lat},${pin.lon},${pin.radiusKm},${hours}` : null
  const results = loaded && loaded.key === searchKey ? loaded.results : null
  const loading = searchKey != null && results == null && error == null

  async function search(event: FormEvent) {
    event.preventDefault()
    if (!address.trim()) return
    setError(null)
    try {
      const place = await geocode(address)
      if (!place) {
        setError("Couldn't find that address.")
        return
      }
      onPinChange({ lat: place.lat, lon: place.lon, radiusKm, label: place.label })
    } catch {
      setError('Address lookup failed. Try again in a moment.')
    }
  }

  // Re-run the search whenever the pin, radius, or time range changes.
  useEffect(() => {
    if (!pin || !searchKey) return
    let cancelled = false
    api
      .overhead(pin.lat, pin.lon, pin.radiusKm, hours)
      .then((data) => !cancelled && setLoaded({ key: searchKey, results: data }))
      .catch(() => !cancelled && setError('Search failed.'))
    return () => {
      cancelled = true
    }
  }, [pin, hours, searchKey])

  function changeRadius(value: number) {
    setError(null)
    setRadiusKm(value)
    if (pin) onPinChange({ ...pin, radiusKm: value })
  }

  return (
    <div className="card">
      <h2>What flew over me?</h2>
      <p className="muted small">Type an address, or click anywhere on the map.</p>
      <form onSubmit={search} className="search-row">
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Wrigley Field, Chicago" />
        <button type="submit">Search</button>
      </form>
      <div className="controls">
        <label>
          Within
          <select value={radiusKm} onChange={(e) => changeRadius(Number(e.target.value))}>
            <option value={1}>0.6 mi</option>
            <option value={2}>1.2 mi</option>
            <option value={5}>3 mi</option>
            <option value={10}>6 mi</option>
          </select>
        </label>
        <label>
          In the last
          <select value={hours} onChange={(e) => {
            setError(null)
            setHours(Number(e.target.value))
          }}>
            <option value={1}>hour</option>
            <option value={6}>6 hours</option>
            <option value={24}>24 hours</option>
            <option value={168}>week</option>
          </select>
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      {pin && <p className="muted small pin-label">📍 {pin.label}</p>}
      {loading && <p className="muted">Searching…</p>}
      {results && !loading && (
        <>
          <p className="result-count">
            {results.length} aircraft passed overhead
          </p>
          <ul className="result-list">
            {results.map((r) => (
              <li key={r.icao24}>
                <button onClick={() => onSelect(r.icao24)}>
                  <span className="callsign">{r.callsign ?? r.icao24.toUpperCase()}</span>
                  <span className="muted">{r.airline ?? 'Unknown operator'}</span>
                  <span className="meta">
                    {dateAndTime(r.observedAt)} · {feet(r.altitudeM)} · {miles(r.distanceM)} away
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
