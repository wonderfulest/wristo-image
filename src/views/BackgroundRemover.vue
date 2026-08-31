<template>
  <main class="remover-page" tabindex="0" @paste="onPaste" @dragover.prevent @drop.prevent="onDrop">
    <header class="tool-heading">
      <RouterLink to="/" class="back-link">← 返回工具</RouterLink>
      <div><span class="eyebrow"><span>01</span> BACKGROUND REMOVER</span><h1>快速抠图</h1></div>
      <p>框住图标，自动清除与选区边缘连通的近似背景色。</p>
    </header>

    <div class="workbench">
      <aside class="panel import-panel">
        <div class="panel-label"><span>01</span> 导入</div>
        <input ref="fileInput" class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" @change="onFileChange">
        <button class="drop-zone" type="button" @click="fileInput?.click()">
          <span class="upload-symbol">↥</span>
          <strong>{{ sourceImage ? '更换图片' : '选择一张图片' }}</strong>
          <small>或拖入 / 粘贴图片</small>
          <i>PNG · JPEG · WEBP</i>
        </button>
        <div class="file-note">最大 25 MB<br>最大 8192 × 8192 px</div>
        <div v-if="fileName" class="file-card"><span class="file-dot" /><div><strong>{{ fileName }}</strong><small>{{ sourceImage?.width }} × {{ sourceImage?.height }}</small></div></div>
        <div class="privacy-note"><span>⌁</span><p><strong>图片仅在当前浏览器中处理</strong><br>刷新页面后自动清空。</p></div>
      </aside>

      <section class="canvas-panel">
        <div class="panel-bar"><span><b>02</b> 框选图标</span><small v-if="sourceImage">拖动鼠标重新选择</small></div>
        <div class="canvas-stage" :class="{ empty: !sourceImage }">
          <canvas
            v-show="sourceImage"
            ref="editorCanvas"
            @pointerdown="startSelection"
            @pointermove="moveSelection"
            @pointerup="finishSelection"
            @pointercancel="finishSelection"
          />
          <div v-if="!sourceImage" class="empty-canvas">
            <span class="empty-frame"><i /><i /><i /><i /></span>
            <strong>等待图片</strong>
            <p>导入后，在这里框选要保留的图标</p>
          </div>
        </div>
        <p class="canvas-hint">提示：选区四周尽量保留一点完整背景，识别会更准确。</p>
      </section>

      <aside class="panel output-panel">
        <div class="panel-label"><span>03</span> 预览与导出</div>
        <div class="preview-stage" :class="{ empty: !previewImage }">
          <canvas v-show="previewImage" ref="previewCanvas" />
          <div v-if="!previewImage"><span>透明预览</span><small>完成框选后显示</small></div>
        </div>
        <label class="control-row">
          <span>背景容差 <output>{{ tolerance }}</output></span>
          <input data-testid="tolerance-input" type="range" min="0" max="120" step="1" v-model.number="tolerance" :disabled="!selection" @input="processSelection">
          <small>低：保留更多边缘　高：清除更多背景</small>
        </label>
        <div v-if="previewImage" class="output-size"><span>输出尺寸</span><strong>{{ previewImage.width }} × {{ previewImage.height }} px</strong></div>
        <p v-if="errorMessage" role="alert" class="error-message">{{ errorMessage }}</p>
        <button data-testid="download-button" class="download-button" type="button" :disabled="!previewImage" @click="downloadPng">下载透明 PNG <span>↓</span></button>
        <button data-testid="reset-button" class="reset-button" type="button" :disabled="!sourceImage" @click="resetWorkspace">重置参数</button>
      </aside>
    </div>
  </main>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
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
    bitmap.close()
    fileName.value = file.name
    selection.value = null
    previewImage.value = null
    tolerance.value = 28
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
  processSelection()
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

const downloadPng = (): void => {
  const image = previewImage.value
  if (!image) return
  const canvas = document.createElement('canvas')
  drawPixelImage(canvas, image)
  canvas.toBlob((blob) => {
    if (!blob) { errorMessage.value = 'PNG 生成失败，请重试。'; return }
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${fileName.value.replace(/\.[^.]+$/, '') || 'wristo-image'}-transparent.png`
    link.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}
</script>
