import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const historyRepository = vi.hoisted(() => ({
  list: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
}))

vi.mock('@/features/editor/localImageHistory', () => ({
  createLocalImageHistoryRepository: () => historyRepository,
}))

import ImageEditor from './ImageEditor.vue'

describe('history ZIP download integration', () => {
  beforeEach(() => {
    historyRepository.list.mockResolvedValue([
      {
        id: 'new', name: 'watch.png', mimeType: 'image/png', width: 10, height: 10,
        createdAt: 2, blob: new Blob(['first']),
      },
      {
        id: 'old', name: 'dial.jpg', mimeType: 'image/jpeg', width: 20, height: 10,
        createdAt: 1, blob: new Blob(['second']),
      },
    ])
  })

  it('downloads selected history images as one timestamped ZIP file', async () => {
    const clickedDownloads: string[] = []
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:local'),
      revokeObjectURL: vi.fn(),
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clickedDownloads.push(this.download)
    })
    const wrapper = mount(ImageEditor)
    await vi.waitFor(() => expect(wrapper.findAll('[data-testid="history-image"]')).toHaveLength(2))

    await wrapper.findAll('[data-testid="select-history-image"]')[0]!.setValue(true)
    await wrapper.findAll('[data-testid="select-history-image"]')[1]!.setValue(true)
    await wrapper.get('[data-testid="download-selected-history"]').trigger('click')
    await vi.waitFor(() => expect(clickedDownloads).toHaveLength(1))

    expect(clickedDownloads[0]).toMatch(/^wristo-images-\d{8}-\d{6}\.zip$/)
  })
})
