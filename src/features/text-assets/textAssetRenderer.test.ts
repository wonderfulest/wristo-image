import { describe, expect, it } from 'vitest'
import { calculateSharedCanvas, normalizeTextAssetFileName } from './textAssetRenderer'

describe('textAssetRenderer', () => {
  it('uses the widest and tallest rendered text plus the shared safety padding', () => {
    expect(calculateSharedCanvas([
      { width: 44.2, height: 18.1 },
      { width: 61.7, height: 15.5 },
      { width: 39.4, height: 23.2 },
    ], 6)).toEqual({ width: 74, height: 36 })
  })

  it('keeps a PNG extension while producing a safe export filename', () => {
    expect(normalizeTextAssetFileName(' AM/PM .PNG ', 'text')).toBe('AM-PM.png')
    expect(normalizeTextAssetFileName('', 'text-2')).toBe('text-2.png')
  })
})
