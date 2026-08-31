import type { PixelImage } from './imageProcessor'

export type RefineBrushMode = 'erase' | 'restore'

export interface ContentAwareEraseStroke {
  points: Array<{ x: number; y: number }>
  size: number
  hardness: number
}

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

export const applyContentAwareErase = (
  source: PixelImage,
  stroke: ContentAwareEraseStroke,
): PixelImage => {
  const result = cloneImage(source)
  if (!stroke.points.length || !source.width || !source.height) return result

  const radius = Math.max(.5, stroke.size / 2)
  const hardness = Math.max(0, Math.min(1, stroke.hardness / 100))
  const hardRadius = radius * hardness
  const strengths = new Float32Array(source.width * source.height)
  let maskLeft = source.width - 1
  let maskRight = 0
  let maskTop = source.height - 1
  let maskBottom = 0
  const stamp = (centerX: number, centerY: number): void => {
    const left = Math.max(0, Math.floor(centerX - radius))
    const right = Math.min(source.width - 1, Math.ceil(centerX + radius))
    const top = Math.max(0, Math.floor(centerY - radius))
    const bottom = Math.min(source.height - 1, Math.ceil(centerY + radius))
    for (let y = top; y <= bottom; y += 1) for (let x = left; x <= right; x += 1) {
      const distance = Math.hypot(x - centerX, y - centerY)
      if (distance > radius) continue
      const strength = distance <= hardRadius || hardRadius === radius
        ? 1
        : 1 - (distance - hardRadius) / (radius - hardRadius)
      const index = y * source.width + x
      strengths[index] = Math.max(strengths[index] ?? 0, strength)
      maskLeft = Math.min(maskLeft, x)
      maskRight = Math.max(maskRight, x)
      maskTop = Math.min(maskTop, y)
      maskBottom = Math.max(maskBottom, y)
    }
  }

  stroke.points.forEach((point, pointIndex) => {
    const previous = stroke.points[pointIndex - 1]
    if (!previous) return stamp(point.x, point.y)
    const distance = Math.hypot(point.x - previous.x, point.y - previous.y)
    const steps = Math.max(1, Math.ceil(distance / Math.max(1, radius / 2)))
    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps
      stamp(previous.x + (point.x - previous.x) * progress, previous.y + (point.y - previous.y) * progress)
    }
  })

  const filled = new Uint8Array(strengths.length)
  let remaining = 0
  filled.fill(1)
  for (let y = maskTop; y <= maskBottom; y += 1) for (let x = maskLeft; x <= maskRight; x += 1) {
    const index = y * source.width + x
    if ((strengths[index] ?? 0) > 0) { filled[index] = 0; remaining += 1 }
  }

  const repaired = new Uint8ClampedArray(source.data)
  while (remaining > 0) {
    const next: Array<{ index: number; channels: [number, number, number, number] }> = []
    for (let y = maskTop; y <= maskBottom; y += 1) for (let x = maskLeft; x <= maskRight; x += 1) {
      const index = y * source.width + x
      if (filled[index]) continue
      const totals = [0, 0, 0, 0]
      let count = 0
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        if ((!offsetX && !offsetY) || x + offsetX < 0 || x + offsetX >= source.width || y + offsetY < 0 || y + offsetY >= source.height) continue
        const neighbor = (y + offsetY) * source.width + x + offsetX
        if (!filled[neighbor]) continue
        const dataOffset = neighbor * 4
        for (let channel = 0; channel < 4; channel += 1) totals[channel] = (totals[channel] ?? 0) + (repaired[dataOffset + channel] ?? 0)
        count += 1
      }
      if (count) next.push({ index, channels: totals.map(value => Math.round(value / count)) as [number, number, number, number] })
    }
    if (!next.length) break
    next.forEach(({ index, channels }) => {
      repaired.set(channels, index * 4)
      filled[index] = 1
      remaining -= 1
    })
  }

  let relaxed = Float32Array.from(repaired)
  const relaxationPasses = Math.min(80, Math.max(12, Math.ceil(radius * 2)))
  for (let pass = 0; pass < relaxationPasses; pass += 1) {
    const next = new Float32Array(relaxed)
    for (let y = maskTop; y <= maskBottom; y += 1) for (let x = maskLeft; x <= maskRight; x += 1) {
      const index = y * source.width + x
      if (!(strengths[index] ?? 0)) continue
      const neighbors = [
        x > 0 ? index - 1 : -1,
        x + 1 < source.width ? index + 1 : -1,
        y > 0 ? index - source.width : -1,
        y + 1 < source.height ? index + source.width : -1,
      ].filter(neighbor => neighbor >= 0)
      for (let channel = 0; channel < 4; channel += 1) {
        next[index * 4 + channel] = neighbors.reduce(
          (total, neighbor) => total + (relaxed[neighbor * 4 + channel] ?? 0),
          0,
        ) / neighbors.length
      }
    }
    relaxed = next
  }

  for (let y = maskTop; y <= maskBottom; y += 1) for (let x = maskLeft; x <= maskRight; x += 1) {
    const index = y * source.width + x
    const strength = strengths[index] ?? 0
    if (!strength) continue
    const offset = index * 4
    for (let channel = 0; channel < 4; channel += 1) {
      const current = source.data[offset + channel] ?? 0
      result.data[offset + channel] = Math.round(current + ((relaxed[offset + channel] ?? current) - current) * strength)
    }
  }
  return result
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
