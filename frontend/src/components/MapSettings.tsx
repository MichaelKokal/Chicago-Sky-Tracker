import type { LivePlane } from '../api'
import { altitudeLegend } from '../format'
import { KIND_LABELS, type Kind } from '../planes'
import { DEFAULT_FILTERS, filtersActive, type MapStyle, type Settings } from '../settings'

const ALTITUDE_STEPS = [0, 3000, 10000, 20000, 30000]
const KINDS = Object.keys(KIND_LABELS) as Kind[]

interface Props {
  settings: Settings
  onChange: (settings: Settings) => void
  planes: LivePlane[]
  shown: number
}

/** Filters, labels and map style for the live map. */
export function MapSettings({ settings, onChange, planes, shown }: Props) {
  const { filters } = settings
  const airlines = [...new Set(planes.map((p) => p.airline).filter((a): a is string => a != null))].sort()
  const setFilters = (changes: Partial<typeof filters>) => onChange({ ...settings, filters: { ...filters, ...changes } })

  function toggleKind(kind: Kind) {
    const kinds = filters.kinds.includes(kind) ? filters.kinds.filter((k) => k !== kind) : [...filters.kinds, kind]
    setFilters({ kinds })
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Map</h2>
        {filtersActive(filters) && (
          <button className="link-button" onClick={() => setFilters(DEFAULT_FILTERS)}>
            Clear filters
          </button>
        )}
      </div>
      <p className="muted small">
        Click a plane for its flight path, or an airport for arrivals and departures.
        {filtersActive(filters) && ` Showing ${shown} of ${planes.length}; the rest are faded.`}
      </p>

      <h3>Style</h3>
      <div className="segmented">
        {(['dark', 'light', 'satellite'] as MapStyle[]).map((style) => (
          <button
            key={style}
            className={settings.mapStyle === style ? 'active' : ''}
            onClick={() => onChange({ ...settings, mapStyle: style })}
          >
            {style[0].toUpperCase() + style.slice(1)}
          </button>
        ))}
      </div>
      <label className="check">
        <input type="checkbox" checked={settings.labels} onChange={(e) => onChange({ ...settings, labels: e.target.checked })} />
        Show callsigns on the map
      </label>

      <h3>Filters</h3>
      <div className="controls wrap">
        <label>
          Altitude
          <select
            value={filters.minFeet ?? ''}
            onChange={(e) => setFilters({ minFeet: e.target.value === '' ? null : Number(e.target.value) || null })}
          >
            {ALTITUDE_STEPS.map((ft) => (
              <option key={ft} value={ft === 0 ? '' : ft}>
                {ft === 0 ? 'any' : `${ft.toLocaleString()} ft`}
              </option>
            ))}
          </select>
          to
          <select
            value={filters.maxFeet ?? ''}
            onChange={(e) => setFilters({ maxFeet: e.target.value === '' ? null : Number(e.target.value) })}
          >
            {ALTITUDE_STEPS.slice(1).map((ft) => (
              <option key={ft} value={ft}>
                {ft.toLocaleString()} ft
              </option>
            ))}
            <option value="">any</option>
          </select>
        </label>
        <label>
          Airline
          <select value={filters.airline ?? ''} onChange={(e) => setFilters({ airline: e.target.value || null })}>
            <option value="">All</option>
            {airlines.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="chips">
        {KINDS.map((k) => (
          <button key={k} className={filters.kinds.includes(k) ? 'chip on' : 'chip'} onClick={() => toggleKind(k)}>
            {KIND_LABELS[k]}
          </button>
        ))}
        <button
          className={filters.showOnGround ? 'chip on' : 'chip'}
          onClick={() => setFilters({ showOnGround: !filters.showOnGround })}
        >
          On the ground
        </button>
      </div>

      <h3>Altitude colors</h3>
      <ul className="legend">
        {altitudeLegend.map((item) => (
          <li key={item.label}>
            <span className="swatch" style={{ background: item.color }} />
            {item.label}
          </li>
        ))}
        <li>
          <span className="swatch" style={{ background: '#ef4444' }} />
          Emergency squawk
        </li>
      </ul>
    </div>
  )
}
