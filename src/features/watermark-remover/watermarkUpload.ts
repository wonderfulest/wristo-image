import type { PixelImage } from '@/features/background-remover/imageProcessor'

// Keep the canvas untouched; encode a smaller copy for the cross-region AI upload.
export const encodeWatermarkUpload = (image: PixelImage): Promise<Blob> => {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d')
  if (!context) return Promise.reject(new Error('当前浏览器无法创建图片画布。'))
  context.putImageData(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height), 0, 0)
  let type = 'image/jpeg'
  for (let i = 3; i < image.data.length; i += 4) {
    if (image.data[i] !== 255) { type = 'image/png'; break }
  }
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error('无法编码 AI 上传图片。')),
    type,
    0.95,
  ))
}
