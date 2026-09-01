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

const normalizedQuarterTurns = (degrees: number): 0 | 1 | 2 | 3 | null => {
  const normalized = ((degrees % 360) + 360) % 360
  const turns = Math.round(normalized / 90) % 4
  return Math.abs(normalized - turns * 90) < 1e-10 || Math.abs(normalized - 360) < 1e-10
    ? turns as 0 | 1 | 2 | 3
    : null
}

const sampleBilinear = (source: PixelImage, x: number, y: number, target: PixelImage, targetX: number, targetY: number): void => {
  const left = Math.floor(x)
  const top = Math.floor(y)
  const weights = [
    [left, top, (1 - (x - left)) * (1 - (y - top))],
    [left + 1, top, (x - left) * (1 - (y - top))],
    [left, top + 1, (1 - (x - left)) * (y - top)],
    [left + 1, top + 1, (x - left) * (y - top)],
  ]
  let alpha = 0
  const premultiplied = [0, 0, 0]
  for (const [sampleX, sampleY, weight] of weights) {
    if (sampleX! < 0 || sampleX! >= source.width || sampleY! < 0 || sampleY! >= source.height) continue
    const offset = (sampleY! * source.width + sampleX!) * 4
    const sampleAlpha = source.data[offset + 3]! / 255
    alpha += sampleAlpha * weight!
    for (let channel = 0; channel < 3; channel += 1) premultiplied[channel]! += source.data[offset + channel]! * sampleAlpha * weight!
  }
  const targetOffset = (targetY * target.width + targetX) * 4
  if (alpha > 0) for (let channel = 0; channel < 3; channel += 1) target.data[targetOffset + channel] = premultiplied[channel]! / alpha
  target.data[targetOffset + 3] = alpha * 255
}

export const rotateImageByAngle = (source: PixelImage, degrees: number): PixelImage => {
  const safeDegrees = Number.isFinite(degrees) ? degrees : 0
  const quarterTurns = normalizedQuarterTurns(safeDegrees)
  if (quarterTurns !== null) {
    let result = createImage(source.width, source.height)
    result.data.set(source.data)
    for (let turn = 0; turn < quarterTurns; turn += 1) result = rotateImage(result, 'clockwise')
    return result
  }

  const radians = safeDegrees * Math.PI / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const width = Math.ceil(Math.abs(source.width * cosine) + Math.abs(source.height * sine))
  const height = Math.ceil(Math.abs(source.width * sine) + Math.abs(source.height * cosine))
  const target = createImage(width, height)
  const sourceCenterX = (source.width - 1) / 2
  const sourceCenterY = (source.height - 1) / 2
  const targetCenterX = (width - 1) / 2
  const targetCenterY = (height - 1) / 2

  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const targetX = x - targetCenterX
    const targetY = y - targetCenterY
    const sourceX = cosine * targetX + sine * targetY + sourceCenterX
    const sourceY = -sine * targetX + cosine * targetY + sourceCenterY
    sampleBilinear(source, sourceX, sourceY, target, x, y)
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

export type ImageFitMode = 'cover' | 'contain' | 'stretch'

export const fitImageToSize = (source: PixelImage, width: number, height: number, mode: ImageFitMode): PixelImage => {
  const safeWidth = Math.max(1, Math.min(8192, Math.round(width)))
  const safeHeight = Math.max(1, Math.min(8192, Math.round(height)))
  if (mode === 'stretch') return resizeImage(source, safeWidth, safeHeight)

  const sourceRatio = source.width / source.height
  const targetRatio = safeWidth / safeHeight
  if (mode === 'cover') {
    const cropWidth = sourceRatio > targetRatio ? Math.max(1, Math.round(source.height * targetRatio)) : source.width
    const cropHeight = sourceRatio > targetRatio ? source.height : Math.max(1, Math.round(source.width / targetRatio))
    const cropped = cropImage(source, {
      x: Math.floor((source.width - cropWidth) / 2),
      y: Math.floor((source.height - cropHeight) / 2),
      width: cropWidth,
      height: cropHeight,
    })
    return resizeImage(cropped, safeWidth, safeHeight)
  }

  const scale = Math.min(safeWidth / source.width, safeHeight / source.height)
  const contained = resizeImage(source, Math.max(1, Math.round(source.width * scale)), Math.max(1, Math.round(source.height * scale)))
  const target = createImage(safeWidth, safeHeight)
  const offsetX = Math.floor((safeWidth - contained.width) / 2)
  const offsetY = Math.floor((safeHeight - contained.height) / 2)
  for (let y = 0; y < contained.height; y += 1) for (let x = 0; x < contained.width; x += 1) {
    copyPixel(contained, x, y, target, offsetX + x, offsetY + y)
  }
  return target
}
