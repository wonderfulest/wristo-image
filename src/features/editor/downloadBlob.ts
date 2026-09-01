export type ObjectUrlApi = Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>

export const downloadBlob = (
  blob: Blob,
  fileName: string,
  urlApi: ObjectUrlApi = URL,
): void => {
  const objectUrl = urlApi.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  try {
    link.click()
  } finally {
    urlApi.revokeObjectURL(objectUrl)
  }
}
