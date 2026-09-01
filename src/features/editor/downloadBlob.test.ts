import { describe, expect, it, vi } from 'vitest'
import { downloadBlob } from './downloadBlob'

describe('downloadBlob', () => {
  it('downloads the blob with its original file name and revokes the temporary URL', () => {
    const blob = new Blob(['original'], { type: 'image/png' })
    const createObjectURL = vi.fn(() => 'blob:history-download')
    const revokeObjectURL = vi.fn()
    const clickedAnchors: HTMLAnchorElement[] = []
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clickedAnchors.push(this)
    })

    downloadBlob(blob, 'watch-face.png', { createObjectURL, revokeObjectURL })

    expect(click).toHaveBeenCalledOnce()
    expect(clickedAnchors[0]?.download).toBe('watch-face.png')
    expect(clickedAnchors[0]?.href).toBe('blob:history-download')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:history-download')
  })
})
