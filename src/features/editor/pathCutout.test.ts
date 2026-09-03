import { describe, expect, it } from 'vitest'
import { applyPathCutout, createPathCutoutSegments } from './pathCutout'

const opaqueImage = (width: number, height: number) => ({
  width,
  height,
  data: new Uint8ClampedArray(width * height * 4).fill(255),
})

describe('path cutout', () => {
  it('places equal-size segments along a smooth path and rotates them with the tangent', () => {
    const segments = createPathCutoutSegments({
      points: [{ x: 0, y: 10 }, { x: 30, y: 0 }, { x: 60, y: 10 }],
      smooth: true,
      count: 3,
      gap: 2,
      height: 8,
      slant: 3,
      cornerRadius: 2,
    })

    expect(segments).toHaveLength(3)
    expect(segments.map(segment => segment.width)).toEqual([segments[0]!.width, segments[0]!.width, segments[0]!.width])
    expect(segments[0]!.angle).not.toBeCloseTo(segments[1]!.angle)
    expect(segments[2]!.center.x).toBeGreaterThan(segments[1]!.center.x)
  })

  it('turns only the generated parallelograms transparent and keeps surrounding pixels opaque', () => {
    const result = applyPathCutout(opaqueImage(40, 20), {
      points: [{ x: 4, y: 10 }, { x: 36, y: 10 }],
      smooth: false,
      count: 2,
      gap: 4,
      height: 8,
      slant: 2,
      cornerRadius: 2,
    })

    expect(result.data[(10 * result.width + 10) * 4 + 3]).toBe(0)
    expect(result.data[(10 * result.width + 30) * 4 + 3]).toBe(0)
    expect(result.data[3]).toBe(255)
    expect(result.data[(1 * result.width + 20) * 4 + 3]).toBe(255)
  })

  it('returns no segments when a path has fewer than two nodes', () => {
    expect(createPathCutoutSegments({
      points: [{ x: 4, y: 4 }], smooth: false, count: 6, gap: 2, height: 8, slant: 2, cornerRadius: 2,
    })).toEqual([])
  })
})
