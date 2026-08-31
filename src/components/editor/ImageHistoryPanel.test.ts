import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ImageHistoryPanel from './ImageHistoryPanel.vue'

const images = [
  { id: 'new', name: 'new.png', width: 640, height: 640, createdAt: 2, previewUrl: 'blob:new' },
  { id: 'old', name: 'old.jpg', width: 1280, height: 720, createdAt: 1, previewUrl: 'blob:old' },
]

describe('ImageHistoryPanel', () => {
  it('shows local-only history thumbnails and their dimensions', () => {
    const wrapper = mount(ImageHistoryPanel, { props: { images } })

    expect(wrapper.get('[data-testid="image-history-panel"]').text()).toContain('历史图片')
    expect(wrapper.text()).toContain('仅保存在当前浏览器')
    expect(wrapper.findAll('[data-testid="history-image"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('640 × 640')
    expect(wrapper.text()).toContain('1280 × 720')
  })

  it('emits select, delete and clear actions', async () => {
    const wrapper = mount(ImageHistoryPanel, { props: { images } })

    await wrapper.findAll('[data-testid="history-image"]')[0]!.trigger('click')
    await wrapper.findAll('[data-testid="delete-history-image"]')[0]!.trigger('click')
    await wrapper.get('[data-testid="clear-image-history"]').trigger('click')

    expect(wrapper.emitted('select')?.[0]).toEqual(['new'])
    expect(wrapper.emitted('delete')?.[0]).toEqual(['new'])
    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  it('shows an empty state when no local images exist', () => {
    const wrapper = mount(ImageHistoryPanel, { props: { images: [] } })
    expect(wrapper.text()).toContain('还没有历史图片')
  })
})
