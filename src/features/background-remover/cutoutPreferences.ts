import { MAX_CUTOUT_TOLERANCE } from './cutoutTolerance'

export const CUTOUT_PREFERENCES_STORAGE_KEY = 'wristo-image:cutout-preferences:v1'

export interface CutoutPreferences {
  aspectRatio: number | null
  trimWhitespace: boolean
  tolerance: number
}

const DEFAULT_PREFERENCES: CutoutPreferences = {
  aspectRatio: null,
  trimWhitespace: false,
  tolerance: 28,
}

const SUPPORTED_RATIOS = new Set([1, 4 / 3, 3 / 4, 16 / 9, 9 / 16])

export const loadCutoutPreferences = (storage: Storage): CutoutPreferences => {
  try {
    const parsed = JSON.parse(storage.getItem(CUTOUT_PREFERENCES_STORAGE_KEY) ?? '') as Record<string, unknown>
    if (parsed.version !== 1) return { ...DEFAULT_PREFERENCES }
    return {
      aspectRatio: parsed.aspectRatio === null || SUPPORTED_RATIOS.has(Number(parsed.aspectRatio))
        ? parsed.aspectRatio as number | null
        : DEFAULT_PREFERENCES.aspectRatio,
      trimWhitespace: typeof parsed.trimWhitespace === 'boolean'
        ? parsed.trimWhitespace
        : DEFAULT_PREFERENCES.trimWhitespace,
      tolerance: Number.isInteger(parsed.tolerance) && Number(parsed.tolerance) >= 0 && Number(parsed.tolerance) <= MAX_CUTOUT_TOLERANCE
        ? Number(parsed.tolerance)
        : DEFAULT_PREFERENCES.tolerance,
    }
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

export const saveCutoutPreferences = (storage: Storage, preferences: CutoutPreferences): void => {
  try {
    storage.setItem(CUTOUT_PREFERENCES_STORAGE_KEY, JSON.stringify({ version: 1, ...preferences }))
  } catch {
    // Persistence is optional when storage is unavailable or full.
  }
}
