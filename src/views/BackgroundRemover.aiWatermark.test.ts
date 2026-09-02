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
