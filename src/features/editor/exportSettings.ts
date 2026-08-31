export type ImageExportFormat = 'png' | 'jpeg' | 'webp'

export const hasTransparentPixels = (data: Uint8ClampedArray): boolean => {
  for (let offset = 3; offset < data.length; offset += 4) {
    if ((data[offset] ?? 255) < 255) return true
  }
  return false
}

type CurrentImageExportInput = {
  width: number
  height: number
  mimeType?: string
  fileName?: string
  hasTransparentResult: boolean
}

const resolveSourceFormat = (mimeType = '', fileName = ''): ImageExportFormat => {
  const normalizedMimeType = mimeType.toLowerCase()
  if (normalizedMimeType === 'image/jpeg') return 'jpeg'
  if (normalizedMimeType === 'image/webp') return 'webp'
  if (normalizedMimeType === 'image/png') return 'png'

  const extension = fileName.split('.').pop()?.toLowerCase()
  if (extension === 'jpg' || extension === 'jpeg') return 'jpeg'
  if (extension === 'webp') return 'webp'
  return 'png'
}

export const resolveCurrentImageExportSettings = (
  input: CurrentImageExportInput,
): { width: number; height: number; format: ImageExportFormat } => ({
  width: input.width,
  height: input.height,
  format: input.hasTransparentResult
    ? 'png'
    : resolveSourceFormat(input.mimeType, input.fileName),
})
