import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ImageEditor from './ImageEditor.vue'

describe('ImageEditor', () => {
  it('starts in the unified editor shell with background remover selected', () => {
    const wrapper = mount(ImageEditor)

    expect(wrapper.find('[data-testid="editor-topbar"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="tool-rail"]').text()).toContain('工具')
    expect(wrapper.get('[data-testid="tool-rail"]').text()).toContain('上传')
    expect(wrapper.get('[data-testid="tool-panel"]').text()).toContain('快速抠图')
    expect(wrapper.get('input[type="file"]').attributes('accept')).toBe('image/png,image/jpeg,image/webp')
    expect(wrapper.get('[data-testid="download-button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('图片仅在当前浏览器中处理')
  })

  it('shows a specific error when the chosen format is unsupported', async () => {
    const wrapper = mount(ImageEditor)
    const file = new File(['svg'], 'icon.svg', { type: 'image/svg+xml' })
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })

    await input.trigger('change')

    expect(wrapper.get('[role="alert"]').text()).toBe('仅支持 PNG、JPEG 和 WebP 图片。')
  })

  it('keeps processing controls disabled until a selection has produced a subject', () => {
    const wrapper = mount(ImageEditor)

    expect(wrapper.get('[data-testid="tolerance-input"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="reset-button"]').attributes('disabled')).toBeDefined()
  })

  it('shows manual zoom controls in the bottom-right corner of the canvas', () => {
    const wrapper = mount(ImageEditor)
    const stage = wrapper.get('.workspace-stage')
    const controls = stage.get('[data-testid="canvas-zoom-controls"]')

    expect(controls.classes()).toContain('canvas-zoom-controls')
    expect(controls.findAll('button').map(button => button.text())).toEqual(['−', '100%', '＋', '适应'])
    expect(controls.findAll('button').every(button => button.attributes('disabled') !== undefined)).toBe(true)
  })
})
