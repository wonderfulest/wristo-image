import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ImageCompressor from './ImageCompressor.vue'

const pixels = new Uint8ClampedArray(80 * 40 * 4).fill(255)

describe('ImageCompressor', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 80, height: 40, close: vi.fn() })))
    vi.stubGlobal('ImageData', class {
      constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({ width: 80, height: 40, data: pixels })),
      putImageData: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => {
      callback(new Blob([new Uint8Array(500)], { type: 'image/jpeg' }))
    })
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:compressed'),
      revokeObjectURL: vi.fn(),
    })
  })

  it('starts with a 150 KB hard limit and no enabled compression action', () => {
    const wrapper = mount(ImageCompressor)

    expect((wrapper.get('[data-testid="target-kb"]').element as HTMLInputElement).value).toBe('150')
    expect(wrapper.get('[data-testid="compress-button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('严格不超过目标大小')
    expect(wrapper.text()).toContain('图片仅在当前浏览器中处理')
  })

  it('keeps the preview canvas in the workbench flow when shared checker styles exist', () => {
    const sharedStyles = document.createElement('style')
    sharedStyles.textContent = '.checker { position: absolute; inset: 26px 30px; opacity: .75; }'
    document.head.appendChild(sharedStyles)
    const wrapper = mount(ImageCompressor, { attachTo: document.body })

    const preview = wrapper.get('.preview-canvas')
    expect(getComputedStyle(preview.element).position).not.toBe('absolute')
    expect(getComputedStyle(preview.element).opacity).not.toBe('0.75')

    wrapper.unmount()
    sharedStyles.remove()
  })

  it('loads a supported image and shows its name, size and dimensions', async () => {
    const wrapper = mount(ImageCompressor)
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [new File([new Uint8Array(2_048)], 'store-banner.webp', { type: 'image/webp' })],
      configurable: true,
    })

    await input.trigger('change')

    expect(wrapper.text()).toContain('store-banner.webp')
    expect(wrapper.text()).toContain('2 KB')
    expect(wrapper.text()).toContain('80 × 40 px')
    expect(wrapper.get('[data-testid="compress-button"]').attributes('disabled')).toBeUndefined()
  })

  it('rejects unsupported files with a specific error', async () => {
    const wrapper = mount(ImageCompressor)
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [new File(['svg'], 'logo.svg', { type: 'image/svg+xml' })],
      configurable: true,
    })

    await input.trigger('change')

    expect(wrapper.get('[role="alert"]').text()).toBe('仅支持 PNG、JPEG 和 WebP 图片。')
  })

  it('invalidates an old result when the target limit changes', async () => {
    const wrapper = mount(ImageCompressor)
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [new File([new Uint8Array(2_048)], 'banner.jpg', { type: 'image/jpeg' })],
      configurable: true,
    })
    await input.trigger('change')
    await wrapper.get('[data-testid="compress-button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('下载压缩图片'))

    await wrapper.get('[data-testid="target-kb"]').setValue('100')

    expect(wrapper.text()).not.toContain('下载压缩图片')
  })
})
