import { useEffect, useState } from 'react'
import { api, type LivePlane, type TrackPoint } from './api'
import { FlightMap } from './components/FlightMap'
import { OverheadPanel, type Pin } from './components/OverheadPanel'
import { PlaneDetails } from './components/PlaneDetails'
import { StatsPanel } from './components/StatsPanel'
import { altitudeLegend } from './format'

type Tab = 'live' | 'overhead' | 'stats'

const REFRESH_MS = 10_000

export default function App() {
  const [tab, setTab] = useState<Tab>('live')
  const [planes, setPlanes] = useState<LivePlane[]>([])
  const [offline, setOffline] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [loadedTrack, setLoadedTrack] = useState<{ icao24: string; points: TrackPoint[] } | null>(null)
  const [pin, setPin] = useState<Pin | null>(null)

  // Refresh the live picture every few seconds.
  useEffect(() => {
    let cancelled = false
    const load = () =>
      api
        .live()
        .then((data) => {
          if (cancelled) return
          setPlanes(data)
          setOffline(false)
        })
        .catch(() => !cancelled && setOffline(true))
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  // Load the selected plane's path, and keep it up to date as new positions come in.
  useEffect(() => {
    if (!selected) return
    let cancelled = false
    api.track(selected).then((points) => !cancelled && setLoadedTrack({ icao24: selected, points }))
    return () => {
      cancelled = true
    }
  }, [selected, planes])

  const track = selected && loadedTrack?.icao24 === selected ? loadedTrack.points : []
  const selectedPlane = planes.find((p) => p.icao24 === selected) ?? null
  const airborne = planes.filter((p) => !p.onGround).length

  function handleMapClick(lat: number, lon: number) {
    if (tab !== 'overhead') return
    setPin({ lat, lon, radiusKm: pin?.radiusKm ?? 2, label: `${lat.toFixed(4)}, ${lon.toFixed(4)}` })
  }

  return (
    <div className="app">
      <FlightMap
        planes={planes}
        selected={selected}
        track={track}
        onSelect={setSelected}
        pin={tab === 'overhead' ? pin : null}
        onMapClick={handleMapClick}
      />

      <aside className="sidebar">
        <header className="brand">
          <h1>Chicago Sky Tracker</h1>
          <p className="muted small">
            {offline ? (
              <span className="error">Can't reach the server</span>
            ) : (
              <>
                <span className="live-dot" /> {airborne} aircraft in the air right now
              </>
            )}
          </p>
        </header>

        <nav className="tabs">
          <button className={tab === 'live' ? 'active' : ''} onClick={() => setTab('live')}>
            Live
          </button>
          <button className={tab === 'overhead' ? 'active' : ''} onClick={() => setTab('overhead')}>
            Over my house
          </button>
          <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>
            Stats
          </button>
        </nav>

        <div className="panel">
          {selectedPlane && <PlaneDetails plane={selectedPlane} track={track} onClose={() => setSelected(null)} />}

          {tab === 'live' && !selectedPlane && (
            <div className="card">
              <h2>Live map</h2>
              <p className="muted">Click any plane to see where it's been and how high and fast it's going.</p>
              <ul className="legend">
                {altitudeLegend.map((item) => (
                  <li key={item.label}>
                    <span className="swatch" style={{ background: item.color }} />
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {tab === 'overhead' && <OverheadPanel pin={pin} onPinChange={setPin} onSelect={setSelected} />}
          {tab === 'stats' && <StatsPanel />}
        </div>
      </aside>
    </div>
  )
}
