import { MAX_CUTOUT_TOLERANCE } from './cutoutTolerance'

export interface PixelImage {
  width: number
  height: number
  data: Uint8ClampedArray
}

export interface SelectionRect {
  x: number
  y: number
  width: number
  height: number
}

export const normalizeSelection = (
  selection: SelectionRect,
  sourceWidth: number,
  sourceHeight: number,
): SelectionRect | null => {
  if (
    !Number.isFinite(selection.x)
    || !Number.isFinite(selection.y)
    || !Number.isFinite(selection.width)
    || !Number.isFinite(selection.height)
    || Math.abs(selection.width) < 1
    || Math.abs(selection.height) < 1
    || sourceWidth < 1
    || sourceHeight < 1
  ) {
    return null
  }

  const left = Math.max(0, Math.floor(Math.min(selection.x, selection.x + selection.width)))
  const top = Math.max(0, Math.floor(Math.min(selection.y, selection.y + selection.height)))
  const right = Math.min(sourceWidth, Math.ceil(Math.max(selection.x, selection.x + selection.width)))
  const bottom = Math.min(sourceHeight, Math.ceil(Math.max(selection.y, selection.y + selection.height)))

  if (right <= left || bottom <= top) return null
  return { x: left, y: top, width: right - left, height: bottom - top }
}

const assertPixelImage = (source: PixelImage): void => {
  if (source.width < 1 || source.height < 1 || source.data.length !== source.width * source.height * 4) {
    throw new RangeError('Invalid pixel image dimensions')
  }
}

const cropImage = (source: PixelImage, selection: SelectionRect): PixelImage => {
  const data = new Uint8ClampedArray(selection.width * selection.height * 4)
  for (let y = 0; y < selection.height; y += 1) {
    const sourceStart = ((selection.y + y) * source.width + selection.x) * 4
    const targetStart = y * selection.width * 4
    data.set(source.data.subarray(sourceStart, sourceStart + selection.width * 4), targetStart)
  }
  return { width: selection.width, height: selection.height, data }
}

type Rgb = readonly [number, number, number]

const dominantBorderColor = (image: PixelImage): Rgb | null => {
  const bins = new Map<string, { count: number; red: number; green: number; blue: number }>()
  const record = (x: number, y: number): void => {
    const offset = (y * image.width + x) * 4
    if ((image.data[offset + 3] ?? 0) === 0) return
    const red = image.data[offset] ?? 0
    const green = image.data[offset + 1] ?? 0
    const blue = image.data[offset + 2] ?? 0
    const key = `${red >> 4}:${green >> 4}:${blue >> 4}`
    const bin = bins.get(key) ?? { count: 0, red: 0, green: 0, blue: 0 }
    bin.count += 1
    bin.red += red
    bin.green += green
    bin.blue += blue
    bins.set(key, bin)
  }

  for (let x = 0; x < image.width; x += 1) {
    record(x, 0)
    if (image.height > 1) record(x, image.height - 1)
  }
  for (let y = 1; y < image.height - 1; y += 1) {
    record(0, y)
    if (image.width > 1) record(image.width - 1, y)
  }

  let dominant: { count: number; red: number; green: number; blue: number } | null = null
  for (const bin of bins.values()) {
    if (!dominant || bin.count > dominant.count) dominant = bin
  }
  if (!dominant) return null
  return [
    dominant.red / dominant.count,
    dominant.green / dominant.count,
    dominant.blue / dominant.count,
  ]
}

const matchesBackground = (image: PixelImage, index: number, background: Rgb, tolerance: number): boolean => {
  const offset = index * 4
  if ((image.data[offset + 3] ?? 0) === 0) return true
  const red = (image.data[offset] ?? 0) - background[0]
  const green = (image.data[offset + 1] ?? 0) - background[1]
  const blue = (image.data[offset + 2] ?? 0) - background[2]
  return Math.sqrt(red * red + green * green + blue * blue) <= tolerance
}

const removeSmallForegroundComponents = (image: PixelImage): void => {
  const pixelCount = image.width * image.height
  const labels = new Int32Array(pixelCount)
  const queue = new Int32Array(pixelCount)
  const componentSizes = [0]

  for (let start = 0; start < pixelCount; start += 1) {
    if (labels[start] || (image.data[start * 4 + 3] ?? 0) === 0) continue

    const label = componentSizes.length
    let head = 0
    let tail = 1
    let size = 0
    queue[0] = start
    labels[start] = label

    while (head < tail) {
      const index = queue[head] ?? 0
      head += 1
      size += 1
      const x = index % image.width
      const y = Math.floor(index / image.width)

      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if ((!offsetX && !offsetY) || x + offsetX < 0 || x + offsetX >= image.width || y + offsetY < 0 || y + offsetY >= image.height) continue
          const neighbor = (y + offsetY) * image.width + x + offsetX
          if (labels[neighbor] || (image.data[neighbor * 4 + 3] ?? 0) === 0) continue
          labels[neighbor] = label
          queue[tail] = neighbor
          tail += 1
        }
      }
    }

    componentSizes.push(size)
  }

  let largestSize = 0
  for (const size of componentSizes) largestSize = Math.max(largestSize, size)
  const minimumSize = Math.max(2, Math.ceil(largestSize * 0.01))
  for (let index = 0; index < pixelCount; index += 1) {
    const label = labels[index] ?? 0
    if (label && (componentSizes[label] ?? 0) < minimumSize) image.data[index * 4 + 3] = 0
  }
}

export const removeConnectedBackground = (
  source: PixelImage,
  selection: SelectionRect,
  tolerance: number,
): PixelImage => {
  assertPixelImage(source)
  const normalized = normalizeSelection(selection, source.width, source.height)
  if (!normalized) throw new RangeError('Selection must contain at least one pixel')

  const result = cropImage(source, normalized)
  const background = dominantBorderColor(result)
  if (!background) return result

  const safeTolerance = Math.max(0, Math.min(MAX_CUTOUT_TOLERANCE, tolerance))
  for (let index = 0; index < result.width * result.height; index += 1) {
    if (matchesBackground(result, index, background, safeTolerance)) {
      result.data[index * 4 + 3] = 0
    }
  }
  removeSmallForegroundComponents(result)

  return result
}

const parseHexColor = (color: string): readonly [number, number, number] => {
  const hex = color.replace('#', '')
  const normalized = hex.length === 3
    ? [...hex].map(character => character + character).join('')
    : hex
  const parsed = Number.parseInt(normalized, 16)
  if (!Number.isFinite(parsed) || normalized.length !== 6) throw new RangeError('Fill color must be a hex color')
  return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255]
}

export const fillSelectionWithColor = (
  source: PixelImage,
  selection: SelectionRect,
  color: string,
): PixelImage => {
  const normalized = normalizeSelection(selection, source.width, source.height)
  if (!normalized) throw new RangeError('Selection must contain at least one pixel')
  const result: PixelImage = {
    width: source.width,
    height: source.height,
    data: new Uint8ClampedArray(source.data),
  }
  const [red, green, blue] = parseHexColor(color)

  for (let y = 0; y < normalized.height; y += 1) {
    for (let x = 0; x < normalized.width; x += 1) {
      const targetOffset = ((normalized.y + y) * source.width + normalized.x + x) * 4
      result.data.set([red, green, blue, 255], targetOffset)
    }
  }

  return result
}

export const trimTransparentBounds = (source: PixelImage): PixelImage | null => {
  assertPixelImage(source)
  let left = source.width
  let top = source.height
  let right = -1
  let bottom = -1

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      if ((source.data[(y * source.width + x) * 4 + 3] ?? 0) === 0) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }

  if (right < left || bottom < top) return null
  return cropImage(source, {
    x: left,
    y: top,
    width: right - left + 1,
    height: bottom - top + 1,
  })
}

export interface CutoutOutputOptions {
  trimWhitespace: boolean
  aspectRatio: number | null
}

export const applyCutoutOutputOptions = (
  source: PixelImage,
  options: CutoutOutputOptions,
): PixelImage => {
  assertPixelImage(source)
  const trimmed = options.trimWhitespace ? trimTransparentBounds(source) : source
  const base = trimmed ?? source
  const ratio = options.aspectRatio
  if (!ratio || !Number.isFinite(ratio) || ratio <= 0) return base

  const currentRatio = base.width / base.height
  if (Math.abs(currentRatio - ratio) < Number.EPSILON) return base
  const width = currentRatio < ratio ? Math.ceil(base.height * ratio) : base.width
  const height = currentRatio > ratio ? Math.ceil(base.width / ratio) : base.height
  const data = new Uint8ClampedArray(width * height * 4)
  const offsetX = Math.floor((width - base.width) / 2)
  const offsetY = Math.floor((height - base.height) / 2)

  for (let y = 0; y < base.height; y += 1) {
    const sourceStart = y * base.width * 4
    const targetStart = ((y + offsetY) * width + offsetX) * 4
    data.set(base.data.subarray(sourceStart, sourceStart + base.width * 4), targetStart)
  }
  return { width, height, data }
}
