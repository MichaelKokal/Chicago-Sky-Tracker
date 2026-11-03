import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AIRPORTS, airportTraffic, type Airport } from './airports'
import { api, type LivePlane, type TrackPoint } from './api'
import { clockNow, LIVE, playbackAt, type Clock } from './clock'
import { AirportPanel } from './components/AirportPanel'
import { FlightMap, type Focus } from './components/FlightMap'
import { MapSettings } from './components/MapSettings'
import { OverheadPanel, type Pin } from './components/OverheadPanel'
import { PlaneDetails } from './components/PlaneDetails'
import { PlaybackBar } from './components/PlaybackBar'
import { SearchBox } from './components/SearchBox'
import { StatsPanel } from './components/StatsPanel'
import { currentFlight, displayName, emergency } from './planes'
import { passes, useSettings } from './settings'

type Tab = 'live' | 'overhead' | 'stats'

const REFRESH_MS = 10_000
/** In playback, fetch new positions after this much replayed time (the poller's interval). */
const PLAYBACK_STEP_MS = 30_000

/** What a shared link asks for: ?flight=a1b2c3&airport=ORD&t=2026-11-03T18:00:00Z */
function readUrl() {
  const params = new URLSearchParams(window.location.search)
  const flight = params.get('flight')
  const airport = params.get('airport')?.toUpperCase()
  const t = Date.parse(params.get('t') ?? '')
  return {
    flight: flight && /^[0-9a-f]{6}$/.test(flight) ? flight : null,
    airport: AIRPORTS.some((a) => a.code === airport) ? airport! : null,
    clock: Number.isNaN(t) || t > Date.now() ? LIVE : playbackAt(t),
  }
}

/** Keeps the address bar in step with what's on screen, so any view can be shared as a link. */
function writeUrl(flight: string | null, airport: string | null, clock: Clock) {
  const params = new URLSearchParams()
  if (flight) params.set('flight', flight)
  if (airport) params.set('airport', airport)
  if (clock.mode === 'playback') params.set('t', new Date(clockNow(clock)).toISOString().replace(/\.\d+Z$/, 'Z'))
  const query = params.toString()
  window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname)
}

/** "updated 12s ago", ticking every second. */
function Freshness({ planes }: { planes: LivePlane[] }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const newest = Math.max(...planes.map((p) => Date.parse(p.observedAt)))
  if (!Number.isFinite(newest)) return null
  const seconds = Math.max(0, Math.round((now - newest) / 1000))
  return <> · updated {seconds < 60 ? `${seconds}s` : `${Math.round(seconds / 60)} min`} ago</>
}

export default function App() {
  const [initial] = useState(readUrl)
  const [tab, setTab] = useState<Tab>('live')
  const [clock, setClock] = useState<Clock>(initial.clock)
  const [planes, setPlanes] = useState<LivePlane[]>([])
  const [offline, setOffline] = useState(false)
  const [selected, setSelected] = useState<string | null>(initial.flight)
  const [airportCode, setAirportCode] = useState<string | null>(initial.airport)
  const [follow, setFollow] = useState(false)
  const [focus, setFocus] = useState<Focus | null>(null)
  const [loadedTrack, setLoadedTrack] = useState<{ icao24: string; points: TrackPoint[] } | null>(null)
  const [pin, setPin] = useState<Pin | null>(null)
  const [settings, setSettings] = useSettings()
  const needsFocus = useRef(initial.flight != null)

  const playback = clock.mode === 'playback' ? clock : null

  // Live: refresh every few seconds.
  useEffect(() => {
    if (playback) return
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
  }, [playback])

  // Playback: fetch the map at the replayed moment each time the clock moves on by one poll interval.
  useEffect(() => {
    if (!playback) return
    let cancelled = false
    let fetchedAt: number | null = null
    let busy = false
    const step = Math.max(PLAYBACK_STEP_MS, playback.speed * 500)
    const check = () => {
      const at = clockNow(playback)
      if (busy || (fetchedAt != null && Math.abs(at - fetchedAt) < step)) return
      busy = true
      fetchedAt = at
      api
        .playback(new Date(at))
        .then((data) => {
          if (cancelled) return
          setPlanes(data)
          setOffline(false)
        })
        .catch(() => !cancelled && setOffline(true))
        .finally(() => (busy = false))
    }
    check()
    const timer = setInterval(check, 250)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [playback])

  // Load the selected plane's path, and keep it up to date as new positions come in.
  useEffect(() => {
    if (!selected) return
    let cancelled = false
    const until = playback ? new Date(clockNow(playback)) : undefined
    api.track(selected, until).then((points) => !cancelled && setLoadedTrack({ icao24: selected, points }))
    return () => {
      cancelled = true
    }
  }, [selected, planes, playback])

  // While replaying, the time keeps moving, so keep the link's time current too.
  useEffect(() => {
    writeUrl(selected, airportCode, clock)
    if (clock.mode === 'live') return
    const timer = setInterval(() => writeUrl(selected, airportCode, clock), 1000)
    return () => clearInterval(timer)
  }, [selected, airportCode, clock])

  const selectedPlane = planes.find((p) => p.icao24 === selected) ?? null
  const track = useMemo(
    () => (selected && loadedTrack?.icao24 === selected ? currentFlight(loadedTrack.points) : []),
    [selected, loadedTrack],
  )

  // A shared link names a plane; fly to it once it shows up.
  useEffect(() => {
    if (needsFocus.current && selectedPlane) {
      needsFocus.current = false
      setFocus({ lat: selectedPlane.latitude, lon: selectedPlane.longitude, zoom: 10 })
    }
  }, [selectedPlane])

  const isFaded = useCallback((plane: LivePlane) => !passes(plane, settings.filters), [settings.filters])
  const traffic = useMemo(() => airportTraffic(planes), [planes])
  const airport = AIRPORTS.find((a) => a.code === airportCode) ?? null
  const alerts = planes.filter((p) => emergency(p))
  const airborne = planes.filter((p) => !p.onGround).length
  const shown = planes.filter((p) => !isFaded(p)).length

  function selectPlane(icao24: string | null) {
    setSelected(icao24)
    setFollow(false)
  }

  function findPlane(plane: LivePlane) {
    selectPlane(plane.icao24)
    setTab('live')
    setFocus({ lat: plane.latitude, lon: plane.longitude, zoom: 11 })
  }

  function openAirport(code: string) {
    setAirportCode(code)
    setSelected(null)
    setTab('live')
  }

  function findAirport(a: Airport) {
    openAirport(a.code)
    setFocus({ lat: a.lat, lon: a.lon, zoom: 11 })
  }

  function handleMapClick(lat: number, lon: number) {
    if (tab !== 'overhead') return
    setPin({ lat, lon, radiusKm: pin?.radiusKm ?? 2, label: `${lat.toFixed(4)}, ${lon.toFixed(4)}` })
  }

  function startPlayback() {
    // Start an hour ago, already playing, so there's something to watch straight away.
    setClock(playbackAt(Date.now() - 3_600_000, 30, true))
  }

  return (
    <div className={`app${playback ? ' in-playback' : ''}`}>
      <FlightMap
        planes={planes}
        clock={clock}
        selected={selected}
        track={track}
        onSelect={selectPlane}
        follow={follow}
        onStopFollowing={() => setFollow(false)}
        labels={settings.labels}
        mapStyle={settings.mapStyle}
        isFaded={isFaded}
        airport={airportCode}
        onSelectAirport={openAirport}
        focus={focus}
        pin={tab === 'overhead' ? pin : null}
        onMapClick={handleMapClick}
      />

      {playback && <PlaybackBar clock={playback} onChange={setClock} onExit={() => setClock(LIVE)} />}

      <aside className="sidebar">
        <header className="brand">
          <div className="brand-row">
            <h1>Chicago Sky Tracker</h1>
            {!playback && (
              <button className="toggle small" onClick={startPlayback}>
                Playback
              </button>
            )}
          </div>
          <p className="muted small">
            {offline ? (
              <span className="error">Can't reach the server</span>
            ) : playback ? (
              <>
                <span className="replay-dot" /> Replaying history · {airborne} aircraft in the air
              </>
            ) : (
              <>
                <span className="live-dot" /> {airborne} aircraft in the air
                <Freshness planes={planes} />
              </>
            )}
          </p>
          <SearchBox planes={planes} onSelectPlane={findPlane} onSelectAirport={findAirport} />
        </header>

        <nav className="tabs">
          <button className={tab === 'live' ? 'active' : ''} onClick={() => setTab('live')}>
            Map
          </button>
          <button className={tab === 'overhead' ? 'active' : ''} onClick={() => setTab('overhead')}>
            Over my house
          </button>
          <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>
            Stats
          </button>
        </nav>

        <div className="panel">
          {alerts.map((plane) => (
            <button key={plane.icao24} className="alert-banner clickable" onClick={() => findPlane(plane)}>
              {displayName(plane)} is squawking {plane.squawk}: {emergency(plane)}
            </button>
          ))}

          {selectedPlane && (
            <PlaneDetails
              plane={selectedPlane}
              track={track}
              follow={follow}
              onFollowChange={setFollow}
              onClose={() => selectPlane(null)}
            />
          )}

          {tab === 'live' && airport && (
            <AirportPanel
              airport={airport}
              traffic={traffic.get(airport.code)!}
              onSelect={selectPlane}
              onClose={() => setAirportCode(null)}
            />
          )}
          {tab === 'live' && !selectedPlane && !airport && (
            <MapSettings settings={settings} onChange={setSettings} planes={planes} shown={shown} />
          )}
          {tab === 'overhead' && <OverheadPanel pin={pin} onPinChange={setPin} onSelect={selectPlane} />}
          {tab === 'stats' && <StatsPanel />}
        </div>
      </aside>
    </div>
  )
}
