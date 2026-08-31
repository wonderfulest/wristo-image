import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ImageEditor from './ImageEditor.vue'
import { CUTOUT_PREFERENCES_STORAGE_KEY } from '@/features/background-remover/cutoutPreferences'

describe('ImageEditor', () => {
  beforeEach(() => localStorage.clear())

  it('starts in the unified editor shell with background remover selected', () => {
    const wrapper = mount(ImageEditor)

    expect(wrapper.find('[data-testid="editor-topbar"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="tool-rail"]').text()).toContain('抠图')
    expect(wrapper.get('[data-testid="tool-rail"]').text()).toContain('上传')
    expect(wrapper.get('[data-testid="tool-panel"]').text()).toContain('快速抠图')
    expect(wrapper.get('input[type="file"]').attributes('accept')).toBe('image/png,image/jpeg,image/webp')
    expect(wrapper.get('[data-testid="download-button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('图片仅在当前浏览器中处理')
    expect(wrapper.get('[data-testid="image-history-panel"]').text()).toContain('历史图片')
    expect(wrapper.get('[data-testid="image-history-panel"]').text()).toContain('仅保存在当前浏览器')
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

  it('shows cutout output ratio and whitespace controls', () => {
    const wrapper = mount(ImageEditor)

    expect(wrapper.get('[data-testid="cutout-ratio"]').findAll('option').map(option => option.text())).toEqual([
      '自由', '1:1', '4:3', '3:4', '16:9', '9:16',
    ])
    expect(wrapper.get('[data-testid="trim-whitespace"]').attributes('type')).toBe('checkbox')
  })

  it('prefers locally persisted cutout settings and saves later changes', async () => {
    localStorage.setItem(CUTOUT_PREFERENCES_STORAGE_KEY, JSON.stringify({
      version: 1,
      aspectRatio: 1,
      trimWhitespace: true,
      tolerance: 46,
    }))
    const wrapper = mount(ImageEditor)

    expect((wrapper.get('[data-testid="cutout-ratio"]').element as HTMLSelectElement).value).toBe('1')
    expect((wrapper.get('[data-testid="trim-whitespace"]').element as HTMLInputElement).checked).toBe(true)
    expect((wrapper.get('[data-testid="tolerance-input"]').element as HTMLInputElement).value).toBe('46')

    await wrapper.get('[data-testid="cutout-ratio"]').setValue(String(4 / 3))
    expect(JSON.parse(localStorage.getItem(CUTOUT_PREFERENCES_STORAGE_KEY) ?? '').aspectRatio).toBe(4 / 3)
  })

  it('shows manual zoom controls in the bottom-right corner of the canvas', () => {
    const wrapper = mount(ImageEditor)
    const stage = wrapper.get('.workspace-stage')
    const controls = stage.get('[data-testid="canvas-zoom-controls"]')

    expect(controls.classes()).toContain('canvas-zoom-controls')
    expect(controls.findAll('button').map(button => button.text())).toEqual(['−', '100%', '＋', '适应'])
    expect(controls.findAll('button').every(button => button.attributes('disabled') !== undefined)).toBe(true)
  })

  it('organizes every supported tool into cutout and adjustment categories', async () => {
    const wrapper = mount(ImageEditor)
    const rail = wrapper.get('[data-testid="tool-rail"]')

    expect(rail.text()).toContain('抠图')
    expect(rail.text()).toContain('调整')
    expect(rail.text()).toContain('上传')
    expect(rail.text()).toContain('导出')
    expect(wrapper.get('[data-testid="category-tool-list"]').text()).toContain('快速抠图')
    expect(wrapper.get('[data-testid="category-tool-list"]').text()).toContain('智能擦除')
    expect(wrapper.get('[data-testid="category-tool-list"]').text()).toContain('背景填色')
    expect(wrapper.get('[data-testid="category-tool-list"]').text()).toContain('恢复')
    expect(wrapper.get('[data-testid="category-tool-list"]').text()).toContain('背景替换')
    expect(wrapper.get('[data-testid="category-tool-list"]').text()).toContain('描边')
    expect(wrapper.get('[data-tool-id="smart-erase"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-tool-id="background-fill"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-tool-id="restore"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-tool-id="smart-erase"]').attributes('title')).toBe('请先上传图片')

    await wrapper.get('[data-category-id="adjust"]').trigger('click')

    expect(wrapper.get('[data-testid="category-tool-list"]').text()).toContain('裁剪')
    expect(wrapper.get('[data-testid="category-tool-list"]').text()).toContain('调整尺寸')
    expect(wrapper.get('[data-testid="category-tool-list"]').text()).toContain('旋转翻转')
  })

  it('opens every cutout tool from the current canvas and cancels an unapplied preview on switch', async () => {
    const pixels = new Uint8ClampedArray(4 * 4 * 4).fill(255)
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 4, height: 4, close: vi.fn() })))
    vi.stubGlobal('ImageData', class { constructor(public data: Uint8ClampedArray, public width: number, public height: number) {} })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({ width: 4, height: 4, data: pixels })),
      putImageData: vi.fn(),
      save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), rect: vi.fn(), fill: vi.fn(),
      strokeRect: vi.fn(), setLineDash: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    const wrapper = mount(ImageEditor)
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [new File(['image'], 'icon.png', { type: 'image/png' })],
      configurable: true,
    })
    await input.trigger('change')
    await vi.waitFor(() => expect(wrapper.get('[data-tool-id="smart-erase"]').attributes('disabled')).toBeUndefined())

    await wrapper.get('[data-tool-id="background-fill"]').trigger('click')
    expect(wrapper.get('[data-testid="background-fill-color"]').attributes('type')).toBe('color')
    expect((wrapper.get('[data-testid="background-fill-color"]').element as HTMLInputElement).value).toBe('#ffffff')
    expect(wrapper.find('[data-testid="background-fill-tolerance"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('在画布上框选要填色的背景区域')

    await wrapper.get('[data-tool-id="smart-erase"]').trigger('click')
    expect(wrapper.get('[data-testid="tool-preview-actions"]').text()).toContain('应用到画布')
    expect(wrapper.find('.brush-modes').exists()).toBe(false)
    expect(wrapper.get('.effect-panel').text()).toContain('智能擦除会在松开画笔后用周围背景补齐')
    const stage = wrapper.get('.workspace-stage')
    const previewCanvas = wrapper.get('canvas.result-canvas')
    ;(previewCanvas.element as HTMLCanvasElement).width = 400
    vi.spyOn(stage.element, 'getBoundingClientRect').mockReturnValue({ left: 20, top: 30 } as DOMRect)
    vi.spyOn(previewCanvas.element, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 80, width: 200, height: 200 } as DOMRect)
    previewCanvas.element.dispatchEvent(new MouseEvent('pointerenter', { clientX: 150, clientY: 130 }))
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-testid="brush-cursor"]').attributes('style')).toContain('width: 16px')
    await previewCanvas.trigger('pointerleave')
    expect(wrapper.find('[data-testid="brush-cursor"]').exists()).toBe(false)

    await wrapper.get('[data-tool-id="restore"]').trigger('click')
    expect(wrapper.find('.brush-modes').exists()).toBe(false)
    expect(wrapper.get('.effect-panel').text()).toContain('恢复会从原图重新显露对应区域')

    await wrapper.get('[data-tool-id="background"]').trigger('click')
    expect(wrapper.get('[role="status"]').text()).toBe('未应用的修改已取消')
    expect(wrapper.find('[data-testid="tool-preview-actions"]').exists()).toBe(true)

    await wrapper.get('.preview-cancel').trigger('click')
    expect(wrapper.find('[data-testid="tool-preview-actions"]').exists()).toBe(false)

    await wrapper.get('[data-tool-id="outline"]').trigger('click')
    await wrapper.get('[data-testid="tool-preview-actions"] .primary-operation').trigger('click')
    expect(wrapper.find('[data-testid="tool-preview-actions"]').exists()).toBe(false)
    expect(wrapper.get('.history-actions button[title="撤销"]').attributes('disabled')).toBeUndefined()
  })
})
