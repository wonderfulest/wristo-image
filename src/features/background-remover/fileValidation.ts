const MAX_FILE_BYTES = 25 * 1024 * 1024
const MAX_DIMENSION = 8192
const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

export const validateImageFile = (file: File): string | null => {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) return '仅支持 PNG、JPEG 和 WebP 图片。'
  if (file.size > MAX_FILE_BYTES) return '图片不能超过 25 MB。'
  return null
}

export const validateImageDimensions = (width: number, height: number): string | null => {
  if (width < 1 || height < 1) return '无法读取图片尺寸。'
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) return '图片尺寸不能超过 8192 × 8192 像素。'
  return null
}
