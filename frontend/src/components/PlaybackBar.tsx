import { useEffect, useState } from 'react'
import { adjust, clockNow, PLAYBACK_SPEEDS, type Clock } from '../clock'

const HOUR = 3_600_000
const DAY = 24 * HOUR
/** The server keeps 90 days of history. */
const OLDEST_DAYS = 90

function dayInput(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function clockLabel(ms: number): string {
  return new Date(ms).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' })
}

interface Props {
  clock: Extract<Clock, { mode: 'playback' }>
  onChange: (clock: Clock) => void
  onExit: () => void
}

/** Replays the sky at any moment from stored history, at up to 120× real time. */
export function PlaybackBar({ clock, onChange, onExit }: Props) {
  // The clock moves on its own; re-render a few times a second to show it.
  const [wall, setWall] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setWall(Date.now()), 250)
    return () => clearInterval(timer)
  }, [])

  const now = clockNow(clock)
  const day = dayInput(now)

  // The slider covers the day being replayed, or the last 24 hours when that's today.
  const dayStart = new Date(`${day}T00:00`).getTime()
  const end = Math.min(dayStart + DAY, wall)
  const start = end - DAY

  // Stop at the present instead of running into the future.
  useEffect(() => {
    if (clock.playing && now >= Date.now() - 60_000) onChange(adjust(clock, { playing: false, at: Date.now() - 60_000 }))
  })

  function pickDay(value: string) {
    if (!value) return
    // Jump to the same time of day on the chosen day, as long as that's not in the future.
    const time = new Date(`${value}T00:00`).getTime() + (now - dayStart)
    onChange(adjust(clock, { at: Math.min(time, Date.now() - 60_000) }))
  }

  return (
    <div className="playback">
      <button
        className="play-button"
        onClick={() => onChange(adjust(clock, { playing: !clock.playing }))}
        aria-label={clock.playing ? 'Pause' : 'Play'}
      >
        {clock.playing ? '❚❚' : '▶'}
      </button>
      <div className="playback-main">
        <div className="playback-top">
          <strong>{clockLabel(now)}</strong>
          <span className="playback-options">
            <select
              value={clock.speed}
              onChange={(e) => onChange(adjust(clock, { speed: Number(e.target.value) }))}
              aria-label="Playback speed"
            >
              {PLAYBACK_SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s}×
                </option>
              ))}
            </select>
            <input
              type="date"
              value={day}
              min={dayInput(wall - OLDEST_DAYS * DAY)}
              max={dayInput(wall)}
              onChange={(e) => pickDay(e.target.value)}
              aria-label="Day to replay"
            />
            <button className="link-button" onClick={onExit}>
              Back to live
            </button>
          </span>
        </div>
        <input
          type="range"
          className="timeline"
          min={start}
          max={end}
          step={30_000}
          value={Math.min(Math.max(now, start), end)}
          onChange={(e) => onChange(adjust(clock, { at: Number(e.target.value) }))}
          aria-label="Playback time"
        />
        <div className="playback-axis small muted">
          <span>{new Date(start).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric' })}</span>
          <span>{new Date(end).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric' })}</span>
        </div>
      </div>
    </div>
  )
}
