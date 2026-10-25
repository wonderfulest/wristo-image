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

  it('blocks AI submission for anonymous users and displays login', async () => {
    signedIn.value = false
    const wrapper = mount(ImageEditor)
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [new File(['image'], 'photo.png', { type: 'image/png' })], configurable: true })
    await input.trigger('change')
    await flushPromises()
    await wrapper.get('[data-tool-id="ai-watermark-remover"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('登录 Wristo')
    expect(wrapper.get('[data-testid="watermark-auto-button"]').attributes('disabled')).toBeDefined()
    expect(account).not.toHaveBeenCalled()
    expect(createTask).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('shows the configured price and prevents spending an insufficient balance', async () => {
    account.mockResolvedValue({ userId: "7", balance: 2, creditCost: 3 })
    const wrapper = mount(ImageEditor)
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [new File(['image'], 'photo.png', { type: 'image/png' })], configurable: true })
    await input.trigger('change')
    await flushPromises()
    await wrapper.get('[data-tool-id="ai-watermark-remover"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('余额 2 积分 · 每次 3 积分')
    expect(wrapper.text()).toContain('积分不足')
    expect(wrapper.get('[data-testid="watermark-auto-button"]').attributes('disabled')).toBeDefined()
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

    expect(createTask).toHaveBeenCalledWith(expect.objectContaining({ mode: 'automatic', expectedCreditCost: 3, requestId: expect.any(String) }))
    expect(waitTask).toHaveBeenCalledWith('token-1')
    expect(wrapper.text()).toContain('AI 去水印结果已应用')
  })
})
