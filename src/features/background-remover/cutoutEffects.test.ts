import { describe, expect, it } from 'vitest'
import type { PixelImage } from './imageProcessor'
import { applyContentAwareErase, applyRefineBrush, renderCutout } from './cutoutEffects'

const image = (width: number, height: number, pixels: number[]): PixelImage => ({
  width,
  height,
  data: new Uint8ClampedArray(pixels),
})

describe('applyRefineBrush', () => {
  it('erases pixels and restores them from the original crop', () => {
    const original = image(3, 1, [255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255])
    const cutout = image(3, 1, [...original.data])

    const erased = applyRefineBrush(cutout, original, { x: 1, y: 0, size: 1, hardness: 100, mode: 'erase' })
    expect(erased.data[7]).toBe(0)

    const restored = applyRefineBrush(erased, original, { x: 1, y: 0, size: 1, hardness: 100, mode: 'restore' })
    expect([...restored.data.slice(4, 8)]).toEqual([0, 255, 0, 255])
  })
})

describe('applyContentAwareErase', () => {
  it('replaces a painted object with the surrounding background instead of transparency', () => {
    const pixels: number[] = []
    for (let y = 0; y < 7; y += 1) for (let x = 0; x < 7; x += 1) {
      const objectPixel = x >= 2 && x <= 4 && y >= 2 && y <= 4
      pixels.push(...(objectPixel ? [255, 64, 64, 255] : [12, 14, 18, 255]))
    }

    const repaired = applyContentAwareErase(image(7, 7, pixels), {
      points: [{ x: 3, y: 3 }],
      size: 5,
      hardness: 100,
    })

    expect([...repaired.data.slice((3 * 7 + 3) * 4, (3 * 7 + 3) * 4 + 4)]).toEqual([12, 14, 18, 255])
  })

  it('preserves an opaque softly blended edge around the repaired area', () => {
    const pixels = Array.from({ length: 9 * 9 }, (_, index) => {
      const x = index % 9
      return [x * 10, x * 10, x * 10, 255]
    }).flat()

    const repaired = applyContentAwareErase(image(9, 9, pixels), {
      points: [{ x: 4, y: 4 }],
      size: 5,
      hardness: 50,
    })

    expect(repaired.data[(4 * 9 + 4) * 4 + 3]).toBe(255)
    expect(repaired.data[(4 * 9 + 2) * 4]).toBeCloseTo(20, 0)
  })
})

describe('renderCutout', () => {
  it('adds an outer stroke without replacing the subject', () => {
    const subject = image(1, 1, [255, 0, 0, 255])
    const rendered = renderCutout(subject, {
      background: { type: 'transparent' },
      outline: { width: 1, color: '#0066ff' },
    })

    expect([rendered.width, rendered.height]).toEqual([3, 3])
    expect([...rendered.data.slice(16, 20)]).toEqual([255, 0, 0, 255])
    expect([...rendered.data.slice(0, 4)]).toEqual([0, 102, 255, 255])
  })

  it('composites a solid background under transparent pixels', () => {
    const subject = image(2, 1, [255, 0, 0, 255, 0, 0, 0, 0])
    const rendered = renderCutout(subject, {
      background: { type: 'color', color: '#ffffff' },
      outline: { width: 0, color: '#000000' },
    })

    expect([...rendered.data]).toEqual([255, 0, 0, 255, 255, 255, 255, 255])
  })

  it('renders a vertical gradient background', () => {
    const subject = image(1, 2, [0, 0, 0, 0, 0, 0, 0, 0])
    const rendered = renderCutout(subject, {
      background: { type: 'gradient', from: '#000000', to: '#ffffff' },
      outline: { width: 0, color: '#000000' },
    })

    expect([...rendered.data.slice(0, 4)]).toEqual([0, 0, 0, 255])
    expect([...rendered.data.slice(4, 8)]).toEqual([255, 255, 255, 255])
  })
})
