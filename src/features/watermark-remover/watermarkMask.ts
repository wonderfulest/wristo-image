export interface WatermarkMask {
  width: number
  height: number
  data: Uint8ClampedArray
}

export interface MaskPoint { x: number; y: number }
export interface MaskRectangle { x: number; y: number; width: number; height: number }

export const createWatermarkMask = (width: number, height: number): WatermarkMask => ({
  width,
  height,
  data: new Uint8ClampedArray(width * height),
})

export const applyMaskRectangle = (
  mask: WatermarkMask,
  rectangle: MaskRectangle,
  add: boolean,
): void => {
  const left = Math.max(0, Math.floor(Math.min(rectangle.x, rectangle.x + rectangle.width)))
  const top = Math.max(0, Math.floor(Math.min(rectangle.y, rectangle.y + rectangle.height)))
  const right = Math.min(mask.width, Math.ceil(Math.max(rectangle.x, rectangle.x + rectangle.width)))
  const bottom = Math.min(mask.height, Math.ceil(Math.max(rectangle.y, rectangle.y + rectangle.height)))
  for (let y = top; y < bottom; y += 1) {
    mask.data.fill(add ? 255 : 0, y * mask.width + left, y * mask.width + right)
  }
}

export const applyMaskBrush = (
  mask: WatermarkMask,
  point: MaskPoint,
  diameter: number,
  add: boolean,
): void => {
  const radius = Math.max(0.5, diameter / 2)
  const left = Math.max(0, Math.floor(point.x - radius))
  const top = Math.max(0, Math.floor(point.y - radius))
  const right = Math.min(mask.width - 1, Math.ceil(point.x + radius))
  const bottom = Math.min(mask.height - 1, Math.ceil(point.y + radius))
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      if ((x - point.x) ** 2 + (y - point.y) ** 2 <= radius ** 2) {
        mask.data[y * mask.width + x] = add ? 255 : 0
      }
    }
  }
}

export const maskToRgba = (mask: WatermarkMask): Uint8ClampedArray => {
  const rgba = new Uint8ClampedArray(mask.width * mask.height * 4)
  mask.data.forEach((value, index) => {
    const offset = index * 4
    rgba[offset] = value
    rgba[offset + 1] = value
    rgba[offset + 2] = value
    rgba[offset + 3] = 255
  })
  return rgba
}
