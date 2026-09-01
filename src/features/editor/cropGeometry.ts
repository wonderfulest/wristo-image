import type { SelectionRect } from '@/features/background-remover/imageProcessor'

export type CropHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move'

export interface CropPoint { x: number; y: number }
export interface CropBounds { width: number; height: number }

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.max(minimum, Math.min(maximum, value))

export const createCropRect = (
  start: CropPoint,
  point: CropPoint,
  bounds: CropBounds,
  ratio: number | null,
): SelectionRect => {
  const end = { x: clamp(point.x, 0, bounds.width), y: clamp(point.y, 0, bounds.height) }
  let width = Math.abs(end.x - start.x)
  let height = Math.abs(end.y - start.y)
  if (ratio) {
    width = Math.min(width, height * ratio)
    height = width / ratio
  }
  return {
    x: end.x < start.x ? start.x - width : start.x,
    y: end.y < start.y ? start.y - height : start.y,
    width,
    height,
  }
}

export const moveCropRect = (
  rect: SelectionRect,
  topLeft: CropPoint,
  bounds: CropBounds,
): SelectionRect => ({
  ...rect,
  x: clamp(topLeft.x, 0, Math.max(0, bounds.width - rect.width)),
  y: clamp(topLeft.y, 0, Math.max(0, bounds.height - rect.height)),
})

const handlePoints = (rect: SelectionRect): Record<Exclude<CropHandle, 'move'>, CropPoint> => ({
  nw: { x: rect.x, y: rect.y },
  n: { x: rect.x + rect.width / 2, y: rect.y },
  ne: { x: rect.x + rect.width, y: rect.y },
  e: { x: rect.x + rect.width, y: rect.y + rect.height / 2 },
  se: { x: rect.x + rect.width, y: rect.y + rect.height },
  s: { x: rect.x + rect.width / 2, y: rect.y + rect.height },
  sw: { x: rect.x, y: rect.y + rect.height },
  w: { x: rect.x, y: rect.y + rect.height / 2 },
})

export const hitTestCropRect = (
  point: CropPoint,
  rect: SelectionRect,
  radius: number,
): CropHandle | null => {
  for (const [handle, position] of Object.entries(handlePoints(rect))) {
    if (Math.hypot(point.x - position.x, point.y - position.y) <= radius)
      return handle as Exclude<CropHandle, 'move'>
  }
  return point.x >= rect.x && point.x <= rect.x + rect.width &&
    point.y >= rect.y && point.y <= rect.y + rect.height
    ? 'move'
    : null
}

const oppositeCorner = (rect: SelectionRect, handle: CropHandle): CropPoint => ({
  x: handle.includes('w') ? rect.x + rect.width : rect.x,
  y: handle.includes('n') ? rect.y + rect.height : rect.y,
})

const resizeCorner = (
  rect: SelectionRect,
  handle: CropHandle,
  point: CropPoint,
  bounds: CropBounds,
  ratio: number | null,
  minimum: number,
): SelectionRect => {
  const anchor = oppositeCorner(rect, handle)
  const signX = handle.includes('w') ? -1 : 1
  const signY = handle.includes('n') ? -1 : 1
  const availableWidth = signX > 0 ? bounds.width - anchor.x : anchor.x
  const availableHeight = signY > 0 ? bounds.height - anchor.y : anchor.y
  let width = clamp((point.x - anchor.x) * signX, minimum, availableWidth)
  let height = clamp((point.y - anchor.y) * signY, minimum, availableHeight)
  if (ratio) {
    width = Math.min(width, height * ratio, availableWidth, availableHeight * ratio)
    height = width / ratio
  }
  return {
    x: signX < 0 ? anchor.x - width : anchor.x,
    y: signY < 0 ? anchor.y - height : anchor.y,
    width,
    height,
  }
}

export const resizeCropRect = (
  rect: SelectionRect,
  handle: Exclude<CropHandle, 'move'>,
  point: CropPoint,
  bounds: CropBounds,
  ratio: number | null,
  minimum = 3,
): SelectionRect => {
  if (handle.length === 2) return resizeCorner(rect, handle, point, bounds, ratio, minimum)

  if (!ratio) {
    const right = rect.x + rect.width
    const bottom = rect.y + rect.height
    if (handle === 'w') {
      const x = clamp(point.x, 0, right - minimum)
      return { x, y: rect.y, width: right - x, height: rect.height }
    }
    if (handle === 'e') return { ...rect, width: clamp(point.x - rect.x, minimum, bounds.width - rect.x) }
    if (handle === 'n') {
      const y = clamp(point.y, 0, bottom - minimum)
      return { x: rect.x, y, width: rect.width, height: bottom - y }
    }
    return { ...rect, height: clamp(point.y - rect.y, minimum, bounds.height - rect.y) }
  }

  const horizontal = handle === 'e' || handle === 'w'
  const centerX = rect.x + rect.width / 2
  const centerY = rect.y + rect.height / 2
  let width = horizontal
    ? Math.abs(point.x - (handle === 'e' ? rect.x : rect.x + rect.width))
    : Math.abs(point.y - (handle === 's' ? rect.y : rect.y + rect.height)) * ratio
  let height = width / ratio
  const maxWidth = horizontal
    ? Math.min(handle === 'e' ? bounds.width - rect.x : rect.x + rect.width, 2 * Math.min(centerY, bounds.height - centerY) * ratio)
    : 2 * Math.min(centerX, bounds.width - centerX)
  const maxHeight = horizontal
    ? 2 * Math.min(centerY, bounds.height - centerY)
    : (handle === 's' ? bounds.height - rect.y : rect.y + rect.height)
  width = clamp(width, Math.max(minimum, minimum * ratio), Math.min(maxWidth, maxHeight * ratio))
  height = width / ratio
  if (handle === 'e') return { x: rect.x, y: centerY - height / 2, width, height }
  if (handle === 'w') return { x: rect.x + rect.width - width, y: centerY - height / 2, width, height }
  if (handle === 's') return { x: centerX - width / 2, y: rect.y, width, height }
  return { x: centerX - width / 2, y: rect.y + rect.height - height, width, height }
}

export const cropHandlePoints = handlePoints
