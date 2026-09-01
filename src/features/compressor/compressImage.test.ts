import { describe, expect, it, vi } from 'vitest'
import type { PixelImage } from '@/features/background-remover/imageProcessor'
import { compressImageToTarget } from './compressImage'

const image = (width: number, height: number, alpha = 255): PixelImage => {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let offset = 3; offset < data.length; offset += 4) data[offset] = alpha
  return { width, height, data }
}

describe('compressImageToTarget', () => {
  it('uses JPEG for an opaque image and keeps the largest quality that fits', async () => {
    const encode = vi.fn(async (candidate: PixelImage, format: 'png' | 'jpeg', quality: number) =>
      new Blob([new Uint8Array(Math.round(candidate.width * candidate.height * quality))], { type: `image/${format}` }),
    )

    const result = await compressImageToTarget(image(100, 100), 5_000, { encode })

    expect(result.blob.size).toBeLessThanOrEqual(5_000)
    expect(result.format).toBe('jpeg')
    expect(result.width).toBe(100)
    expect(result.height).toBe(100)
    expect(result.quality).toBeGreaterThanOrEqual(0.49)
    expect(result.quality).toBeLessThanOrEqual(0.5)
  })

  it('keeps transparency and reduces dimensions until PNG fits the hard limit', async () => {
    const encode = vi.fn(async (candidate: PixelImage, format: 'png' | 'jpeg') =>
      new Blob([new Uint8Array(candidate.width * candidate.height)], { type: `image/${format}` }),
    )

    const result = await compressImageToTarget(image(100, 50, 128), 2_000, { encode })

    expect(result.blob.size).toBeLessThanOrEqual(2_000)
    expect(result.format).toBe('png')
    expect(result.width).toBeLessThan(100)
    expect(result.height / result.width).toBeCloseTo(0.5, 1)
    expect(result.quality).toBeNull()
  })

  it('throws instead of returning an oversized file when even 1 × 1 cannot fit', async () => {
    const encode = vi.fn(async () => new Blob([new Uint8Array(151_000)], { type: 'image/png' }))

    await expect(compressImageToTarget(image(2, 2, 128), 150_000, { encode }))
      .rejects.toThrow('无法压缩到指定大小')
  })
})
