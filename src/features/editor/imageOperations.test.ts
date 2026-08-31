import { describe, expect, it } from 'vitest'
import { cropImage, flipImage, resizeImage, rotateImage } from './imageOperations'
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

  it('flips horizontally and vertically', () => {
    const source = image(2, 2, [1, 2, 3, 4])
    expect(reds(flipImage(source, 'horizontal'))).toEqual([2, 1, 4, 3])
    expect(reds(flipImage(source, 'vertical'))).toEqual([3, 4, 1, 2])
  })

  it('resizes while preserving the four corners', () => {
    expect(reds(resizeImage(image(2, 2, [1, 2, 3, 4]), 3, 3))).toEqual([1, 2, 2, 3, 4, 4, 3, 4, 4])
  })
})
