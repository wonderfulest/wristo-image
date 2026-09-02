import { beforeEach, describe, expect, it } from 'vitest'
import {
  CUTOUT_PREFERENCES_STORAGE_KEY,
  loadCutoutPreferences,
  saveCutoutPreferences,
} from './cutoutPreferences'

describe('cutoutPreferences', () => {
  beforeEach(() => localStorage.clear())

  it('restores the locally saved ratio, whitespace setting, and tolerance', () => {
    localStorage.setItem(CUTOUT_PREFERENCES_STORAGE_KEY, JSON.stringify({
      version: 1,
      aspectRatio: 1,
      trimWhitespace: true,
      tolerance: 46,
    }))

    expect(loadCutoutPreferences(localStorage)).toEqual({
      aspectRatio: 1,
      trimWhitespace: true,
      tolerance: 46,
    })
  })

  it('restores a tolerance across the full RGB color-distance range', () => {
    localStorage.setItem(CUTOUT_PREFERENCES_STORAGE_KEY, JSON.stringify({
      version: 1,
      aspectRatio: null,
      trimWhitespace: false,
      tolerance: 300,
    }))

    expect(loadCutoutPreferences(localStorage).tolerance).toBe(300)
  })

  it('falls back safely when persisted data is invalid', () => {
    localStorage.setItem(CUTOUT_PREFERENCES_STORAGE_KEY, '{broken')

    expect(loadCutoutPreferences(localStorage)).toEqual({
      aspectRatio: null,
      trimWhitespace: false,
      tolerance: 28,
    })
  })

  it('writes a versioned configuration', () => {
    saveCutoutPreferences(localStorage, { aspectRatio: 9 / 16, trimWhitespace: true, tolerance: 35 })

    expect(JSON.parse(localStorage.getItem(CUTOUT_PREFERENCES_STORAGE_KEY) ?? '')).toEqual({
      version: 1,
      aspectRatio: 9 / 16,
      trimWhitespace: true,
      tolerance: 35,
    })
  })
})
