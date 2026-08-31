import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BackgroundRemover from './BackgroundRemover.vue'

describe('BackgroundRemover', () => {
  it('starts with a local image import action and no enabled export', () => {
    const wrapper = mount(BackgroundRemover)

    expect(wrapper.get('h1').text()).toBe('快速抠图')
    expect(wrapper.get('input[type="file"]').attributes('accept')).toBe('image/png,image/jpeg,image/webp')
    expect(wrapper.get('[data-testid="download-button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('图片仅在当前浏览器中处理')
  })

  it('shows a specific error when the chosen format is unsupported', async () => {
    const wrapper = mount(BackgroundRemover)
    const file = new File(['svg'], 'icon.svg', { type: 'image/svg+xml' })
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })

    await input.trigger('change')

    expect(wrapper.get('[role="alert"]').text()).toBe('仅支持 PNG、JPEG 和 WebP 图片。')
  })

  it('keeps processing controls disabled until a selection has produced a subject', () => {
    const wrapper = mount(BackgroundRemover)

    expect(wrapper.get('[data-testid="tolerance-input"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="reset-button"]').attributes('disabled')).toBeDefined()
  })
})
