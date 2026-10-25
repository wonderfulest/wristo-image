import { expect, it, vi } from 'vitest'
import { encodeWatermarkUpload } from './watermarkUpload'

it.each([255, 0])('preserves dimensions and uses PNG only for transparent images (alpha %i)', async alpha => {
  vi.stubGlobal('ImageData', class { constructor(public data: Uint8ClampedArray, public width: number, public height: number) {} })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ putImageData: vi.fn() } as never)
  const encode = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb, type) => cb(new Blob(['pixels'], { type })))
  const result = await encodeWatermarkUpload({ width: 1, height: 1, data: new Uint8ClampedArray([20, 30, 40, alpha]) })
  expect(result.type).toBe(alpha === 255 ? 'image/jpeg' : 'image/png')
  expect(encode).toHaveBeenCalledWith(expect.any(Function), alpha === 255 ? 'image/jpeg' : 'image/png', 0.95)
  expect((encode.mock.contexts[0] as unknown as HTMLCanvasElement).width).toBe(1)
  expect((encode.mock.contexts[0] as unknown as HTMLCanvasElement).height).toBe(1)
})
