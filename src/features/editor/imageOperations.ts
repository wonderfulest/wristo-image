import type { PixelImage, SelectionRect } from '@/features/background-remover/imageProcessor'

const createImage = (width: number, height: number): PixelImage => ({
  width,
  height,
  data: new Uint8ClampedArray(width * height * 4),
})

const copyPixel = (source: PixelImage, sourceX: number, sourceY: number, target: PixelImage, targetX: number, targetY: number): void => {
  const from = (sourceY * source.width + sourceX) * 4
  const to = (targetY * target.width + targetX) * 4
  target.data.set(source.data.subarray(from, from + 4), to)
}

export const cropImage = (source: PixelImage, rect: SelectionRect): PixelImage => {
  const x = Math.max(0, Math.floor(rect.x)); const y = Math.max(0, Math.floor(rect.y))
  const width = Math.min(source.width - x, Math.max(1, Math.floor(rect.width)))
  const height = Math.min(source.height - y, Math.max(1, Math.floor(rect.height)))
  const target = createImage(width, height)
  for (let row = 0; row < height; row += 1) {
    const start = ((y + row) * source.width + x) * 4
    target.data.set(source.data.subarray(start, start + width * 4), row * width * 4)
  }
  return target
}

export const rotateImage = (source: PixelImage, direction: 'clockwise' | 'counter-clockwise'): PixelImage => {
  const target = createImage(source.height, source.width)
  for (let y = 0; y < source.height; y += 1) for (let x = 0; x < source.width; x += 1) {
    if (direction === 'clockwise') copyPixel(source, x, y, target, source.height - 1 - y, x)
    else copyPixel(source, x, y, target, y, source.width - 1 - x)
  }
  return target
}

export const flipImage = (source: PixelImage, direction: 'horizontal' | 'vertical'): PixelImage => {
  const target = createImage(source.width, source.height)
  for (let y = 0; y < source.height; y += 1) for (let x = 0; x < source.width; x += 1) {
    copyPixel(source, x, y, target, direction === 'horizontal' ? source.width - 1 - x : x, direction === 'vertical' ? source.height - 1 - y : y)
  }
  return target
}

export const resizeImage = (source: PixelImage, width: number, height: number): PixelImage => {
  const safeWidth = Math.max(1, Math.min(8192, Math.round(width)))
  const safeHeight = Math.max(1, Math.min(8192, Math.round(height)))
  const target = createImage(safeWidth, safeHeight)
  for (let y = 0; y < safeHeight; y += 1) for (let x = 0; x < safeWidth; x += 1) {
    const sourceX = Math.min(source.width - 1, Math.round(x * (source.width - 1) / Math.max(1, safeWidth - 1)))
    const sourceY = Math.min(source.height - 1, Math.round(y * (source.height - 1) / Math.max(1, safeHeight - 1)))
    copyPixel(source, sourceX, sourceY, target, x, y)
  }
  return target
}
