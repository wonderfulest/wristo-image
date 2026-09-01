import { unzipSync, strFromU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import { createHistoryZip, historyZipFileName } from './downloadHistoryZip'

const readBlob = (blob: Blob): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.readAsArrayBuffer(blob)
  })

describe('history ZIP download', () => {
  it('packages every selected blob and preserves its contents', async () => {
    const archive = await createHistoryZip([
      { name: 'watch.png', blob: new Blob(['first']) },
      { name: 'dial.jpg', blob: new Blob(['second']) },
    ])

    const files = unzipSync(new Uint8Array(await readBlob(archive)))
    expect(Object.keys(files)).toEqual(['watch.png', 'dial.jpg'])
    expect(strFromU8(files['watch.png']!)).toBe('first')
    expect(strFromU8(files['dial.jpg']!)).toBe('second')
  })

  it('renames duplicate files instead of overwriting them', async () => {
    const archive = await createHistoryZip([
      { name: 'watch.png', blob: new Blob(['first']) },
      { name: 'watch.png', blob: new Blob(['second']) },
      { name: 'watch.png', blob: new Blob(['third']) },
    ])

    const files = unzipSync(new Uint8Array(await readBlob(archive)))
    expect(Object.keys(files)).toEqual(['watch.png', 'watch (2).png', 'watch (3).png'])
  })

  it('creates a timestamped ZIP file name', () => {
    expect(historyZipFileName(new Date(2026, 8, 1, 9, 7, 5))).toBe(
      'wristo-images-20260901-090705.zip',
    )
  })
})
