import type { PixelImage } from './imageProcessor'

export type RefineBrushMode = 'erase' | 'restore'

export type CutoutBackground =
  | { type: 'transparent' }
  | { type: 'color'; color: string }
  | { type: 'gradient'; from: string; to: string }
  | { type: 'image'; image: PixelImage; fit: 'cover' | 'contain' | 'stretch' }

export interface CutoutRenderOptions {
  background: CutoutBackground
  outline: { width: number; color: string }
}

const cloneImage = (source: PixelImage): PixelImage => ({
  width: source.width,
  height: source.height,
  data: new Uint8ClampedArray(source.data),
})

const parseHex = (value: string): [number, number, number] => {
  const hex = value.replace('#', '')
  const normalized = hex.length === 3 ? [...hex].map(character => character + character).join('') : hex
  const parsed = Number.parseInt(normalized, 16)
  return Number.isFinite(parsed) && normalized.length === 6
    ? [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255]
    : [0, 0, 0]
}

export const applyRefineBrush = (
  cutout: PixelImage,
  original: PixelImage,
  brush: { x: number; y: number; size: number; hardness: number; mode: RefineBrushMode },
): PixelImage => {
  if (cutout.width !== original.width || cutout.height !== original.height) throw new RangeError('Brush images must have matching dimensions')
  const result = cloneImage(cutout)
  const radius = Math.max(.5, brush.size / 2)
  const hardness = Math.max(0, Math.min(1, brush.hardness / 100))
  const hardRadius = radius * hardness
  const left = Math.max(0, Math.floor(brush.x - radius))
  const right = Math.min(result.width - 1, Math.ceil(brush.x + radius))
  const top = Math.max(0, Math.floor(brush.y - radius))
  const bottom = Math.min(result.height - 1, Math.ceil(brush.y + radius))

  for (let y = top; y <= bottom; y += 1) for (let x = left; x <= right; x += 1) {
    const distance = Math.hypot(x - brush.x, y - brush.y)
    if (distance > radius) continue
    const strength = distance <= hardRadius || hardRadius === radius ? 1 : 1 - (distance - hardRadius) / (radius - hardRadius)
    const offset = (y * result.width + x) * 4
    if (brush.mode === 'erase') {
      result.data[offset + 3] = Math.round((result.data[offset + 3] ?? 0) * (1 - strength))
    } else {
      for (let channel = 0; channel < 4; channel += 1) {
        const current = result.data[offset + channel] ?? 0
        const restored = original.data[offset + channel] ?? 0
        result.data[offset + channel] = Math.round(current + (restored - current) * strength)
      }
    }
  }
  return result
}

const setBackground = (target: PixelImage, background: CutoutBackground): void => {
  if (background.type === 'transparent') return
  if (background.type === 'color') {
    const [red, green, blue] = parseHex(background.color)
    for (let offset = 0; offset < target.data.length; offset += 4) target.data.set([red, green, blue, 255], offset)
    return
  }
  if (background.type === 'gradient') {
    const from = parseHex(background.from); const to = parseHex(background.to)
    for (let y = 0; y < target.height; y += 1) {
      const progress = target.height === 1 ? 0 : y / (target.height - 1)
      const color = from.map((value, channel) => Math.round(value + ((to[channel] ?? value) - value) * progress))
      for (let x = 0; x < target.width; x += 1) target.data.set([...color, 255], (y * target.width + x) * 4)
    }
    return
  }

  const source = background.image
  const scaleX = target.width / source.width; const scaleY = target.height / source.height
  const scale = background.fit === 'cover' ? Math.max(scaleX, scaleY) : background.fit === 'contain' ? Math.min(scaleX, scaleY) : 1
  const drawnWidth = background.fit === 'stretch' ? target.width : source.width * scale
  const drawnHeight = background.fit === 'stretch' ? target.height : source.height * scale
  const offsetX = (target.width - drawnWidth) / 2; const offsetY = (target.height - drawnHeight) / 2
  for (let y = 0; y < target.height; y += 1) for (let x = 0; x < target.width; x += 1) {
    const sourceX = background.fit === 'stretch' ? x * source.width / target.width : (x - offsetX) / scale
    const sourceY = background.fit === 'stretch' ? y * source.height / target.height : (y - offsetY) / scale
    if (sourceX < 0 || sourceY < 0 || sourceX >= source.width || sourceY >= source.height) continue
    const from = (Math.min(source.height - 1, Math.floor(sourceY)) * source.width + Math.min(source.width - 1, Math.floor(sourceX))) * 4
    target.data.set(source.data.subarray(from, from + 4), (y * target.width + x) * 4)
  }
}

const blendPixel = (target: PixelImage, offset: number, red: number, green: number, blue: number, alpha: number): void => {
  const sourceAlpha = alpha / 255
  const targetAlpha = (target.data[offset + 3] ?? 0) / 255
  const outputAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha)
  if (outputAlpha === 0) return
  target.data[offset] = Math.round((red * sourceAlpha + (target.data[offset] ?? 0) * targetAlpha * (1 - sourceAlpha)) / outputAlpha)
  target.data[offset + 1] = Math.round((green * sourceAlpha + (target.data[offset + 1] ?? 0) * targetAlpha * (1 - sourceAlpha)) / outputAlpha)
  target.data[offset + 2] = Math.round((blue * sourceAlpha + (target.data[offset + 2] ?? 0) * targetAlpha * (1 - sourceAlpha)) / outputAlpha)
  target.data[offset + 3] = Math.round(outputAlpha * 255)
}

const slidingMaximum = (source: Uint8ClampedArray, length: number, radius: number): Uint8ClampedArray => {
  const result = new Uint8ClampedArray(length)
  const deque = new Int32Array(length)
  let head = 0; let tail = 0
  for (let index = 0; index < length + radius; index += 1) {
    const entering = index + radius
    if (entering < length) {
      while (tail > head && (source[deque[tail - 1] ?? 0] ?? 0) <= (source[entering] ?? 0)) tail -= 1
      deque[tail] = entering; tail += 1
    }
    const leaving = index - radius
    while (tail > head && (deque[head] ?? 0) < leaving) head += 1
    if (index < length && tail > head) result[index] = source[deque[head] ?? 0] ?? 0
  }
  return result
}

const dilatedAlpha = (subject: PixelImage, padding: number, width: number, height: number): Uint8ClampedArray => {
  const alpha = new Uint8ClampedArray(width * height)
  for (let y = 0; y < subject.height; y += 1) for (let x = 0; x < subject.width; x += 1) {
    alpha[(y + padding) * width + x + padding] = subject.data[(y * subject.width + x) * 4 + 3] ?? 0
  }
  const horizontal = new Uint8ClampedArray(alpha.length)
  for (let y = 0; y < height; y += 1) horizontal.set(slidingMaximum(alpha.subarray(y * width, (y + 1) * width), width, padding), y * width)
  const result = new Uint8ClampedArray(alpha.length)
  const column = new Uint8ClampedArray(height)
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) column[y] = horizontal[y * width + x] ?? 0
    const maximum = slidingMaximum(column, height, padding)
    for (let y = 0; y < height; y += 1) result[y * width + x] = maximum[y] ?? 0
  }
  return result
}

export const renderCutout = (subject: PixelImage, options: CutoutRenderOptions): PixelImage => {
  const padding = Math.max(0, Math.min(32, Math.round(options.outline.width)))
  const target: PixelImage = {
    width: subject.width + padding * 2,
    height: subject.height + padding * 2,
    data: new Uint8ClampedArray((subject.width + padding * 2) * (subject.height + padding * 2) * 4),
  }
  setBackground(target, options.background)

  if (padding > 0) {
    const [red, green, blue] = parseHex(options.outline.color)
    const outlineAlpha = dilatedAlpha(subject, padding, target.width, target.height)
    for (let targetY = 0; targetY < target.height; targetY += 1) for (let targetX = 0; targetX < target.width; targetX += 1) {
      const maxAlpha = outlineAlpha[targetY * target.width + targetX] ?? 0
      if (maxAlpha) blendPixel(target, (targetY * target.width + targetX) * 4, red, green, blue, maxAlpha)
    }
  }

  for (let y = 0; y < subject.height; y += 1) for (let x = 0; x < subject.width; x += 1) {
    const sourceOffset = (y * subject.width + x) * 4
    blendPixel(target, ((y + padding) * target.width + x + padding) * 4, subject.data[sourceOffset] ?? 0, subject.data[sourceOffset + 1] ?? 0, subject.data[sourceOffset + 2] ?? 0, subject.data[sourceOffset + 3] ?? 0)
  }
  return target
}
