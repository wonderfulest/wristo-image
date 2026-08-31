import { describe, expect, it } from 'vitest'
import { validateImageFile, validateImageDimensions } from './fileValidation'

describe('validateImageFile', () => {
  it('accepts a supported image below the local processing limit', () => {
    const file = new File(['image'], 'icon.webp', { type: 'image/webp' })

    expect(validateImageFile(file)).toBeNull()
  })

  it('rejects unsupported image formats', () => {
    const file = new File(['image'], 'icon.svg', { type: 'image/svg+xml' })

    expect(validateImageFile(file)).toBe('仅支持 PNG、JPEG 和 WebP 图片。')
  })

  it('rejects files larger than 25 MB', () => {
    const file = new File([new Uint8Array(25 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })

    expect(validateImageFile(file)).toBe('图片不能超过 25 MB。')
  })
})

describe('validateImageDimensions', () => {
  it('rejects an image whose width or height exceeds 8192 pixels', () => {
    expect(validateImageDimensions(8193, 400)).toBe('图片尺寸不能超过 8192 × 8192 像素。')
  })

  it('accepts a non-empty image within the dimension limit', () => {
    expect(validateImageDimensions(1200, 1200)).toBeNull()
  })
})
