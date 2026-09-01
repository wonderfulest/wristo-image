import { describe, expect, it } from 'vitest'
import { loadResizeMode, RESIZE_MODE_STORAGE_KEY, saveResizeMode } from './resizePreferences'

describe('resize mode preferences', () => {
  it('defaults to centered cover when no preference exists', () => {
    expect(loadResizeMode(localStorage)).toBe('cover')
  })

  it('persists and restores every supported mode', () => {
    saveResizeMode(localStorage, 'contain')
    expect(localStorage.getItem(RESIZE_MODE_STORAGE_KEY)).toBe('contain')
    expect(loadResizeMode(localStorage)).toBe('contain')
  })

  it('falls back to centered cover for an invalid stored value', () => {
    localStorage.setItem(RESIZE_MODE_STORAGE_KEY, 'unknown')
    expect(loadResizeMode(localStorage)).toBe('cover')
  })
})
