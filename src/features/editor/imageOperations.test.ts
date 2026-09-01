import { describe, expect, it } from 'vitest'
import { cropImage, fitImageToSize, flipImage, resizeImage, rotateImage, rotateImageByAngle } from './imageOperations'
import type { PixelImage } from '@/features/background-remover/imageProcessor'

const image = (width: number, height: number, values: number[]): PixelImage => ({
  width, height, data: new Uint8ClampedArray(values.flatMap(value => [value, 0, 0, 255])),
})
const reds = (value: PixelImage): number[] => Array.from({ length: value.width * value.height }, (_, i) => value.data[i * 4]!)

describe('image geometry operations', () => {
  it('crops an exact pixel rectangle', () => {
    expect(reds(cropImage(image(3, 2, [1, 2, 3, 4, 5, 6]), { x: 1, y: 0, width: 2, height: 2 }))).toEqual([2, 3, 5, 6])
  })

  it('rotates clockwise and counter-clockwise', () => {
    const source = image(2, 3, [1, 2, 3, 4, 5, 6])
    expect(reds(rotateImage(source, 'clockwise'))).toEqual([5, 3, 1, 6, 4, 2])
    expect(reds(rotateImage(source, 'counter-clockwise'))).toEqual([2, 4, 6, 1, 3, 5])
  })

  it('uses positive degrees for clockwise rotation without blurring right angles', () => {
    const source = image(2, 3, [1, 2, 3, 4, 5, 6])
    expect(reds(rotateImageByAngle(source, 90))).toEqual([5, 3, 1, 6, 4, 2])
    expect(reds(rotateImageByAngle(source, -90))).toEqual([2, 4, 6, 1, 3, 5])
  })

  it('expands the transparent canvas so arbitrary-angle rotation is not clipped', () => {
    const result = rotateImageByAngle(image(2, 4, [1, 2, 3, 4, 5, 6, 7, 8]), 30)

    expect([result.width, result.height]).toEqual([4, 5])
    expect(result.data[3]).toBe(0)
    expect(result.data[(result.width * result.height - 1) * 4 + 3]).toBe(0)
    expect(Math.max(...reds(result))).toBeGreaterThan(0)
  })

  it('keeps the source center fixed while rotating around it', () => {
    const result = rotateImageByAngle(image(3, 3, [0, 0, 0, 0, 9, 0, 0, 0, 0]), 45)
    const center = (Math.floor(result.height / 2) * result.width + Math.floor(result.width / 2)) * 4

    expect([result.width, result.height]).toEqual([5, 5])
    expect(result.data[center]).toBe(9)
    expect(result.data[center + 3]).toBe(255)
  })

  it('flips horizontally and vertically', () => {
    const source = image(2, 2, [1, 2, 3, 4])
    expect(reds(flipImage(source, 'horizontal'))).toEqual([2, 1, 4, 3])
    expect(reds(flipImage(source, 'vertical'))).toEqual([3, 4, 1, 2])
  })

  it('resizes while preserving the four corners', () => {
    expect(reds(resizeImage(image(2, 2, [1, 2, 3, 4]), 3, 3))).toEqual([1, 2, 2, 3, 4, 4, 3, 4, 4])
  })

  it('center-crops an image to cover the requested size without distortion', () => {
    expect(reds(fitImageToSize(image(4, 2, [1, 2, 3, 4, 5, 6, 7, 8]), 2, 2, 'cover'))).toEqual([2, 3, 6, 7])
  })

  it('contains the complete image and pads unused pixels with transparency', () => {
    const result = fitImageToSize(image(1, 2, [9, 8]), 3, 2, 'contain')

    expect(reds(result)).toEqual([0, 9, 0, 0, 8, 0])
    expect(result.data[3]).toBe(0)
  })

  it('stretches an image to the exact requested size', () => {
    expect(reds(fitImageToSize(image(2, 1, [1, 2]), 2, 2, 'stretch'))).toEqual([1, 2, 1, 2])
  })
})
