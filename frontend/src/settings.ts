import { useEffect, useState } from 'react'
import type { LivePlane } from './api'
import { kind, type Kind } from './planes'

export type MapStyle = 'dark' | 'light' | 'satellite'

export interface Filters {
  showOnGround: boolean
  /** Lowest and highest altitude to show, in feet. null means no limit. */
  minFeet: number | null
  maxFeet: number | null
  kinds: Kind[]
  /** Show only this airline (by name), or every airline when null. */
  airline: string | null
}

export interface Settings {
  filters: Filters
  labels: boolean
  mapStyle: MapStyle
}

export const DEFAULT_FILTERS: Filters = {
  showOnGround: true,
  minFeet: null,
  maxFeet: null,
  kinds: ['heavy', 'jet', 'light', 'helicopter', 'ground'],
  airline: null,
}

const DEFAULTS: Settings = { filters: DEFAULT_FILTERS, labels: false, mapStyle: 'dark' }
const STORAGE_KEY = 'sky-tracker-settings'

function load(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (saved) return { ...DEFAULTS, ...saved, filters: { ...DEFAULT_FILTERS, ...saved.filters } }
  } catch {
    // Storage can be blocked or hold something old; the defaults are fine.
  }
  return DEFAULTS
}

/** Map settings, remembered between visits. */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // Not being able to save settings isn't worth bothering anyone about.
    }
  }, [settings])
  return [settings, setSettings] as const
}

export function filtersActive(filters: Filters): boolean {
  return JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS)
}

/** Planes that don't pass are still drawn, just faded, so the map never looks emptier than the sky is. */
export function passes(plane: LivePlane, filters: Filters): boolean {
  if (plane.onGround && !filters.showOnGround) return false
  if (!filters.kinds.includes(kind(plane))) return false
  if (filters.airline && plane.airline !== filters.airline) return false
  if (plane.onGround) return true
  const feet = plane.altitudeM == null ? null : plane.altitudeM * 3.28084
  if (filters.minFeet != null && (feet == null || feet < filters.minFeet)) return false
  if (filters.maxFeet != null && (feet == null || feet > filters.maxFeet)) return false
  return true
}
