import { describe, expect, it } from 'vitest'
import {
  applyCutoutOutputOptions,
  fillSelectionWithColor,
  normalizeSelection,
  removeConnectedBackground,
  trimTransparentBounds,
  type PixelImage,
} from './imageProcessor'

const pixelImage = (rows: Array<Array<[number, number, number, number]>>): PixelImage => ({
  width: rows[0]?.length ?? 0,
  height: rows.length,
  data: new Uint8ClampedArray(rows.flat(2)),
})

const alphaAt = (image: PixelImage, x: number, y: number): number =>
  image.data[(y * image.width + x) * 4 + 3] ?? -1

describe('normalizeSelection', () => {
  it('normalizes a reverse drag and clamps it to the source image', () => {
    expect(normalizeSelection({ x: 5, y: 4, width: -7, height: -6 }, 4, 3)).toEqual({
      x: 0,
      y: 0,
      width: 4,
      height: 3,
    })
  })

  it('rejects a selection that contains no complete pixel', () => {
    expect(normalizeSelection({ x: 8, y: 8, width: 0.4, height: 0.4 }, 10, 10)).toBeNull()
  })
})

describe('removeConnectedBackground', () => {
  it('clears a near-black background connected to the selection edge', () => {
    const black = [2, 3, 5, 255] as const
    const orange = [255, 112, 20, 255] as const
    const source = pixelImage([
      [black, black, black, black, black],
      [black, orange, orange, orange, black],
      [black, orange, orange, orange, black],
      [black, orange, orange, orange, black],
      [black, black, black, black, black],
    ].map(row => row.map(pixel => [...pixel] as [number, number, number, number])))

    const result = removeConnectedBackground(source, { x: 0, y: 0, width: 5, height: 5 }, 18)

    expect(alphaAt(result, 0, 0)).toBe(0)
    expect(alphaAt(result, 2, 2)).toBe(255)
  })

  it('clears a background-colored region enclosed inside the subject', () => {
    const black = [0, 0, 0, 255] as const
    const orange = [250, 100, 10, 255] as const
    const source = pixelImage([
      [black, black, black, black, black],
      [black, orange, orange, orange, black],
      [black, orange, black, orange, black],
      [black, orange, orange, orange, black],
      [black, black, black, black, black],
    ].map(row => row.map(pixel => [...pixel] as [number, number, number, number])))

    const result = removeConnectedBackground(source, { x: 0, y: 0, width: 5, height: 5 }, 12)

    expect(alphaAt(result, 2, 2)).toBe(0)
  })

  it('keeps a subject edge that differs from the dominant border color', () => {
    const black = [0, 0, 0, 255] as const
    const yellow = [255, 200, 20, 255] as const
    const source = pixelImage([
      [black, black, yellow, black, black],
      [black, black, yellow, black, black],
      [black, black, yellow, black, black],
    ].map(row => row.map(pixel => [...pixel] as [number, number, number, number])))

    const result = removeConnectedBackground(source, { x: 0, y: 0, width: 5, height: 3 }, 10)

    expect(alphaAt(result, 2, 0)).toBe(255)
    expect(alphaAt(result, 0, 0)).toBe(0)
  })
})

describe('fillSelectionWithColor', () => {
  it('fills every pixel inside the selection, including foreground content', () => {
    const black = [0, 0, 0, 255] as const
    const orange = [250, 100, 10, 255] as const
    const source = pixelImage([
      [black, black, black, black, black],
      [black, orange, orange, orange, black],
      [black, orange, black, orange, black],
      [black, orange, orange, orange, black],
      [black, black, black, black, black],
    ].map(row => row.map(pixel => [...pixel] as [number, number, number, number])))

    const result = fillSelectionWithColor(source, { x: 0, y: 0, width: 5, height: 5 }, '#ffffff')

    expect(Array.from(result.data.slice(0, 4))).toEqual([255, 255, 255, 255])
    expect(Array.from(result.data.slice((2 * 5 + 2) * 4, (2 * 5 + 2) * 4 + 4))).toEqual([255, 255, 255, 255])
    expect(Array.from(result.data.slice((2 * 5 + 1) * 4, (2 * 5 + 1) * 4 + 4))).toEqual([255, 255, 255, 255])
  })

  it('does not modify matching pixels outside the selection', () => {
    const black = [0, 0, 0, 255] as const
    const source = pixelImage([[black, black, black, black]].map(row => row.map(pixel => [...pixel] as [number, number, number, number])))

    const result = fillSelectionWithColor(source, { x: 1, y: 0, width: 2, height: 1 }, '#ff0000')

    expect(Array.from(result.data)).toEqual([
      0, 0, 0, 255,
      255, 0, 0, 255,
      255, 0, 0, 255,
      0, 0, 0, 255,
    ])
  })
})

describe('trimTransparentBounds', () => {
  it('removes fully transparent padding without changing visible pixels', () => {
    const clear = [0, 0, 0, 0] as const
    const red = [220, 30, 40, 255] as const
    const source = pixelImage([
      [clear, clear, clear, clear],
      [clear, red, red, clear],
      [clear, clear, clear, clear],
    ].map(row => row.map(pixel => [...pixel] as [number, number, number, number])))

    const result = trimTransparentBounds(source)

    expect(result).toMatchObject({ width: 2, height: 1 })
    expect(Array.from(result?.data ?? [])).toEqual([220, 30, 40, 255, 220, 30, 40, 255])
  })

  it('returns null when the image contains no visible pixel', () => {
    const source = pixelImage([[[0, 0, 0, 0]]])

    expect(trimTransparentBounds(source)).toBeNull()
  })
})

describe('applyCutoutOutputOptions', () => {
  it('trims transparent padding and centers the subject on a square canvas', () => {
    const clear = [0, 0, 0, 0] as const
    const red = [220, 30, 40, 255] as const
    const source = pixelImage([
      [clear, clear, clear, clear],
      [clear, red, red, clear],
      [clear, clear, clear, clear],
    ].map(row => row.map(pixel => [...pixel] as [number, number, number, number])))

    const result = applyCutoutOutputOptions(source, { trimWhitespace: true, aspectRatio: 1 })

    expect(result).toMatchObject({ width: 2, height: 2 })
    expect(alphaAt(result, 0, 0)).toBe(255)
    expect(alphaAt(result, 1, 0)).toBe(255)
    expect(alphaAt(result, 0, 1)).toBe(0)
  })

  it('pads the shorter dimension without stretching visible pixels', () => {
    const red = [220, 30, 40, 255] as const
    const source = pixelImage([[red], [red], [red]].map(row => row.map(pixel => [...pixel] as [number, number, number, number])))

    const result = applyCutoutOutputOptions(source, { trimWhitespace: false, aspectRatio: 1 })

    expect(result).toMatchObject({ width: 3, height: 3 })
    expect([alphaAt(result, 0, 1), alphaAt(result, 1, 1), alphaAt(result, 2, 1)]).toEqual([0, 255, 0])
  })

  it('keeps the current canvas when the ratio is free', () => {
    const source = pixelImage([[[10, 20, 30, 255], [40, 50, 60, 255]]])

    const result = applyCutoutOutputOptions(source, { trimWhitespace: false, aspectRatio: null })

    expect(result).toBe(source)
  })
})
