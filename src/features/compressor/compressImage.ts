import type { PixelImage } from '@/features/background-remover/imageProcessor'
import { hasTransparentPixels } from '@/features/editor/exportSettings'
import { resizeImage } from '@/features/editor/imageOperations'

export type CompressedImageFormat = 'png' | 'jpeg'

export type CompressionResult = {
  blob: Blob
  format: CompressedImageFormat
  width: number
  height: number
  quality: number | null
}

type ImageEncoder = (
  image: PixelImage,
  format: CompressedImageFormat,
  quality: number,
) => Promise<Blob>

type CompressionDependencies = {
  encode: ImageEncoder
  resize?: (image: PixelImage, width: number, height: number) => PixelImage
}

const MIN_JPEG_QUALITY = 0.1
const MAX_JPEG_QUALITY = 0.95
const QUALITY_SEARCH_STEPS = 9
const SCALE_STEP = 0.85

const nextDimensions = (width: number, height: number): [number, number] => {
  if (width === 1 && height === 1) return [1, 1]
  return [
    Math.max(1, Math.min(width - (width > 1 ? 1 : 0), Math.floor(width * SCALE_STEP))),
    Math.max(1, Math.min(height - (height > 1 ? 1 : 0), Math.floor(height * SCALE_STEP))),
  ]
}

const findBestJpeg = async (
  image: PixelImage,
  targetBytes: number,
  encode: ImageEncoder,
): Promise<{ blob: Blob; quality: number } | null> => {
  const smallest = await encode(image, 'jpeg', MIN_JPEG_QUALITY)
  if (smallest.size > targetBytes) return null

  let best = { blob: smallest, quality: MIN_JPEG_QUALITY }
  let low = MIN_JPEG_QUALITY
  let high = MAX_JPEG_QUALITY
  for (let step = 0; step < QUALITY_SEARCH_STEPS; step += 1) {
    const quality = (low + high) / 2
    const blob = await encode(image, 'jpeg', quality)
    if (blob.size <= targetBytes) {
      best = { blob, quality }
      low = quality
    } else {
      high = quality
    }
  }
  return best
}

export const compressImageToTarget = async (
  source: PixelImage,
  targetBytes: number,
  dependencies: CompressionDependencies,
): Promise<CompressionResult> => {
  if (!Number.isFinite(targetBytes) || targetBytes < 1) throw new RangeError('目标大小必须大于 0')

  const format: CompressedImageFormat = hasTransparentPixels(source.data) ? 'png' : 'jpeg'
  const resize = dependencies.resize ?? resizeImage
  let candidate = source

  while (true) {
    if (format === 'jpeg') {
      const encoded = await findBestJpeg(candidate, targetBytes, dependencies.encode)
      if (encoded) {
        return {
          ...encoded,
          format,
          width: candidate.width,
          height: candidate.height,
        }
      }
    } else {
      const blob = await dependencies.encode(candidate, 'png', 1)
      if (blob.size <= targetBytes) {
        return { blob, format, width: candidate.width, height: candidate.height, quality: null }
      }
    }

    if (candidate.width === 1 && candidate.height === 1) break
    const [width, height] = nextDimensions(candidate.width, candidate.height)
    candidate = resize(source, width, height)
  }

  throw new Error('无法压缩到指定大小')
}
