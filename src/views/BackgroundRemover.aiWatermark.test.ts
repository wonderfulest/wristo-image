import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createTask, waitTask, account, statusTask } = vi.hoisted(() => ({ createTask: vi.fn(), waitTask: vi.fn(), account: vi.fn(), statusTask: vi.fn() }))
vi.mock('@/features/watermark-remover/watermarkRemovalApi', () => ({
  createWatermarkRemovalTask: createTask,
  waitForWatermarkRemoval: waitTask,
  getImageAccount: account,
  getWatermarkRemovalTask: statusTask,
}))

import { signedIn } from '@/features/auth/imageAuth'
import ImageEditor from './ImageEditor.vue'

describe('AI watermark editor integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    signedIn.value = true
    sessionStorage.setItem('wristo-image-token', 'test-token')
    account.mockResolvedValue({ userId: "7", balance: 100, creditCost: 3 })
    statusTask.mockResolvedValue({ status: 'running' })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
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
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob(['result'], { type: 'image/png' }), { status: 200, headers: { 'Content-Type': 'image/png' } })))
  })

  it.each([true, false])('blocks new AI processing regardless of login state (%s)', async (authenticated) => {
    signedIn.value = authenticated
    const wrapper = mount(ImageEditor)
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [new File(['image'], 'photo.png', { type: 'image/png' })], configurable: true })
    await input.trigger('change')
    await flushPromises()
    await wrapper.get('[data-tool-id="ai-watermark-remover"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('AI 点数仅在 Studio 使用；此工具已停止新的 AI 处理')
    for (const selector of ['watermark-auto-button', 'watermark-mask-submit']) {
      const button = wrapper.get(`[data-testid="${selector}"]`)
      expect(button.attributes('disabled')).toBeDefined()
      await button.trigger('click')
    }
    expect(createTask).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('restores the pending task after remount without creating or charging another task', async () => {
    sessionStorage.setItem('wristo-image-pending:7', 'previous-task')
    const wrapper = mount(ImageEditor)
    await flushPromises()
    expect(wrapper.text()).toContain('继续查询上次任务')
    const resume = wrapper.findAll('button').find(button => button.text().includes('继续查询上次任务'))!
    await resume.trigger('click')
    await flushPromises()
    expect(waitTask).toHaveBeenCalledWith('previous-task')
    expect(createTask).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('wristo-image-pending:7')).toBeNull()
    wrapper.unmount()
  })

})
