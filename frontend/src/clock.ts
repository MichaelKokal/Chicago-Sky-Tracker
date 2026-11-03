/**
 * The time the map is showing. Live, that's simply now. In playback it's a moment in the past
 * that moves forward at some multiple of real time while playing.
 *
 * A clock is an immutable value: pausing, seeking or changing speed makes a new one, so
 * reading the current time never needs React state that changes every frame.
 */
export type Clock =
  | { mode: 'live' }
  | { mode: 'playback'; startedAt: number; from: number; speed: number; playing: boolean }

export const LIVE: Clock = { mode: 'live' }

export const PLAYBACK_SPEEDS = [1, 10, 30, 60, 120]

export function clockNow(clock: Clock): number {
  if (clock.mode === 'live') return Date.now()
  if (!clock.playing) return clock.from
  return clock.from + (Date.now() - clock.startedAt) * clock.speed
}

export function playbackAt(at: number, speed = 30, playing = false): Clock {
  return { mode: 'playback', startedAt: Date.now(), from: at, speed, playing }
}

/** The same clock, rebased to its current time, with some settings changed. */
export function adjust(clock: Clock, changes: { speed?: number; playing?: boolean; at?: number }): Clock {
  if (clock.mode === 'live') return clock
  return playbackAt(changes.at ?? clockNow(clock), changes.speed ?? clock.speed, changes.playing ?? clock.playing)
}
