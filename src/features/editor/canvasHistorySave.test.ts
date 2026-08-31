import { describe, expect, it } from 'vitest'
import { createCanvasHistoryName } from './canvasHistorySave'

describe('createCanvasHistoryName', () => {
  it('uses an English edited suffix and local HHmmss timestamp', () => {
    expect(createCanvasHistoryName('watch.face.webp', new Date(2026, 7, 31, 18, 32, 45)))
      .toBe('watch.face-edited-183245.png')
  })

  it('uses a stable English fallback when the original file has no usable name', () => {
    expect(createCanvasHistoryName('', new Date(2026, 7, 31, 1, 2, 3)))
      .toBe('wristo-image-edited-010203.png')
  })
})
