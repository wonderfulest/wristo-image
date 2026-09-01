import { describe, expect, it } from 'vitest'
import {
  createCropRect,
  hitTestCropRect,
  moveCropRect,
  resizeCropRect,
} from './cropGeometry'

const bounds = { width: 400, height: 300 }

describe('crop geometry', () => {
  it('creates a fixed-ratio rectangle in every drag direction without leaving the image', () => {
    expect(createCropRect({ x: 300, y: 250 }, { x: 100, y: 50 }, bounds, 1)).toEqual({
      x: 100, y: 50, width: 200, height: 200,
    })
    const widescreen = createCropRect({ x: 350, y: 250 }, { x: 50, y: 100 }, bounds, 16 / 9)
    expect(widescreen.x).toBeCloseTo(83.3333)
    expect(widescreen).toMatchObject({ y: 100, height: 150 })
    expect(widescreen.width).toBeCloseTo(266.6667)
  })

  it('moves the crop rectangle while clamping it to the image', () => {
    expect(moveCropRect({ x: 50, y: 40, width: 100, height: 80 }, { x: 390, y: 290 }, bounds)).toEqual({
      x: 300, y: 220, width: 100, height: 80,
    })
  })

  it('freely resizes from an edge while keeping the opposite edge anchored', () => {
    expect(resizeCropRect(
      { x: 100, y: 80, width: 160, height: 120 },
      'w',
      { x: 40, y: 120 },
      bounds,
      null,
    )).toEqual({ x: 40, y: 80, width: 220, height: 120 })
  })

  it('resizes a fixed-ratio corner around its opposite corner', () => {
    expect(resizeCropRect(
      { x: 100, y: 80, width: 160, height: 120 },
      'se',
      { x: 340, y: 260 },
      bounds,
      4 / 3,
    )).toEqual({ x: 100, y: 80, width: 240, height: 180 })
  })

  it('resizes a fixed-ratio edge and keeps the perpendicular center stable', () => {
    expect(resizeCropRect(
      { x: 100, y: 80, width: 160, height: 120 },
      'e',
      { x: 300, y: 140 },
      bounds,
      4 / 3,
    )).toEqual({ x: 100, y: 65, width: 200, height: 150 })
  })

  it('identifies eight handles before the movable interior', () => {
    const rect = { x: 100, y: 80, width: 160, height: 120 }
    expect(hitTestCropRect({ x: 100, y: 80 }, rect, 10)).toBe('nw')
    expect(hitTestCropRect({ x: 180, y: 80 }, rect, 10)).toBe('n')
    expect(hitTestCropRect({ x: 180, y: 140 }, rect, 10)).toBe('move')
    expect(hitTestCropRect({ x: 20, y: 20 }, rect, 10)).toBeNull()
  })
})
