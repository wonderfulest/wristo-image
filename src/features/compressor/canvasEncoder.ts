import type { PixelImage } from '@/features/background-remover/imageProcessor'
import type { CompressedImageFormat } from './compressImage'

export const encodePixelImage = (
  image: PixelImage,
  format: CompressedImageFormat,
  quality: number,
): Promise<Blob> => {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d')
  if (!context) return Promise.reject(new Error('当前浏览器不支持图片编码'))
  context.putImageData(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height), 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('图片编码失败')),
      format === 'png' ? 'image/png' : 'image/jpeg',
      quality,
    )
  })
}
