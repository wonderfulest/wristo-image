import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createTask, waitTask } = vi.hoisted(() => ({ createTask: vi.fn(), waitTask: vi.fn() }))
vi.mock('@/features/watermark-remover/watermarkRemovalApi', () => ({
  createWatermarkRemovalTask: createTask,
  waitForWatermarkRemoval: waitTask,
}))

import ImageEditor from './ImageEditor.vue'

describe('AI watermark editor integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    const pixels = new Uint8ClampedArray(512 * 512 * 4).fill(255)
    vi.stubGlobal('ImageData', class {
      constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
    })
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 512, height: 512, close: vi.fn() })))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(), getImageData: vi.fn(() => ({ width: 512, height: 512, data: pixels })),
      putImageData: vi.fn(), save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), rect: vi.fn(),
      fill: vi.fn(), strokeRect: vi.fn(), setLineDash: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob(['png'], { type: 'image/png' })))
    createTask.mockResolvedValue({ taskToken: 'token-1', status: 'pending' })
    waitTask.mockResolvedValue({ status: 'succeeded', resultAvailable: true, resultUrl: '/result' })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob(['result'], { type: 'image/png' }), { status: 200 })))
  })

  it.each(['rectangle', 'brush'])('enables masked repair after %s selection and disables it after erasing', async (mode) => {
    const wrapper = mount(ImageEditor)
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [new File(['image'], 'photo.png', { type: 'image/png' })], configurable: true,
    })
    await input.trigger('change')
    await flushPromises()
    await wrapper.get('[data-tool-id="ai-watermark-remover"]').trigger('click')
    const canvas = wrapper.get('canvas').element
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 512, height: 512 } as DOMRect)
    Object.defineProperty(canvas, 'setPointerCapture', { value: vi.fn(), configurable: true })
    const submit = wrapper.get('[data-testid="watermark-mask-submit"]')
    expect(submit.attributes('disabled')).toBeDefined()
    if (mode === 'brush') await wrapper.get('[data-testid="watermark-mask-mode-add"]').trigger('click')
    canvas.dispatchEvent(new MouseEvent('pointerdown', { button: 0, clientX: 100, clientY: 100 }))
    canvas.dispatchEvent(new MouseEvent('pointerup', { button: 0, clientX: 110, clientY: 110 }))
    await flushPromises()
    expect(submit.attributes('disabled')).toBeUndefined()

    await wrapper.get('[data-testid="watermark-mask-mode-erase"]').trigger('click')
    await wrapper.get('.watermark-panel input[type="range"]').setValue('160')
    canvas.dispatchEvent(new MouseEvent('pointerdown', { button: 0, clientX: 105, clientY: 105 }))
    canvas.dispatchEvent(new MouseEvent('pointerup', { button: 0, clientX: 105, clientY: 105 }))
    await flushPromises()
    expect(submit.attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="watermark-mask-mode-add"]').trigger('click')
    canvas.dispatchEvent(new MouseEvent('pointerdown', { button: 0, clientX: 100, clientY: 100 }))
    canvas.dispatchEvent(new MouseEvent('pointerup', { button: 0, clientX: 100, clientY: 100 }))
    await flushPromises()
    expect(submit.attributes('disabled')).toBeUndefined()

    // Submit the selected mask without requiring an automatic pass first.
    waitTask.mockImplementationOnce(() => new Promise(() => {}))
    await submit.trigger('click')
    await flushPromises()
    expect(createTask).toHaveBeenCalledWith(expect.objectContaining({ mode: 'mask', mask: expect.any(Blob) }))
    wrapper.unmount()
  })

  it('uploads the current canvas, waits for AI, and applies the result', async () => {
    const wrapper = mount(ImageEditor)
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [new File(['image'], 'photo.png', { type: 'image/png' })], configurable: true,
    })
    await input.trigger('change')
    await wrapper.get('[data-tool-id="ai-watermark-remover"]').trigger('click')

    await wrapper.get('[data-testid="watermark-auto-button"]').trigger('click')
    await flushPromises()

    expect(createTask).toHaveBeenCalledWith(expect.objectContaining({ mode: 'automatic' }))
    expect(waitTask).toHaveBeenCalledWith('token-1')
    expect(wrapper.text()).toContain('AI 去水印结果已应用')
  })
})
