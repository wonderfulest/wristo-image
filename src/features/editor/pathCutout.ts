import type { PixelImage } from '@/features/background-remover/imageProcessor'

export interface PathCutoutPoint {
  x: number
  y: number
}

export interface PathCutoutOptions {
  points: readonly PathCutoutPoint[]
  smooth: boolean
  count: number
  gap: number
  height: number
  slant: number
  cornerRadius: number
}

export interface PathCutoutSegment {
  center: PathCutoutPoint
  angle: number
  width: number
  height: number
  slant: number
  cornerRadius: number
}

const pointAt = (points: readonly PathCutoutPoint[], index: number): PathCutoutPoint =>
  points[Math.max(0, Math.min(points.length - 1, index))]!

const interpolateCatmullRom = (before: PathCutoutPoint, from: PathCutoutPoint, to: PathCutoutPoint, after: PathCutoutPoint, t: number): PathCutoutPoint => {
  const t2 = t * t
  const t3 = t2 * t
  return {
    x: .5 * ((2 * from.x) + (-before.x + to.x) * t + (2 * before.x - 5 * from.x + 4 * to.x - after.x) * t2 + (-before.x + 3 * from.x - 3 * to.x + after.x) * t3),
    y: .5 * ((2 * from.y) + (-before.y + to.y) * t + (2 * before.y - 5 * from.y + 4 * to.y - after.y) * t2 + (-before.y + 3 * from.y - 3 * to.y + after.y) * t3),
  }
}

const sampledPath = (points: readonly PathCutoutPoint[], smooth: boolean): PathCutoutPoint[] => {
  if (points.length < 2) return []
  if (!smooth || points.length === 2) return [...points]
  const sampled: PathCutoutPoint[] = []
  for (let index = 0; index < points.length - 1; index += 1) {
    const before = pointAt(points, index - 1)
    const from = pointAt(points, index)
    const to = pointAt(points, index + 1)
    const after = pointAt(points, index + 2)
    for (let step = 0; step < 16; step += 1) sampled.push(interpolateCatmullRom(before, from, to, after, step / 16))
  }
  sampled.push(points[points.length - 1]!)
  return sampled
}

type MeasuredPath = { points: PathCutoutPoint[]; lengths: number[]; total: number }

const measurePath = (points: PathCutoutPoint[]): MeasuredPath => {
  const lengths = [0]
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]!
    const to = points[index]!
    lengths.push((lengths[index - 1] ?? 0) + Math.hypot(to.x - from.x, to.y - from.y))
  }
  return { points, lengths, total: lengths[lengths.length - 1] ?? 0 }
}

const sampleAt = (path: MeasuredPath, distance: number): { center: PathCutoutPoint; angle: number } | null => {
  if (path.total <= 0 || path.points.length < 2) return null
  const safeDistance = Math.max(0, Math.min(path.total, distance))
  for (let index = 1; index < path.points.length; index += 1) {
    const endDistance = path.lengths[index] ?? 0
    if (endDistance < safeDistance && index < path.points.length - 1) continue
    const startDistance = path.lengths[index - 1] ?? 0
    const from = path.points[index - 1]!
    const to = path.points[index]!
    const segmentLength = Math.max(Number.EPSILON, endDistance - startDistance)
    const progress = (safeDistance - startDistance) / segmentLength
    return {
      center: { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress },
      angle: Math.atan2(to.y - from.y, to.x - from.x),
    }
  }
  return null
}

export const createPathCutoutSegments = (options: PathCutoutOptions): PathCutoutSegment[] => {
  const count = Math.max(0, Math.floor(options.count))
  const path = measurePath(sampledPath(options.points, options.smooth))
  if (count < 1 || path.total < 1) return []
  const slotLength = path.total / count
  const width = Math.max(1, slotLength - Math.max(0, options.gap))
  const height = Math.max(1, options.height)
  const cornerRadius = Math.max(0, Math.min(options.cornerRadius, width / 2, height / 2))
  const segments: PathCutoutSegment[] = []
  for (let index = 0; index < count; index += 1) {
    const sampled = sampleAt(path, slotLength * (index + .5))
    if (sampled) segments.push({ ...sampled, width, height, slant: options.slant, cornerRadius })
  }
  return segments
}

const isInsideSegment = (x: number, y: number, segment: PathCutoutSegment): boolean => {
  const dx = x - segment.center.x
  const dy = y - segment.center.y
  const tangentX = Math.cos(segment.angle)
  const tangentY = Math.sin(segment.angle)
  const normalX = -tangentY
  const normalY = tangentX
  const localY = dx * normalX + dy * normalY
  const localX = dx * tangentX + dy * tangentY - (localY / segment.height) * segment.slant
  const radius = segment.cornerRadius
  const outsideX = Math.max(Math.abs(localX) - segment.width / 2 + radius, 0)
  const outsideY = Math.max(Math.abs(localY) - segment.height / 2 + radius, 0)
  return outsideX * outsideX + outsideY * outsideY <= radius * radius
}

export const applyPathCutout = (source: PixelImage, options: PathCutoutOptions): PixelImage => {
  const result: PixelImage = { width: source.width, height: source.height, data: new Uint8ClampedArray(source.data) }
  for (const segment of createPathCutoutSegments(options)) {
    const reach = Math.ceil(Math.hypot(segment.width / 2 + Math.abs(segment.slant), segment.height / 2) + 1)
    const left = Math.max(0, Math.floor(segment.center.x - reach))
    const right = Math.min(result.width - 1, Math.ceil(segment.center.x + reach))
    const top = Math.max(0, Math.floor(segment.center.y - reach))
    const bottom = Math.min(result.height - 1, Math.ceil(segment.center.y + reach))
    for (let y = top; y <= bottom; y += 1) for (let x = left; x <= right; x += 1) {
      if (isInsideSegment(x + .5, y + .5, segment)) result.data[(y * result.width + x) * 4 + 3] = 0
    }
  }
  return result
}
