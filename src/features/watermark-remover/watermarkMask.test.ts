import { describe, expect, it } from 'vitest'
import { applyMaskBrush, applyMaskRectangle, createWatermarkMask, maskToRgba } from './watermarkMask'

describe('watermark mask', () => {
  it('adds rectangular and brush regions and can erase them', () => {
    const mask = createWatermarkMask(10, 10)
    applyMaskRectangle(mask, { x: 2, y: 2, width: 3, height: 2 }, true)
    expect(mask.data[2 * 10 + 2]).toBe(255)
    expect(mask.data[3 * 10 + 4]).toBe(255)

    applyMaskBrush(mask, { x: 5, y: 5 }, 4, true)
    expect(mask.data[5 * 10 + 5]).toBe(255)
    applyMaskBrush(mask, { x: 5, y: 5 }, 2, false)
    expect(mask.data[5 * 10 + 5]).toBe(0)
  })

  it('exports a strict black and white rgba mask', () => {
    const mask = createWatermarkMask(2, 1)
    mask.data[1] = 255

    expect(Array.from(maskToRgba(mask))).toEqual([
      0, 0, 0, 255,
      255, 255, 255, 255,
    ])
  })
})
