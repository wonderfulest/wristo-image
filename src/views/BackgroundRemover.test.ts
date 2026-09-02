import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ImageEditor from './ImageEditor.vue'
import { CUTOUT_PREFERENCES_STORAGE_KEY } from '@/features/background-remover/cutoutPreferences'
import { HISTORY_PANEL_WIDTH_STORAGE_KEY } from '@/features/editor/historyPanelWidth'
import { RESIZE_MODE_STORAGE_KEY } from '@/features/editor/resizePreferences'

const uploadTestImage = async (wrapper: ReturnType<typeof mount>): Promise<void> => {
  const pixels = new Uint8ClampedArray(4 * 2 * 4).fill(255)
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 4, height: 2, close: vi.fn() })))
  vi.stubGlobal('ImageData', class { constructor(public data: Uint8ClampedArray, public width: number, public height: number) {} })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ width: 4, height: 2, data: pixels })),
    putImageData: vi.fn(),
    save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), rect: vi.fn(), fill: vi.fn(),
    strokeRect: vi.fn(), setLineDash: vi.fn(),
  } as unknown as CanvasRenderingContext2D)
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', {
    value: [new File(['image'], 'banner.png', { type: 'image/png' })],
    configurable: true,
  })
  await input.trigger('change')
}

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
    expect(wrapper.get('[data-testid="save-canvas-button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('图片仅在当前浏览器中处理')
    expect(wrapper.get('[data-testid="image-history-panel"]').text()).toContain('历史图片')
    expect(wrapper.get('[data-testid="image-history-panel"]').text()).toContain('仅保存在当前浏览器')
  })

  it('resizes the history panel by dragging its left divider and saves the result', async () => {
    const wrapper = mount(ImageEditor)
    const editorBody = wrapper.get('.editor-body')
    const resizeHandle = wrapper.get('[data-testid="history-panel-resize-handle"]')

    resizeHandle.element.dispatchEvent(new MouseEvent('pointerdown', {
      bubbles: true,
      clientX: 500,
    }))
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 430 }))
    await wrapper.vm.$nextTick()

    expect(editorBody.attributes('style')).toContain('--history-panel-width: 260px')

    window.dispatchEvent(new MouseEvent('pointerup', { clientX: 430 }))
    expect(localStorage.getItem(HISTORY_PANEL_WIDTH_STORAGE_KEY)).toBe('260')
  })

  it('restores the saved history panel width when the editor opens', () => {
    localStorage.setItem(HISTORY_PANEL_WIDTH_STORAGE_KEY, '312')

    const wrapper = mount(ImageEditor)

    expect(wrapper.get('.editor-body').attributes('style')).toContain('--history-panel-width: 312px')
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

  it('offers automatic AI removal and editable mask controls', async () => {
    const wrapper = mount(ImageEditor)
    await uploadTestImage(wrapper)

    await wrapper.get('[data-tool-id="ai-watermark-remover"]').trigger('click')

    expect(wrapper.get('[data-testid="watermark-auto-button"]').text()).toContain('自动识别并去除')
    expect(wrapper.get('[data-testid="watermark-mask-mode-add"]').text()).toContain('画笔增加')
    expect(wrapper.get('[data-testid="watermark-mask-mode-erase"]').text()).toContain('橡皮减少')
    expect(wrapper.get('[data-testid="watermark-mask-submit"]').text()).toContain('按调整范围重新修复')
    expect(wrapper.text()).toContain('图片会上传至 Wristo 服务端并由阿里云百炼处理')
  })

  it('shows cutout output ratio and whitespace controls', () => {
    const wrapper = mount(ImageEditor)

    expect(wrapper.get('[data-testid="cutout-ratio"]').findAll('option').map(option => option.text())).toEqual([
      '自由', '1:1', '4:3', '3:4', '16:9', '9:16',
    ])
    expect(wrapper.get('[data-testid="trim-whitespace"]').attributes('type')).toBe('checkbox')
  })

  it('offers the full RGB color-distance tolerance range', () => {
    const wrapper = mount(ImageEditor)

    expect(wrapper.get('[data-testid="tolerance-input"]').attributes('max')).toBe('442')
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

  it('pans from anywhere after a 300ms primary-button hold without completing the active tool gesture', async () => {
    vi.useFakeTimers()
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

    const stage = wrapper.get('.workspace-stage')
    const canvas = wrapper.get('.workspace-stage canvas:not(.result-canvas)')
    vi.spyOn(canvas.element, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 4, height: 4 } as DOMRect)
    Object.defineProperty(canvas.element, 'setPointerCapture', { value: vi.fn(), configurable: true })
    Object.defineProperty(stage.element, 'setPointerCapture', { value: vi.fn(), configurable: true })

    canvas.element.dispatchEvent(new MouseEvent('pointerdown', {
      bubbles: true, button: 0, clientX: 2, clientY: 2,
    }))
    vi.advanceTimersByTime(300)
    canvas.element.dispatchEvent(new MouseEvent('pointermove', {
      bubbles: true, buttons: 1, clientX: 32, clientY: 22,
    }))
    canvas.element.dispatchEvent(new MouseEvent('pointerup', {
      bubbles: true, button: 0, clientX: 32, clientY: 22,
    }))
    await wrapper.vm.$nextTick()

    expect(canvas.attributes('style')).toContain('translate(30px, 20px)')
    expect(wrapper.find('[data-testid="tool-preview-actions"]').exists()).toBe(false)
    expect(wrapper.get('.history-actions button[title="撤销"]').attributes('disabled')).toBeDefined()
    vi.useRealTimers()
  })

  it('organizes every supported tool into cutout and adjustment categories', async () => {
    const wrapper = mount(ImageEditor)
    const rail = wrapper.get('[data-testid="tool-rail"]')

    expect(rail.findAll('[data-tool-id]').map(tool => tool.attributes('data-tool-id'))).toEqual([
      'background-remover', 'ai-watermark-remover', 'smart-erase', 'background-fill', 'restore', 'background', 'outline', 'crop', 'resize', 'rotate-flip',
    ])
    expect(rail.text()).toContain('快速抠图')
    expect(rail.text()).toContain('AI 去水印')
    expect(rail.text()).toContain('智能擦除')
    expect(rail.text()).toContain('背景填色')
    expect(rail.text()).toContain('恢复')
    expect(rail.text()).toContain('背景替换')
    expect(rail.text()).toContain('描边')
    expect(rail.text()).toContain('裁剪')
    expect(rail.text()).toContain('调整尺寸')
    expect(rail.text()).toContain('旋转翻转')
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

    await uploadTestImage(wrapper)
    await wrapper.get('[data-testid="tool-rail"] [data-tool-id="crop"]').trigger('click')

    expect(wrapper.get('[data-testid="category-tool-list"]').text()).toContain('裁剪')
    expect(wrapper.get('[data-testid="category-tool-list"]').text()).toContain('调整尺寸')
    expect(wrapper.get('[data-testid="category-tool-list"]').text()).toContain('旋转翻转')
  })

  it('previews an exact correction angle and commits it only when applied', async () => {
    const pixels = new Uint8ClampedArray(4 * 4 * 4).fill(255)
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 4, height: 4, close: vi.fn() })))
    vi.stubGlobal('ImageData', class { constructor(public data: Uint8ClampedArray, public width: number, public height: number) {} })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(), getImageData: vi.fn(() => ({ width: 4, height: 4, data: pixels })), putImageData: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    const wrapper = mount(ImageEditor)
    const fileInput = wrapper.get('input[type="file"]')
    Object.defineProperty(fileInput.element, 'files', {
      value: [new File(['image'], 'pointer.png', { type: 'image/png' })], configurable: true,
    })
    await fileInput.trigger('change')
    await wrapper.get('[data-testid="tool-rail"] [data-tool-id="rotate-flip"]').trigger('click')

    const angleInput = wrapper.get('[data-testid="rotation-angle"]')
    expect(angleInput.attributes()).toMatchObject({ min: '-360', max: '360', step: '0.1' })
    await angleInput.setValue('')
    expect((angleInput.element as HTMLInputElement).value).toBe('')
    await angleInput.setValue('-15')

    expect(wrapper.get('.workspace-toolbar').text()).toContain('预览（尚未应用）')
    expect(wrapper.get('canvas.result-canvas').isVisible()).toBe(true)
    expect(wrapper.get('.history-actions button[title="撤销"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="tool-preview-actions"] .primary-operation').text()).toBe('应用旋转')

    await wrapper.get('[data-testid="tool-preview-actions"] .primary-operation').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="tool-preview-actions"]').exists()).toBe(false)
    expect(wrapper.get('canvas.result-canvas').attributes('style')).toContain('display: none')
    expect(wrapper.get('.history-actions button[title="撤销"]').attributes('disabled')).toBeUndefined()
  })

  it('offers fixed-size presets and defaults resize mode to centered cover', async () => {
    const wrapper = mount(ImageEditor)
    await uploadTestImage(wrapper)
    await wrapper.get('[data-testid="tool-rail"] [data-tool-id="resize"]').trigger('click')

    expect((wrapper.get('[data-testid="resize-mode"]').element as HTMLSelectElement).value).toBe('cover')
    expect(wrapper.get('[data-testid="resize-mode"]').findAll('option').map(option => option.text())).toEqual([
      '裁切铺满', '完整适应', '拉伸填满',
    ])
    await wrapper.get('[data-resize-preset="1440x720"]').trigger('click')
    const inputs = wrapper.findAll('.operation-panel input[type="number"]')
    expect((inputs[0]!.element as HTMLInputElement).value).toBe('1440')
    expect((inputs[1]!.element as HTMLInputElement).value).toBe('720')
  })

  it('marks the crop ratio as selected and draws eight resize handles', async () => {
    const arc = vi.fn()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({ width: 4, height: 2, data: new Uint8ClampedArray(4 * 2 * 4).fill(255) })),
      putImageData: vi.fn(),
      save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), rect: vi.fn(), fill: vi.fn(),
      stroke: vi.fn(), strokeRect: vi.fn(), setLineDash: vi.fn(), arc,
    } as unknown as CanvasRenderingContext2D)
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 4, height: 2, close: vi.fn() })))
    vi.stubGlobal('ImageData', class { constructor(public data: Uint8ClampedArray, public width: number, public height: number) {} })
    const wrapper = mount(ImageEditor)
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [new File(['image'], 'banner.png', { type: 'image/png' })], configurable: true,
    })
    await input.trigger('change')
    await wrapper.get('[data-testid="tool-rail"] [data-tool-id="crop"]').trigger('click')

    const square = wrapper.get('[data-crop-ratio="1"]')
    await square.trigger('click')

    expect(square.attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-crop-ratio="free"]').attributes('aria-pressed')).toBe('false')
    expect(arc).toHaveBeenCalledTimes(8)
  })

  it('moves an existing crop rectangle by dragging its interior', async () => {
    const strokeRect = vi.fn()
    const pixels = new Uint8ClampedArray(400 * 300 * 4).fill(255)
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 400, height: 300, close: vi.fn() })))
    vi.stubGlobal('ImageData', class { constructor(public data: Uint8ClampedArray, public width: number, public height: number) {} })
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300,
      x: 0, y: 0, toJSON: () => ({}),
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(), getImageData: vi.fn(() => ({ width: 400, height: 300, data: pixels })),
      putImageData: vi.fn(), save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), rect: vi.fn(),
      fill: vi.fn(), stroke: vi.fn(), strokeRect, setLineDash: vi.fn(), arc: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    const wrapper = mount(ImageEditor)
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [new File(['image'], 'photo.png', { type: 'image/png' })], configurable: true,
    })
    await input.trigger('change')
    await wrapper.get('[data-testid="tool-rail"] [data-tool-id="crop"]').trigger('click')
    await wrapper.findAll('.ratio-grid button').find(button => button.text() === '4:3')!.trigger('click')

    const canvas = wrapper.get('.workspace-stage canvas').element
    canvas.dispatchEvent(new MouseEvent('pointerdown', { button: 0, clientX: 200, clientY: 150 }))
    canvas.dispatchEvent(new MouseEvent('pointermove', { button: 0, clientX: 250, clientY: 180 }))
    canvas.dispatchEvent(new MouseEvent('pointerup', { button: 0, clientX: 250, clientY: 180 }))

    expect(strokeRect).toHaveBeenLastCalledWith(80, 60, 320, 240)
  })

  it('restores and saves the selected resize mode', async () => {
    localStorage.setItem(RESIZE_MODE_STORAGE_KEY, 'contain')
    const wrapper = mount(ImageEditor)
    await uploadTestImage(wrapper)
    await wrapper.get('[data-testid="tool-rail"] [data-tool-id="resize"]').trigger('click')

    const mode = wrapper.get('[data-testid="resize-mode"]')
    expect((mode.element as HTMLSelectElement).value).toBe('contain')
    await mode.setValue('stretch')
    expect(localStorage.getItem(RESIZE_MODE_STORAGE_KEY)).toBe('stretch')
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
    expect(wrapper.get('[data-testid="background-fill-mode-color"]').classes()).toContain('active')
    expect(wrapper.get('[data-testid="background-fill-mode-content"]').text()).toBe('内容填充')
    expect(wrapper.get('[data-testid="background-fill-color"]').attributes('type')).toBe('color')
    expect((wrapper.get('[data-testid="background-fill-color"]').element as HTMLInputElement).value).toBe('#ffffff')
    expect(wrapper.find('[data-testid="background-fill-tolerance"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('每次框选后立即填色，可连续框选')
    expect(wrapper.find('[data-testid="tool-preview-actions"]').exists()).toBe(false)

    await wrapper.get('[data-testid="background-fill-mode-content"]').trigger('click')
    expect(wrapper.get('[data-testid="background-fill-mode-content"]').classes()).toContain('active')
    expect(wrapper.find('[data-testid="background-fill-color"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('根据选区四周的背景自动补齐')

    const editorCanvas = wrapper.get('.workspace-stage canvas:not(.result-canvas)')
    vi.spyOn(editorCanvas.element, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 4, height: 4 } as DOMRect)
    Object.defineProperty(editorCanvas.element, 'setPointerCapture', { value: vi.fn(), configurable: true })
    editorCanvas.element.dispatchEvent(new MouseEvent('pointerdown', { button: 0, clientX: 0, clientY: 0 }))
    editorCanvas.element.dispatchEvent(new MouseEvent('pointerup', { clientX: 4, clientY: 4 }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="tool-preview-actions"]').exists()).toBe(false)
    expect(wrapper.get('.history-actions button[title="撤销"]').attributes('disabled')).toBeUndefined()

    editorCanvas.element.dispatchEvent(new MouseEvent('pointerdown', { button: 0, clientX: 0, clientY: 0 }))
    editorCanvas.element.dispatchEvent(new MouseEvent('pointerup', { clientX: 4, clientY: 4 }))
    await wrapper.vm.$nextTick()
    await wrapper.get('.history-actions button[title="撤销"]').trigger('click')
    expect(wrapper.get('.history-actions button[title="撤销"]').attributes('disabled')).toBeUndefined()

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

  it('undoes and redoes smart erase strokes one at a time before applying', async () => {
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
    await wrapper.get('[data-tool-id="smart-erase"]').trigger('click')

    const canvas = wrapper.get('canvas.result-canvas')
    vi.spyOn(canvas.element, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 4, height: 4 } as DOMRect)
    Object.defineProperty(canvas.element, 'setPointerCapture', { value: vi.fn(), configurable: true })
    const stroke = async (x: number): Promise<void> => {
      canvas.element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: x, clientY: 2 }))
      canvas.element.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, button: 0, clientX: x, clientY: 2 }))
      await wrapper.vm.$nextTick()
    }

    await stroke(1)
    await stroke(3)
    const undoButton = wrapper.get('.history-actions button[title="撤销"]')
    const redoButton = wrapper.get('.history-actions button[title="重做"]')
    expect(undoButton.attributes('disabled')).toBeUndefined()

    await undoButton.trigger('click')
    expect(undoButton.attributes('disabled')).toBeUndefined()
    expect(redoButton.attributes('disabled')).toBeUndefined()
    await undoButton.trigger('click')
    expect(undoButton.attributes('disabled')).toBeDefined()
    await redoButton.trigger('click')
    expect(undoButton.attributes('disabled')).toBeUndefined()

    await wrapper.get('[data-testid="tool-preview-actions"] .primary-operation').trigger('click')
    expect(wrapper.find('canvas.result-canvas').isVisible()).toBe(false)
    expect(undoButton.attributes('disabled')).toBeUndefined()
    await undoButton.trigger('click')
    expect(undoButton.attributes('disabled')).toBeDefined()
  })
})
