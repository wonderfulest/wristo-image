import { zipSync } from 'fflate'

export type HistoryZipItem = {
  name: string
  blob: Blob
}

const readBlob = (blob: Blob): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('无法读取历史图片。'))
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.readAsArrayBuffer(blob)
  })

const uniqueFileName = (name: string, usedNames: Set<string>): string => {
  if (!usedNames.has(name)) {
    usedNames.add(name)
    return name
  }

  const extensionIndex = name.lastIndexOf('.')
  const hasExtension = extensionIndex > 0
  const stem = hasExtension ? name.slice(0, extensionIndex) : name
  const extension = hasExtension ? name.slice(extensionIndex) : ''
  let copy = 2
  let candidate = `${stem} (${copy})${extension}`
  while (usedNames.has(candidate)) {
    copy += 1
    candidate = `${stem} (${copy})${extension}`
  }
  usedNames.add(candidate)
  return candidate
}

export const createHistoryZip = async (items: HistoryZipItem[]): Promise<Blob> => {
  const files: Record<string, Uint8Array> = {}
  const usedNames = new Set<string>()
  for (const item of items) {
    files[uniqueFileName(item.name, usedNames)] = await readBlob(item.blob)
  }
  return new Blob([zipSync(files)], { type: 'application/zip' })
}

const twoDigits = (value: number): string => String(value).padStart(2, '0')

export const historyZipFileName = (now = new Date()): string =>
  `wristo-images-${now.getFullYear()}${twoDigits(now.getMonth() + 1)}${twoDigits(now.getDate())}-${twoDigits(now.getHours())}${twoDigits(now.getMinutes())}${twoDigits(now.getSeconds())}.zip`
