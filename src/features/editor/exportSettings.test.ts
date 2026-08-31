import { describe, expect, it } from 'vitest'
import { hasTransparentPixels, resolveCurrentImageExportSettings } from './exportSettings'

describe('resolveCurrentImageExportSettings', () => {
  it('detects transparency from alpha pixels on the current canvas', () => {
    expect(hasTransparentPixels(new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 120]))).toBe(true)
    expect(hasTransparentPixels(new Uint8ClampedArray([1, 2, 3, 255]))).toBe(false)
  })
  it.each([
    ['image/png', 'photo.png', 'png'],
    ['image/jpeg', 'photo.jpg', 'jpeg'],
    ['image/webp', 'photo.webp', 'webp'],
  ] as const)('uses the current source image format for %s', (mimeType, fileName, format) => {
    expect(resolveCurrentImageExportSettings({
      width: 1280,
      height: 720,
      mimeType,
      fileName,
      hasTransparentResult: false,
    })).toEqual({ width: 1280, height: 720, format })
  })

  it('uses PNG for a transparent edited result while keeping its current dimensions', () => {
    expect(resolveCurrentImageExportSettings({
      width: 640,
      height: 640,
      mimeType: 'image/jpeg',
      fileName: 'photo.jpg',
      hasTransparentResult: true,
    })).toEqual({ width: 640, height: 640, format: 'png' })
  })
})
