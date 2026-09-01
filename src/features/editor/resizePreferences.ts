import type { ImageFitMode } from './imageOperations'

export const RESIZE_MODE_STORAGE_KEY = 'wristo-image.resize-mode.v1'

const isImageFitMode = (value: string | null): value is ImageFitMode =>
  value === 'cover' || value === 'contain' || value === 'stretch'

export const loadResizeMode = (storage: Pick<Storage, 'getItem'>): ImageFitMode => {
  const stored = storage.getItem(RESIZE_MODE_STORAGE_KEY)
  return isImageFitMode(stored) ? stored : 'cover'
}

export const saveResizeMode = (storage: Pick<Storage, 'setItem'>, mode: ImageFitMode): void => {
  storage.setItem(RESIZE_MODE_STORAGE_KEY, mode)
}
