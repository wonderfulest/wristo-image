import type { PixelImage } from '@/features/background-remover/imageProcessor'

const twoDigits = (value: number): string => String(value).padStart(2, '0')

export const createCanvasHistoryName = (fileName: string, savedAt: Date): string => {
  const baseName = fileName.replace(/\.[^.]+$/, '').trim() || 'wristo-image'
  const time = `${twoDigits(savedAt.getHours())}${twoDigits(savedAt.getMinutes())}${twoDigits(savedAt.getSeconds())}`
  return `${baseName}-edited-${time}.png`
}

export const encodePixelImageAsPng = (image: PixelImage): Promise<Blob> => {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d')
  if (!context) return Promise.reject(new Error('当前浏览器无法创建图片画布。'))
  context.putImageData(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height), 0, 0)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('无法将当前画布编码为 PNG。')),
      'image/png',
    )
  })
}
