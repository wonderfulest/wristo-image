<template>
  <main class="compressor-page" tabindex="-1" @drop.prevent="onDrop" @dragover.prevent @paste="onPaste">
    <header class="compressor-heading">
      <RouterLink class="back-link" to="/">← 返回工具列表</RouterLink>
      <div>
        <span class="eyebrow"><span>02</span> STORE ASSET COMPRESSOR</span>
        <h1>图片压缩</h1>
      </div>
      <p>锁定上传上限，在清晰度和像素尺寸之间自动寻找最优结果。</p>
    </header>

    <section class="compressor-workbench">
      <aside class="compressor-control">
        <span class="panel-label"><span>01</span> 原始图片</span>
        <input ref="fileInput" class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" @change="onFileChange" />
        <button class="compressor-drop" type="button" @click="fileInput?.click()">
          <span class="compressor-upload-mark">↥</span>
          <strong>{{ sourceFile ? '更换图片' : '拖入商城素材' }}</strong>
          <small>点击上传，或直接粘贴图片</small>
          <i>PNG · JPEG · WEBP</i>
        </button>

        <div v-if="sourceFile" class="compressor-file-card">
          <span />
          <div><strong>{{ sourceFile.name }}</strong><small>{{ formatBytes(sourceFile.size) }} · {{ sourceImage?.width }} × {{ sourceImage?.height }} px</small></div>
        </div>

        <label class="target-control">
          <span>目标上限 <b>KB</b></span>
          <div><input data-testid="target-kb" v-model.number="targetKb" type="number" min="1" step="1" /><em>KB</em></div>
          <small>严格不超过目标大小；默认适配商城 150 KB 限制。</small>
        </label>

        <p v-if="errorMessage" class="compressor-error" role="alert">{{ errorMessage }}</p>
        <button data-testid="compress-button" class="compress-action" type="button" :disabled="!sourceImage || !validTarget || isCompressing" @click="compress">
          <span>{{ isCompressing ? '正在寻找最优结果…' : '一键压缩' }}</span><b>→</b>
        </button>
        <div class="compressor-privacy"><span>●</span><p><strong>图片仅在当前浏览器中处理</strong><br />不会上传服务器，也不会保留素材。</p></div>
      </aside>

      <section class="compressor-preview">
        <div class="preview-bar"><span><b>02</b> 效果预览</span><small>{{ result ? 'READY TO DOWNLOAD' : 'WAITING FOR IMAGE' }}</small></div>
        <div class="preview-canvas checker">
          <canvas v-show="sourceImage && !result" ref="sourceCanvas" />
          <img v-if="resultUrl" :src="resultUrl" alt="压缩结果预览" />
          <div v-if="!sourceImage" class="compressor-empty"><span>150</span><strong>KB</strong><p>上传图片后，系统会自动压缩到目标大小以内</p></div>
        </div>
      </section>

      <aside class="compressor-result">
        <span class="panel-label"><span>03</span> 输出结果</span>
        <div v-if="result" class="result-ready">
          <div class="result-weight"><span>{{ formatBytes(result.blob.size) }}</span><small>目标 ≤ {{ targetKb }} KB</small></div>
          <dl>
            <div><dt>原始大小</dt><dd>{{ formatBytes(sourceFile?.size ?? 0) }}</dd></div>
            <div><dt>节省空间</dt><dd class="saving">{{ savedPercent }}%</dd></div>
            <div><dt>输出尺寸</dt><dd>{{ result.width }} × {{ result.height }}</dd></div>
            <div><dt>输出格式</dt><dd>{{ result.format.toUpperCase() }}</dd></div>
          </dl>
          <button class="download-result" type="button" @click="download"><span>下载压缩图片</span><b>↓</b></button>
        </div>
        <div v-else class="result-empty"><span>—</span><p>压缩完成后，这里会显示文件体积、尺寸与节省比例。</p></div>
      </aside>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { PixelImage } from '@/features/background-remover/imageProcessor'
import { validateImageDimensions, validateImageFile } from '@/features/background-remover/fileValidation'
import { compressImageToTarget, type CompressionResult } from '@/features/compressor/compressImage'
import { encodePixelImage } from '@/features/compressor/canvasEncoder'
import { downloadBlob } from '@/features/editor/downloadBlob'

const fileInput = ref<HTMLInputElement | null>(null)
const sourceCanvas = ref<HTMLCanvasElement | null>(null)
const sourceFile = ref<File | null>(null)
const sourceImage = ref<PixelImage | null>(null)
const targetKb = ref(150)
const result = ref<CompressionResult | null>(null)
const resultUrl = ref('')
const errorMessage = ref('')
const isCompressing = ref(false)

const validTarget = computed(() => Number.isFinite(targetKb.value) && targetKb.value >= 1)
const savedPercent = computed(() => sourceFile.value && result.value
  ? Math.max(0, Math.round((1 - result.value.blob.size / sourceFile.value.size) * 100))
  : 0)

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  return `${Number.isInteger(kb) ? kb : kb.toFixed(1)} KB`
}

const clearResult = (): void => {
  result.value = null
  if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
  resultUrl.value = ''
}

watch(targetKb, clearResult)

const drawSource = (): void => {
  if (!sourceCanvas.value || !sourceImage.value) return
  const canvas = sourceCanvas.value
  canvas.width = sourceImage.value.width
  canvas.height = sourceImage.value.height
  canvas.getContext('2d')?.putImageData(
    new ImageData(new Uint8ClampedArray(sourceImage.value.data), sourceImage.value.width, sourceImage.value.height), 0, 0,
  )
}

const loadFile = async (file: File): Promise<void> => {
  errorMessage.value = validateImageFile(file) ?? ''
  if (errorMessage.value) return
  try {
    const bitmap = await createImageBitmap(file)
    const dimensionError = validateImageDimensions(bitmap.width, bitmap.height)
    if (dimensionError) {
      bitmap.close()
      errorMessage.value = dimensionError
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvas unavailable')
    context.drawImage(bitmap, 0, 0)
    const data = context.getImageData(0, 0, bitmap.width, bitmap.height)
    bitmap.close()
    sourceFile.value = file
    sourceImage.value = { width: data.width, height: data.height, data: data.data }
    clearResult()
    await nextTick()
    drawSource()
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

const compress = async (): Promise<void> => {
  if (!sourceImage.value || !validTarget.value || isCompressing.value) return
  isCompressing.value = true
  errorMessage.value = ''
  clearResult()
  try {
    result.value = await compressImageToTarget(sourceImage.value, Math.floor(targetKb.value * 1024), { encode: encodePixelImage })
    resultUrl.value = URL.createObjectURL(result.value.blob)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '图片压缩失败，请重试。'
  } finally {
    isCompressing.value = false
  }
}

const download = (): void => {
  if (!sourceFile.value || !result.value) return
  const baseName = sourceFile.value.name.replace(/\.[^.]+$/, '') || 'image'
  const extension = result.value.format === 'jpeg' ? 'jpg' : 'png'
  downloadBlob(result.value.blob, `${baseName}-compressed.${extension}`)
}

onBeforeUnmount(clearResult)
</script>

<style scoped>
.compressor-page{padding:38px clamp(18px,3vw,48px) 70px;outline:none}.compressor-heading{max-width:1500px;margin:0 auto 28px;display:grid;grid-template-columns:170px 1fr auto;align-items:end;gap:30px}.compressor-heading h1{font:560 48px 'Bricolage Grotesque Variable';margin:8px 0 0;letter-spacing:-.045em}.compressor-heading>p{color:var(--muted);max-width:440px;line-height:1.6;margin:0}.compressor-workbench{max-width:1500px;min-height:680px;margin:auto;display:grid;grid-template-columns:280px minmax(420px,1fr) 300px;border:1px solid var(--line);background:var(--panel);box-shadow:0 28px 80px rgba(0,0,0,.32)}.compressor-control,.compressor-result{padding:24px;display:flex;flex-direction:column}.compressor-control{border-right:1px solid var(--line)}.compressor-result{border-left:1px solid var(--line)}.compressor-drop{min-height:190px;margin:26px 0 12px;border:1px dashed #3a4650;background:#0d1318;color:var(--ink);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:.2s}.compressor-drop:hover{border-color:var(--orange);background:#151719}.compressor-upload-mark{color:var(--orange);font-size:34px}.compressor-drop small,.compressor-drop i{color:var(--muted);font-size:11px}.compressor-drop i{font-style:normal;font-size:9px;letter-spacing:.12em;margin-top:9px}.compressor-file-card{display:flex;gap:10px;align-items:center;background:#171f26;padding:11px;min-width:0}.compressor-file-card>span{width:7px;height:7px;border-radius:50%;background:var(--orange);flex:none}.compressor-file-card div{min-width:0}.compressor-file-card strong,.compressor-file-card small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.compressor-file-card strong{font-size:11px}.compressor-file-card small{font-size:10px;color:var(--muted);margin-top:3px}.target-control{display:block;margin-top:25px}.target-control>span{display:flex;justify-content:space-between;font-size:12px}.target-control>span b{color:var(--orange)}.target-control>div{position:relative;margin-top:10px}.target-control input{width:100%;height:52px;background:#0b1014;border:1px solid #35404a;color:var(--ink);padding:0 55px 0 15px;font:600 24px 'Bricolage Grotesque Variable'}.target-control em{position:absolute;right:15px;top:18px;color:var(--orange);font-size:11px;font-style:normal}.target-control small{display:block;color:#69747d;font-size:9px;line-height:1.55;margin-top:8px}.compressor-error{background:#321a18;border:1px solid #6b3028;color:#ff9d8f;padding:10px;font-size:11px;line-height:1.5}.compress-action,.download-result{border:0;background:var(--orange);color:#1a1008;padding:15px 14px;font-weight:800;display:flex;justify-content:space-between;cursor:pointer}.compress-action{margin-top:22px}.compress-action:disabled{background:#252d34;color:#5f6971;cursor:not-allowed}.compressor-privacy{margin-top:auto;border-top:1px solid var(--line);padding-top:20px;display:flex;gap:10px;color:#78838c}.compressor-privacy>span{color:#60d394;font-size:10px}.compressor-privacy p{margin:0;font-size:10px;line-height:1.55}.compressor-privacy strong{color:#aab4bb}.compressor-preview{min-width:0;background:#0b1014;display:flex;flex-direction:column}.preview-bar{height:58px;padding:0 22px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);font-size:12px;letter-spacing:.1em}.preview-bar b{color:var(--orange);margin-right:9px}.preview-bar small{color:#66717a;font-size:9px}.preview-canvas{flex:1;min-height:620px;display:flex;align-items:center;justify-content:center;padding:35px;overflow:hidden}.preview-canvas canvas,.preview-canvas img{display:block;max-width:100%;max-height:550px;box-shadow:0 18px 55px rgba(0,0,0,.55)}.compressor-empty{text-align:center;color:#69747d;max-width:270px}.compressor-empty span{font:560 100px/.8 'Bricolage Grotesque Variable';color:#29333c;letter-spacing:-.08em}.compressor-empty strong{color:var(--orange);font-size:20px;margin-left:8px}.compressor-empty p{font-size:12px;line-height:1.7}.result-empty{margin:auto 0;text-align:center;color:#65707a}.result-empty span{font:400 60px 'Bricolage Grotesque Variable';color:#303943}.result-empty p{font-size:11px;line-height:1.7}.result-ready{display:flex;flex-direction:column;flex:1}.result-weight{padding:45px 0 28px;border-bottom:1px solid var(--line)}.result-weight span{display:block;color:var(--orange);font:560 42px 'Bricolage Grotesque Variable';letter-spacing:-.04em}.result-weight small{color:var(--muted)}.result-ready dl{margin:20px 0}.result-ready dl div{display:flex;justify-content:space-between;padding:11px 0;border-bottom:1px solid #202830;font-size:11px}.result-ready dt{color:var(--muted)}.result-ready dd{margin:0;color:#d3dade}.result-ready .saving{color:#60d394}.download-result{margin-top:auto;width:100%}@media(max-width:1050px){.compressor-heading{grid-template-columns:1fr}.compressor-heading>p{display:none}.compressor-workbench{grid-template-columns:240px 1fr}.compressor-result{grid-column:1/-1;border-left:0;border-top:1px solid var(--line);min-height:300px}.preview-canvas{min-height:520px}}@media(max-width:700px){.compressor-page{padding:24px 12px}.compressor-heading h1{font-size:39px}.compressor-workbench{display:block}.compressor-control,.compressor-result{border:0;border-bottom:1px solid var(--line)}.preview-canvas{min-height:400px}.compressor-result{min-height:340px}}
</style>
