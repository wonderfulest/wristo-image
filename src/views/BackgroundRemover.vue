<template>
  <main class="image-editor" tabindex="0" @paste="onPaste" @dragover.prevent @drop.prevent="onDrop">
    <input ref="fileInput" class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" @change="onFileChange">

    <header data-testid="editor-topbar" class="editor-topbar">
      <RouterLink class="editor-brand" to="/" aria-label="返回 Wristo Image 首页">
        <span class="editor-brand-mark"><i /><i /></span><span>Wristo <b>Image</b></span>
      </RouterLink>
      <span class="topbar-divider" />
      <button class="topbar-upload" type="button" @click="fileInput?.click()"><span>＋</span>{{ sourceImage ? '更换图片' : '上传图片' }}</button>
      <span v-if="fileName" class="topbar-filename">{{ fileName }}</span>
      <div class="history-actions" aria-label="历史操作">
        <button type="button" :disabled="!canUndo" title="撤销" @click="undo">↶</button><button type="button" :disabled="!canRedo" title="重做" @click="redo">↷</button>
      </div>
      <span class="topbar-local"><i /> 本地处理</span>
      <button data-testid="download-button" class="topbar-download" type="button" :disabled="!sourceImage" @click="openExport">导出 <span>↓</span></button>
    </header>

    <div class="editor-body">
      <nav data-testid="tool-rail" class="tool-rail" aria-label="编辑工具">
        <button class="rail-item active" type="button"><span class="rail-icon">{{ activeTool.icon }}</span><b>工具</b></button>
        <button class="rail-item" type="button" @click="fileInput?.click()"><span class="rail-icon">↥</span><b>上传</b></button>
        <div class="rail-spacer" />
        <span class="privacy-dot" title="图片不会上传服务器" />
      </nav>

      <aside data-testid="tool-panel" class="tool-panel">
        <div class="tool-panel-heading"><div><span>图片工具</span><h1>{{ activeTool.title }}</h1></div><span class="active-badge">已启用</span></div>
        <p class="panel-intro">{{ activeTool.description }}</p>

        <div class="tool-grid">
          <button v-for="tool in editorTools" :key="tool.id" type="button" :class="{ active: activeTool.id === tool.id }" @click="selectTool(tool.id)"><span>{{ tool.icon }}</span><b>{{ tool.title }}</b></button>
        </div>

        <button v-if="!sourceImage" class="panel-upload-card" type="button" @click="fileInput?.click()">
          <span>＋</span><strong>上传一张图片</strong><small>PNG · JPEG · WEBP</small>
        </button>
        <div v-else class="source-card">
          <div class="source-thumb">IMG</div><div><strong>{{ fileName }}</strong><small>{{ sourceImage.width }} × {{ sourceImage.height }} px</small></div>
          <button type="button" @click="fileInput?.click()">更换</button>
        </div>

        <section v-if="activeTool.id === 'background-remover'" class="panel-section">
          <div class="section-title"><span>背景容差</span><output>{{ tolerance }}</output></div>
          <input data-testid="tolerance-input" class="tolerance-slider" type="range" min="0" max="120" step="1" v-model.number="tolerance" :disabled="!selection" @input="processSelection">
          <div class="range-label"><span>保留边缘</span><span>清除更多</span></div>
        </section>

        <section v-if="activeTool.id === 'background-remover'" class="panel-section instructions">
          <div class="section-title"><span>操作步骤</span></div>
          <ol><li><span>1</span>上传图片</li><li><span>2</span>在画布上框住图标</li><li><span>3</span>调整容差并下载</li></ol>
        </section>

        <section v-if="activeTool.id === 'crop'" class="panel-section operation-panel">
          <div class="section-title"><span>裁剪比例</span></div>
          <div class="ratio-grid"><button v-for="ratio in cropRatios" :key="ratio.label" type="button" @click="setCropRatio(ratio.value)">{{ ratio.label }}</button></div>
          <p>{{ selection ? `${Math.round(Math.abs(selection.width))} × ${Math.round(Math.abs(selection.height))} px` : '在画布上拖动创建裁剪框' }}</p>
          <button class="primary-operation" type="button" :disabled="!selection" @click="applyCrop">应用裁剪</button>
        </section>

        <section v-if="activeTool.id === 'resize'" class="panel-section operation-panel">
          <label>宽度 <input v-model.number="resizeWidth" type="number" min="1" max="8192" @input="syncResize('width')"> px</label>
          <label>高度 <input v-model.number="resizeHeight" type="number" min="1" max="8192" @input="syncResize('height')"> px</label>
          <label class="lock-row"><input v-model="lockRatio" type="checkbox"> 锁定原始比例</label>
          <button class="primary-operation" type="button" :disabled="!sourceImage" @click="applyResize">应用尺寸</button>
        </section>

        <section v-if="activeTool.id === 'rotate-flip'" class="panel-section operation-panel">
          <div class="operation-grid"><button type="button" @click="applyRotate('counter-clockwise')">↶<small>左转</small></button><button type="button" @click="applyRotate('clockwise')">↷<small>右转</small></button><button type="button" @click="applyFlip('horizontal')">↔<small>水平翻转</small></button><button type="button" @click="applyFlip('vertical')">↕<small>垂直翻转</small></button></div>
        </section>

        <div v-if="previewImage && activeTool.id === 'background-remover'" class="result-card"><span>透明结果已生成</span><strong>{{ previewImage.width }} × {{ previewImage.height }} px</strong></div>
        <p v-if="errorMessage" role="alert" class="editor-error">{{ errorMessage }}</p>
        <button v-if="previewImage && activeTool.id === 'background-remover'" class="reselect-button" type="button" @click="reselect">重新框选</button>
        <button data-testid="reset-button" class="panel-reset" type="button" :disabled="!sourceImage" @click="resetWorkspace">重置参数</button>
        <div class="local-note"><i /> <span><strong>图片仅在当前浏览器中处理</strong><br>不会上传服务器，刷新后自动清空。</span></div>
      </aside>

      <section class="editor-workspace">
        <div class="workspace-toolbar">
          <span>{{ workspaceMessage }}</span>
          <span v-if="sourceImage" class="zoom-chip">{{ Math.round(viewScale * 100) }}%</span>
        </div>
        <div
          class="workspace-stage"
          :class="{ checkerboard: previewImage, panning: isPanning }"
          @wheel.prevent="onWheel"
          @pointerdown="startPan"
          @pointermove="movePan"
          @pointerup="endPan"
          @pointercancel="endPan"
        >
          <canvas
            v-show="sourceImage && !previewImage"
            ref="editorCanvas"
            :style="canvasTransform"
            @pointerdown="startSelection"
            @pointermove="moveSelection"
            @pointerup="finishSelection"
            @pointercancel="finishSelection"
          />
          <canvas v-show="previewImage" ref="previewCanvas" class="result-canvas" :style="canvasTransform" />
          <button v-if="!sourceImage" class="workspace-empty" type="button" @click="fileInput?.click()">
            <span class="empty-image-icon"><i>＋</i></span>
            <strong>上传图片开始编辑</strong>
            <small>点击上传、拖入或直接粘贴图片</small>
            <b>上传图片</b>
          </button>
          <div data-testid="canvas-zoom-controls" class="canvas-zoom-controls" aria-label="画布缩放">
            <button type="button" title="缩小" :disabled="!sourceImage" @click="changeZoom(-.1)">−</button>
            <button type="button" class="zoom-value" title="恢复 100%" :disabled="!sourceImage" @click="resetZoom">{{ Math.round(viewScale * 100) }}%</button>
            <button type="button" title="放大" :disabled="!sourceImage" @click="changeZoom(.1)">＋</button>
            <button type="button" class="fit-button" title="适应画布" :disabled="!sourceImage" @click="fitView">适应</button>
          </div>
        </div>
        <footer class="workspace-footer"><span>最大 25 MB · 8192 × 8192 px</span><span>滚轮缩放 · 中键拖动画布</span></footer>
      </section>
    </div>

    <div v-if="exportOpen" class="export-backdrop" @click.self="exportOpen = false">
      <section class="export-dialog" role="dialog" aria-modal="true" aria-label="导出图片">
        <header><div><span>导出设置</span><h2>保存图片</h2></div><button @click="exportOpen = false">×</button></header>
        <label>格式 <select v-model="exportFormat"><option value="png">PNG</option><option value="jpeg">JPEG</option><option value="webp">WebP</option></select></label>
        <label v-if="exportFormat !== 'png'">质量 <input v-model.number="exportQuality" type="range" min="10" max="100"> {{ exportQuality }}%</label>
        <div class="export-size"><label>宽度 <input v-model.number="exportWidth" type="number" min="1" max="8192"></label><span>×</span><label>高度 <input v-model.number="exportHeight" type="number" min="1" max="8192"></label></div>
        <p>{{ exportFormat === 'jpeg' ? 'JPEG 不支持透明通道，透明区域将使用白色填充。' : '透明通道将被保留。' }}</p>
        <button class="export-confirm" @click="downloadExport">下载 {{ exportFormat.toUpperCase() }}</button>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { editorTools, resolveEditorTool, type EditorToolDefinition } from '@/features/editor/toolRegistry'
import { ImageHistory } from '@/features/editor/imageHistory'
import { cropImage, flipImage, resizeImage, rotateImage } from '@/features/editor/imageOperations'
import { consumeWheelZoom } from '@/features/editor/zoomControl'
import { validateImageDimensions, validateImageFile } from '@/features/background-remover/fileValidation'
import {
  normalizeSelection,
  removeConnectedBackground,
  trimTransparentBounds,
  type PixelImage,
  type SelectionRect,
} from '@/features/background-remover/imageProcessor'

const fileInput = ref<HTMLInputElement | null>(null)
const editorCanvas = ref<HTMLCanvasElement | null>(null)
const previewCanvas = ref<HTMLCanvasElement | null>(null)
const sourceImage = ref<PixelImage | null>(null)
const previewImage = ref<PixelImage | null>(null)
const selection = ref<SelectionRect | null>(null)
const selectionStart = ref<{ x: number; y: number } | null>(null)
const fileName = ref('')
const errorMessage = ref('')
const tolerance = ref(28)
const activeTool = ref(resolveEditorTool('background-remover'))
const history = ref<ImageHistory | null>(null)
const historyRevision = ref(0)
const viewScale = ref(1)
const wheelRemainder = ref(0)
const panX = ref(0)
const panY = ref(0)
const isPanning = ref(false)
const panStart = ref<{ x: number; y: number; panX: number; panY: number } | null>(null)
const resizeWidth = ref(1)
const resizeHeight = ref(1)
const lockRatio = ref(true)
const exportOpen = ref(false)
const exportFormat = ref<'png' | 'jpeg' | 'webp'>('png')
const exportQuality = ref(90)
const exportWidth = ref(1)
const exportHeight = ref(1)
const cropRatios = [{ label: '自由', value: null }, { label: '1:1', value: 1 }, { label: '4:3', value: 4 / 3 }, { label: '16:9', value: 16 / 9 }]
const canUndo = computed(() => { historyRevision.value; return history.value?.canUndo ?? false })
const canRedo = computed(() => { historyRevision.value; return history.value?.canRedo ?? false })
const canvasTransform = computed(() => ({ transform: `translate(${panX.value}px, ${panY.value}px) scale(${viewScale.value})` }))
const workspaceMessage = computed(() => previewImage.value ? '透明结果预览' : !sourceImage.value ? '画布' : activeTool.value.id === 'crop' ? '拖动鼠标创建裁剪区域' : activeTool.value.id === 'background-remover' ? '拖动鼠标框选要保留的图标' : '图片预览')

const pixelImageFromBitmap = (bitmap: ImageBitmap): PixelImage => {
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('当前浏览器无法创建图片画布。')
  context.drawImage(bitmap, 0, 0)
  const imageData = context.getImageData(0, 0, bitmap.width, bitmap.height)
  return { width: imageData.width, height: imageData.height, data: imageData.data }
}

const drawPixelImage = (canvas: HTMLCanvasElement, image: PixelImage): void => {
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d')
  if (!context) return
  context.putImageData(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height), 0, 0)
}

const drawEditor = (): void => {
  const canvas = editorCanvas.value
  const image = sourceImage.value
  if (!canvas || !image) return
  drawPixelImage(canvas, image)
  const current = selection.value && normalizeSelection(selection.value, image.width, image.height)
  if (!current) return
  const context = canvas.getContext('2d')
  if (!context) return
  context.save()
  context.fillStyle = 'rgba(3, 7, 12, .58)'
  context.beginPath()
  context.rect(0, 0, image.width, image.height)
  context.rect(current.x, current.y, current.width, current.height)
  context.fill('evenodd')
  context.strokeStyle = '#ff9f43'
  context.lineWidth = Math.max(2, image.width / 500)
  context.setLineDash([10, 8])
  context.strokeRect(current.x, current.y, current.width, current.height)
  context.restore()
}

const showPreview = async (): Promise<void> => {
  await nextTick()
  if (previewCanvas.value && previewImage.value) drawPixelImage(previewCanvas.value, previewImage.value)
}

const loadFile = async (file: File): Promise<void> => {
  errorMessage.value = validateImageFile(file) ?? ''
  if (errorMessage.value) return
  try {
    const bitmap = await createImageBitmap(file)
    errorMessage.value = validateImageDimensions(bitmap.width, bitmap.height) ?? ''
    if (errorMessage.value) { bitmap.close(); return }
    sourceImage.value = pixelImageFromBitmap(bitmap)
    history.value = new ImageHistory(sourceImage.value)
    historyRevision.value += 1
    bitmap.close()
    fileName.value = file.name
    selection.value = null
    previewImage.value = null
    tolerance.value = 28
    resizeWidth.value = sourceImage.value.width
    resizeHeight.value = sourceImage.value.height
    exportWidth.value = sourceImage.value.width
    exportHeight.value = sourceImage.value.height
    await nextTick()
    drawEditor()
  } catch {
    errorMessage.value = '无法读取这张图片，请尝试重新导出后再上传。'
  }
}

const onFileChange = (event: Event): void => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) void loadFile(file)
}
const onDrop = (event: DragEvent): void => { const file = event.dataTransfer?.files[0]; if (file) void loadFile(file) }
const onPaste = (event: ClipboardEvent): void => { const file = [...(event.clipboardData?.files ?? [])][0]; if (file) void loadFile(file) }

const pointInImage = (event: PointerEvent): { x: number; y: number } | null => {
  const canvas = editorCanvas.value
  if (!canvas) return null
  const bounds = canvas.getBoundingClientRect()
  if (!bounds.width || !bounds.height) return null
  return {
    x: Math.max(0, Math.min(canvas.width, (event.clientX - bounds.left) * canvas.width / bounds.width)),
    y: Math.max(0, Math.min(canvas.height, (event.clientY - bounds.top) * canvas.height / bounds.height)),
  }
}

const startSelection = (event: PointerEvent): void => {
  if (event.button !== 0) return
  if (!['background-remover', 'crop'].includes(activeTool.value.id) || previewImage.value) return
  const point = pointInImage(event)
  if (!point) return
  selectionStart.value = point
  selection.value = { ...point, width: 0, height: 0 }
  editorCanvas.value?.setPointerCapture(event.pointerId)
}
const moveSelection = (event: PointerEvent): void => {
  if (!selectionStart.value) return
  const point = pointInImage(event)
  if (!point) return
  selection.value = { x: selectionStart.value.x, y: selectionStart.value.y, width: point.x - selectionStart.value.x, height: point.y - selectionStart.value.y }
  drawEditor()
}
const finishSelection = (event: PointerEvent): void => {
  if (!selectionStart.value || !sourceImage.value) return
  moveSelection(event)
  selectionStart.value = null
  const normalized = selection.value && normalizeSelection(selection.value, sourceImage.value.width, sourceImage.value.height)
  if (!normalized || normalized.width < 3 || normalized.height < 3) {
    selection.value = null
    previewImage.value = null
    errorMessage.value = '选区太小，请重新框选图标。'
    drawEditor()
    return
  }
  selection.value = normalized
  if (activeTool.value.id === 'background-remover') processSelection()
  drawEditor()
}

const processSelection = (): void => {
  if (!sourceImage.value || !selection.value) return
  const processed = removeConnectedBackground(sourceImage.value, selection.value, tolerance.value)
  previewImage.value = trimTransparentBounds(processed)
  errorMessage.value = previewImage.value ? '' : '没有识别到可保留的主体，请降低容差或重新框选。'
  void showPreview()
}

const resetWorkspace = (): void => {
  tolerance.value = 28
  selection.value = null
  previewImage.value = null
  errorMessage.value = ''
  drawEditor()
}

const reselect = (): void => {
  previewImage.value = null
  errorMessage.value = ''
  void nextTick(drawEditor)
}

const selectTool = (toolId: EditorToolDefinition['id']): void => {
  activeTool.value = resolveEditorTool(toolId)
  previewImage.value = null
  selection.value = null
  errorMessage.value = ''
  void nextTick(drawEditor)
}

const commitImage = (image: PixelImage): void => {
  sourceImage.value = history.value?.commit(image) ?? image
  if (!history.value) history.value = new ImageHistory(image)
  historyRevision.value += 1
  selection.value = null; previewImage.value = null
  resizeWidth.value = image.width; resizeHeight.value = image.height
  exportWidth.value = image.width; exportHeight.value = image.height
  void nextTick(drawEditor)
}

const restoreHistory = (image: PixelImage): void => {
  sourceImage.value = image; selection.value = null; previewImage.value = null
  resizeWidth.value = image.width; resizeHeight.value = image.height
  exportWidth.value = image.width; exportHeight.value = image.height
  historyRevision.value += 1; void nextTick(drawEditor)
}
const undo = (): void => { if (history.value?.canUndo) restoreHistory(history.value.undo()) }
const redo = (): void => { if (history.value?.canRedo) restoreHistory(history.value.redo()) }
const applyRotate = (direction: 'clockwise' | 'counter-clockwise'): void => { if (sourceImage.value) commitImage(rotateImage(sourceImage.value, direction)) }
const applyFlip = (direction: 'horizontal' | 'vertical'): void => { if (sourceImage.value) commitImage(flipImage(sourceImage.value, direction)) }
const applyCrop = (): void => { if (sourceImage.value && selection.value) commitImage(cropImage(sourceImage.value, selection.value)) }
const setCropRatio = (ratio: number | null): void => {
  if (!sourceImage.value) return
  if (!ratio) { selection.value = null; drawEditor(); return }
  let width = sourceImage.value.width * .8; let height = width / ratio
  if (height > sourceImage.value.height * .8) { height = sourceImage.value.height * .8; width = height * ratio }
  selection.value = { x: (sourceImage.value.width - width) / 2, y: (sourceImage.value.height - height) / 2, width, height }; drawEditor()
}
const syncResize = (changed: 'width' | 'height'): void => {
  if (!sourceImage.value || !lockRatio.value) return
  const ratio = sourceImage.value.width / sourceImage.value.height
  if (changed === 'width') resizeHeight.value = Math.max(1, Math.round(resizeWidth.value / ratio))
  else resizeWidth.value = Math.max(1, Math.round(resizeHeight.value * ratio))
}
const applyResize = (): void => { if (sourceImage.value) commitImage(resizeImage(sourceImage.value, resizeWidth.value, resizeHeight.value)) }
const changeZoom = (delta: number): void => { viewScale.value = Math.max(.1, Math.min(8, Math.round((viewScale.value + delta) * 10) / 10)) }
const resetZoom = (): void => { viewScale.value = 1; panX.value = 0; panY.value = 0 }
const fitView = (): void => { viewScale.value = 1; panX.value = 0; panY.value = 0 }
const onWheel = (event: WheelEvent): void => {
  if (!sourceImage.value) return
  const result = consumeWheelZoom(wheelRemainder.value, event.deltaY)
  wheelRemainder.value = result.remainder
  if (result.steps) changeZoom(result.steps * .1)
}
const startPan = (event: PointerEvent): void => {
  if (event.button !== 1 || !sourceImage.value) return
  event.preventDefault()
  isPanning.value = true
  panStart.value = { x: event.clientX, y: event.clientY, panX: panX.value, panY: panY.value }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}
const movePan = (event: PointerEvent): void => {
  if (!panStart.value) return
  panX.value = panStart.value.panX + event.clientX - panStart.value.x
  panY.value = panStart.value.panY + event.clientY - panStart.value.y
}
const endPan = (): void => { isPanning.value = false; panStart.value = null }

const openExport = (): void => { if (sourceImage.value) { exportWidth.value = sourceImage.value.width; exportHeight.value = sourceImage.value.height; exportOpen.value = true } }

const downloadExport = (): void => {
  const current = previewImage.value ?? sourceImage.value
  if (!current) return
  const output = current.width === exportWidth.value && current.height === exportHeight.value ? current : resizeImage(current, exportWidth.value, exportHeight.value)
  const canvas = document.createElement('canvas'); canvas.width = output.width; canvas.height = output.height
  const context = canvas.getContext('2d'); if (!context) return
  if (exportFormat.value === 'jpeg') { context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height) }
  const pixels = document.createElement('canvas'); drawPixelImage(pixels, output); context.drawImage(pixels, 0, 0)
  const mime = `image/${exportFormat.value}`
  canvas.toBlob(blob => {
    if (!blob) return
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url
    link.download = `${fileName.value.replace(/\.[^.]+$/, '') || 'wristo-image'}-edited.${exportFormat.value === 'jpeg' ? 'jpg' : exportFormat.value}`
    link.click(); URL.revokeObjectURL(url); exportOpen.value = false
  }, mime, exportQuality.value / 100)
}

</script>

<style scoped>
.image-editor{height:100vh;min-height:620px;background:#f3f4f6;color:#20242a;display:grid;grid-template-rows:58px 1fr;overflow:hidden;font-family:'Instrument Sans Variable',sans-serif;outline:none}.editor-topbar{display:flex;align-items:center;gap:14px;padding:0 18px;background:#fff;border-bottom:1px solid #e1e4e8;z-index:5}.editor-brand{display:flex;align-items:center;gap:9px;font-family:'Bricolage Grotesque Variable';font-size:18px;letter-spacing:-.04em;color:#171a1f}.editor-brand b{color:#ff8124}.editor-brand-mark{width:24px;height:24px;display:grid;grid-template-columns:1fr 1fr;gap:3px;transform:rotate(7deg)}.editor-brand-mark i{border:2px solid #ff8124}.editor-brand-mark i:last-child{background:#ff8124;transform:translateY(4px)}.topbar-divider{width:1px;height:28px;background:#e1e4e8}.topbar-upload{border:0;background:#f1f3f5;color:#24282e;padding:9px 15px;border-radius:8px;font-weight:650;cursor:pointer}.topbar-upload span{font-size:18px;margin-right:6px}.topbar-filename{max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#757d87;font-size:12px}.history-actions{display:flex;gap:4px;margin-left:4px}.history-actions button{border:0;background:transparent;font-size:20px;color:#c1c6cc}.topbar-local{margin-left:auto;color:#76808a;font-size:11px}.topbar-local i,.local-note i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#3fcb83;margin-right:5px}.topbar-download{border:0;border-radius:8px;background:#ff8124;color:white;padding:10px 16px;font-weight:750;cursor:pointer}.topbar-download:disabled{background:#c8ccd1;color:#f4f5f6;cursor:not-allowed}.topbar-download span{margin-left:15px}.editor-body{min-height:0;display:grid;grid-template-columns:76px 304px minmax(0,1fr)}.tool-rail{background:#fff;border-right:1px solid #e1e4e8;display:flex;flex-direction:column;padding:10px 6px}.rail-item{border:0;background:transparent;color:#727b85;border-radius:9px;min-height:68px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;cursor:pointer}.rail-item.active{background:#fff0e6;color:#e8640c}.rail-icon{font-size:21px}.rail-item b{font-size:11px;font-weight:600}.rail-spacer{flex:1}.privacy-dot{width:9px;height:9px;border-radius:50%;background:#3fcb83;align-self:center;margin-bottom:12px;box-shadow:0 0 0 5px #e8f8ef}.tool-panel{background:#fff;border-right:1px solid #dfe3e7;padding:22px 18px;overflow:auto;box-shadow:5px 0 18px rgba(31,40,49,.04);z-index:2}.tool-panel-heading{display:flex;justify-content:space-between;align-items:start}.tool-panel-heading span{color:#929aa3;font-size:11px}.tool-panel-heading h1{font:650 25px 'Bricolage Grotesque Variable';margin:4px 0 0;color:#1f2328}.active-badge{background:#eaf8f0!important;color:#218d59!important;padding:5px 8px;border-radius:999px}.panel-intro{color:#747d86;font-size:12px;line-height:1.6;margin:15px 0 20px}.panel-upload-card{width:100%;height:126px;border:1px dashed #c8cdd3;background:#fafbfc;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;color:#2d3339;cursor:pointer}.panel-upload-card>span{font-size:25px;color:#ff8124}.panel-upload-card small{color:#9ba2aa;font-size:9px}.source-card{display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:9px;align-items:center;border:1px solid #e2e5e9;border-radius:9px;padding:9px}.source-thumb{height:42px;background:#20262c;color:#ff9b54;display:grid;place-items:center;font-size:9px}.source-card strong,.source-card small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.source-card strong{font-size:11px}.source-card small{font-size:9px;color:#949ba3;margin-top:4px}.source-card button{border:0;background:transparent;color:#e8640c;font-size:10px;cursor:pointer}.panel-section{border-top:1px solid #eceef0;margin-top:20px;padding-top:18px}.section-title{display:flex;justify-content:space-between;font-size:12px;font-weight:650}.section-title output{color:#e8640c}.tolerance-slider{width:100%;accent-color:#ff8124;margin:15px 0 5px}.tolerance-slider:disabled{opacity:.4}.range-label{display:flex;justify-content:space-between;color:#a0a6ad;font-size:9px}.instructions ol{padding:0;margin:12px 0;list-style:none}.instructions li{display:flex;align-items:center;gap:9px;color:#68717a;font-size:11px;margin:9px 0}.instructions li span{width:20px;height:20px;border-radius:50%;background:#f1f3f5;display:grid;place-items:center;color:#8a929a;font-size:9px}.result-card{margin-top:17px;background:#f0f9f4;border:1px solid #cfebda;padding:11px;border-radius:8px;display:flex;justify-content:space-between;color:#31855a;font-size:10px}.editor-error{background:#fff0ed;color:#bc4938;padding:9px;border-radius:7px;font-size:10px;line-height:1.4}.reselect-button,.panel-reset{width:100%;padding:10px;border-radius:7px;margin-top:9px;cursor:pointer}.reselect-button{border:0;background:#252a30;color:#fff}.panel-reset{border:1px solid #e0e3e6;background:#fff;color:#68717a}.panel-reset:disabled{opacity:.4}.local-note{display:flex;gap:7px;border-top:1px solid #eceef0;margin-top:20px;padding-top:15px;color:#9299a1;font-size:9px;line-height:1.55}.local-note strong{color:#68717a}.editor-workspace{min-width:0;display:grid;grid-template-rows:42px minmax(0,1fr) 30px;background:#e8eaed}.workspace-toolbar{display:flex;align-items:center;justify-content:space-between;padding:0 17px;background:#f8f9fa;border-bottom:1px solid #dadddf;color:#69727b;font-size:11px}.zoom-chip{background:#fff;border:1px solid #dfe2e5;padding:5px 9px;border-radius:5px}.workspace-stage{min-height:0;display:flex;align-items:center;justify-content:center;padding:28px;overflow:hidden;background-color:#e5e7ea;background-image:radial-gradient(#c9cdd1 .8px,transparent .8px);background-size:18px 18px}.workspace-stage.checkerboard{background-color:#ebedef;background-image:linear-gradient(45deg,#d6d9dd 25%,transparent 25%),linear-gradient(-45deg,#d6d9dd 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d6d9dd 75%),linear-gradient(-45deg,transparent 75%,#d6d9dd 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0}.workspace-stage canvas{display:block;max-width:100%;max-height:100%;box-shadow:0 12px 40px rgba(36,43,50,.22);touch-action:none}.workspace-stage canvas:not(.result-canvas){cursor:crosshair}.workspace-empty{width:min(680px,80%);height:min(480px,72%);border:1px dashed #bbc1c7;border-radius:12px;background:rgba(255,255,255,.65);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#394049;cursor:pointer}.empty-image-icon{width:62px;height:52px;border:2px solid #c7ccd1;border-radius:8px;display:grid;place-items:center;margin-bottom:20px}.empty-image-icon i{width:26px;height:26px;border-radius:50%;background:#ff8124;color:#fff;display:grid;place-items:center;font-style:normal;font-size:20px}.workspace-empty strong{font-size:16px}.workspace-empty small{color:#8b939b;margin:8px 0 18px}.workspace-empty b{background:#ff8124;color:#fff;padding:10px 20px;border-radius:7px;font-size:12px}.workspace-footer{display:flex;align-items:center;justify-content:space-between;padding:0 16px;background:#f8f9fa;border-top:1px solid #dadddf;color:#959ca4;font-size:9px}.visually-hidden{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
.history-actions button:not(:disabled){color:#545c65;cursor:pointer}.tool-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:18px}.tool-grid button{min-height:61px;border:1px solid #e3e6e9;border-radius:8px;background:#fafbfc;color:#616a73;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer}.tool-grid button span{font-size:18px}.tool-grid button b{font-size:10px}.tool-grid button.active{border-color:#ff9d59;background:#fff3e9;color:#d95f0b}.operation-panel{display:grid;gap:10px}.operation-panel>p{margin:0;color:#818992;font-size:10px}.operation-panel label{display:grid;grid-template-columns:52px 1fr auto;align-items:center;gap:7px;color:#66707a;font-size:11px}.operation-panel input[type=number],.export-dialog input[type=number],.export-dialog select{min-width:0;border:1px solid #d9dde1;border-radius:6px;padding:8px;background:#fff}.operation-panel .lock-row{display:flex}.ratio-grid,.operation-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}.ratio-grid button,.operation-grid button{border:1px solid #dfe3e7;background:#fff;border-radius:7px;padding:9px;color:#535c65;cursor:pointer}.operation-grid button{display:flex;flex-direction:column;gap:4px;font-size:18px}.operation-grid small{font-size:9px}.primary-operation{border:0;border-radius:7px;background:#252a30;color:#fff;padding:10px;cursor:pointer}.primary-operation:disabled{opacity:.4}.workspace-stage{position:relative}.workspace-stage.panning,.workspace-stage.panning canvas{cursor:grabbing!important}.workspace-stage canvas{transform-origin:center;transition:transform .12s ease}.canvas-zoom-controls{position:absolute;right:18px;bottom:18px;z-index:3;display:flex;align-items:center;padding:4px;background:rgba(255,255,255,.96);border:1px solid rgba(205,210,215,.9);border-radius:9px;box-shadow:0 8px 24px rgba(34,41,48,.16);backdrop-filter:blur(8px)}.canvas-zoom-controls button{height:30px;min-width:32px;border:0;background:transparent;color:#4f5861;border-radius:6px;font-weight:700;cursor:pointer}.canvas-zoom-controls button:hover:not(:disabled){background:#fff0e6;color:#df650f}.canvas-zoom-controls button:disabled{color:#c2c7cc;cursor:not-allowed}.canvas-zoom-controls .zoom-value{min-width:54px;font-size:11px;border-left:1px solid #eceef0;border-right:1px solid #eceef0;border-radius:0}.canvas-zoom-controls .fit-button{min-width:44px;margin-left:3px;font-size:10px}.export-backdrop{position:fixed;inset:0;z-index:20;background:rgba(24,28,32,.48);display:grid;place-items:center}.export-dialog{width:min(390px,calc(100vw - 32px));background:#fff;border-radius:14px;padding:22px;box-shadow:0 24px 80px rgba(0,0,0,.28);display:grid;gap:16px}.export-dialog header{display:flex;align-items:start;justify-content:space-between}.export-dialog header span{font-size:10px;color:#929aa3}.export-dialog h2{margin:3px 0 0;font:650 23px 'Bricolage Grotesque Variable'}.export-dialog header button{border:0;background:transparent;font-size:24px;color:#828a92;cursor:pointer}.export-dialog>label{display:grid;grid-template-columns:60px 1fr auto;align-items:center;gap:8px;font-size:12px}.export-size{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:end}.export-size label{display:grid;gap:5px;color:#68717a;font-size:10px}.export-dialog p{margin:0;color:#818992;font-size:10px}.export-confirm{border:0;border-radius:8px;background:#ff8124;color:#fff;padding:11px;font-weight:700;cursor:pointer}
@media(max-width:850px){.editor-body{grid-template-columns:64px 250px minmax(0,1fr)}.tool-panel{padding:17px 13px}.topbar-filename,.history-actions,.topbar-local{display:none}.workspace-footer span:last-child{display:none}}
@media(max-width:620px){.image-editor{min-height:560px}.editor-body{grid-template-columns:58px minmax(0,1fr)}.tool-panel{position:absolute;left:58px;top:58px;bottom:0;width:250px;transform:translateX(-100%);display:none}.tool-rail{z-index:4}.editor-brand>span:last-child{display:none}.editor-topbar{gap:8px;padding:0 10px}.topbar-download{margin-left:auto}.workspace-stage{padding:12px}}
</style>
