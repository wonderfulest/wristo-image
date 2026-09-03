<template>
  <main class="text-assets-page">
    <header class="text-assets-topbar">
      <RouterLink class="text-assets-brand" to="/"><span>WRISTO / IMAGE</span><b>透明文字素材</b></RouterLink>
      <span class="local-state"><i /> 本地处理</span>
      <button
        data-testid="download-text-assets"
        class="export-button"
        type="button"
        :disabled="!renderedAssets.length || rendering"
        @click="downloadZip"
      >下载 ZIP <span>↓</span></button>
    </header>

    <div class="text-assets-layout">
      <aside class="asset-list-panel">
        <div class="panel-heading"><span>01</span><div><strong>文字列表</strong><small>一行导出一张透明 PNG</small></div></div>
        <div class="preset-picker" aria-label="文字快速选择">
          <span>快速选择</span>
          <div>
            <button v-for="preset in textPresets" :key="preset.id" type="button" @click="selectPreset(preset)">{{ preset.label }}</button>
            <button type="button" @click="selectWeekdayBadge">红色星期徽章</button>
          </div>
        </div>
        <p v-if="assetMode === 'weekday-badge'" class="badge-template-note">红色星期徽章 · 183 × 41 px</p>
        <div class="asset-list">
          <article v-for="(asset, index) in assets" :key="asset.id" data-testid="text-asset-row" class="asset-row">
            <span>{{ String(index + 1).padStart(2, '0') }}</span>
            <label><small>文字</small><input :value="asset.text" :aria-label="`第 ${index + 1} 行文字`" maxlength="32" @input="updateText(asset, $event)" /></label>
            <label><small>文件名</small><input :value="asset.fileName" :aria-label="`第 ${index + 1} 行文件名`" maxlength="40" @input="updateFileName(asset, $event)" /></label>
            <label class="color-field"><small>颜色</small><input v-model="asset.color" :aria-label="`第 ${index + 1} 行颜色`" type="color" /></label>
            <button type="button" :disabled="assets.length === 1" :aria-label="`删除 ${asset.text || '空白文字'}`" @click="removeAsset(asset.id)">×</button>
          </article>
        </div>
        <button class="add-row" type="button" @click="addAsset">+ 添加一行</button>
      </aside>

      <section class="text-preview-panel">
        <div class="preview-heading"><div><span>02 / PREVIEW</span><h1>透明文字素材</h1></div><p>画布按本批最大文字尺寸自动统一</p></div>
        <div class="preview-canvas text-checker">
          <div v-if="renderedAssets.length" class="asset-preview-grid">
            <article v-for="asset in renderedAssets" :key="asset.id" class="asset-preview">
              <img :src="asset.url" :alt="`${asset.text} 预览`" />
              <span>{{ asset.fileName }}</span>
              <button type="button" @click="downloadOne(asset)">下载 PNG</button>
            </article>
          </div>
          <div v-else class="preview-placeholder"><b>MON&nbsp; AM&nbsp; 24H</b><span>设置文字和样式后，生成一组等尺寸的透明 PNG</span></div>
        </div>
        <p v-if="error" class="render-error" role="alert">{{ error }}</p>
        <p v-else-if="renderedAssets.length" class="canvas-summary">已生成 {{ renderedAssets.length }} 张 PNG · 每张 {{ renderedAssets[0]?.width }} × {{ renderedAssets[0]?.height }} px</p>
      </section>

      <aside class="style-panel">
        <div class="panel-heading"><span>03</span><div><strong>统一样式</strong><small>应用于当前全部文字</small></div></div>
        <label class="control-row"><span>字体</span><select v-model="style.fontFamily"><option value="Arial">无衬线</option><option value="Georgia">衬线</option><option value="Courier New">等宽</option></select></label>
        <label class="control-row"><span>字号 <output>{{ style.fontSize }} px</output></span><input v-model.number="style.fontSize" type="range" min="8" max="240" step="1" /></label>
        <label class="control-row"><span>字重 <output>{{ style.fontWeight }}</output></span><input v-model.number="style.fontWeight" type="range" min="100" max="900" step="100" /></label>
        <label class="control-row"><span>安全边距 <output>{{ style.padding }} px</output></span><input v-model.number="style.padding" type="range" min="0" max="64" step="1" /></label>
        <label class="control-row"><span>横向对齐</span><select v-model="style.horizontalAlign"><option value="left">靠左</option><option value="center">居中</option><option value="right">靠右</option></select></label>
        <div class="apply-color">
          <div><span>快捷颜色</span><input v-model="globalColor" aria-label="快捷颜色" type="color" /></div>
          <button type="button" @click="applyColorToAll">应用到全部</button>
        </div>
        <button class="render-button" type="button" :disabled="!hasText || rendering" @click="renderAll">{{ rendering ? '正在生成…' : '生成预览' }} <span>→</span></button>
        <p class="privacy-copy"><i /> 所有文字、颜色与 PNG 均仅在当前浏览器处理。</p>
      </aside>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { createHistoryZip } from '@/features/editor/downloadHistoryZip'
import { downloadBlob } from '@/features/editor/downloadBlob'
import {
  disposeRenderedTextAssets,
  normalizeTextAssetFileName,
  renderTextAssets,
  type RenderedTextAsset,
  type TextAssetDraft,
  type TextAssetStyle,
} from '@/features/text-assets/textAssetRenderer'
import {
  createWeekdayBadgePreset,
  renderWeekdayBadges,
  type WeekdayBadgeAsset,
} from '@/features/text-assets/weekdayBadge'

let nextAssetId = 8
const weekdayAbbreviations = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const textPresets = [
  { id: 'weekday-short', label: '星期缩写', texts: weekdayAbbreviations },
  { id: 'weekday-full', label: '星期全写', texts: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
  { id: 'am-pm', label: 'AM / PM', texts: ['AM', 'PM'] },
  { id: '24h', label: '24H', texts: ['24H'] },
] as const
type TextAssetRow = TextAssetDraft & { fileNameIsCustom: boolean; slot?: number }
const derivedFileName = (text: string): string => normalizeTextAssetFileName(text.toLowerCase(), 'text').replace(/\.png$/, '')
const createAsset = (text: string, color = '#ffffff'): TextAssetRow => ({
  id: String(nextAssetId++), text, fileName: derivedFileName(text), color, fileNameIsCustom: false,
})
const assets = reactive<TextAssetRow[]>(weekdayAbbreviations.map(text => createAsset(text)))
const style = reactive<TextAssetStyle>({
  fontFamily: 'Arial', fontSize: 72, fontWeight: 700, padding: 8, horizontalAlign: 'center',
})
const globalColor = ref('#ffffff')
const renderedAssets = ref<RenderedTextAsset[]>([])
const rendering = ref(false)
const error = ref('')
const assetMode = ref<'plain' | 'weekday-badge'>('plain')
const hasText = computed(() => assets.some(asset => asset.text.trim().length > 0))

const clearPreviews = (): void => {
  disposeRenderedTextAssets(renderedAssets.value)
  renderedAssets.value = []
}

function addAsset() {
  assetMode.value = 'plain'
  assets.push({ ...createAsset('', globalColor.value), fileName: `text-${assets.length + 1}` })
}

function removeAsset(id: string) {
  if (assets.length > 1) assets.splice(assets.findIndex(asset => asset.id === id), 1)
}

function applyColorToAll() {
  assets.forEach(asset => { asset.color = globalColor.value })
}

function selectPreset(preset: typeof textPresets[number]) {
  clearPreviews()
  assetMode.value = 'plain'
  assets.splice(0, assets.length, ...preset.texts.map(text => createAsset(text, globalColor.value)))
  error.value = ''
}

function selectWeekdayBadge() {
  clearPreviews()
  assetMode.value = 'weekday-badge'
  globalColor.value = '#ff2222'
  assets.splice(0, assets.length, ...createWeekdayBadgePreset(globalColor.value).map(asset => ({ ...asset, fileNameIsCustom: false })))
  error.value = ''
}

function updateText(asset: TextAssetRow, event: Event) {
  asset.text = (event.target as HTMLInputElement).value
  if (!asset.fileNameIsCustom) asset.fileName = derivedFileName(asset.text)
}

function updateFileName(asset: TextAssetRow, event: Event) {
  asset.fileName = (event.target as HTMLInputElement).value
  asset.fileNameIsCustom = true
}

async function renderAll() {
  if (!hasText.value) return
  rendering.value = true
  error.value = ''
  try {
    const next = assetMode.value === 'weekday-badge'
      ? await renderWeekdayBadges(assets.filter(asset => asset.text.trim()).map(asset => ({ ...asset, slot: asset.slot ?? 0 }) satisfies WeekdayBadgeAsset))
      : await renderTextAssets(assets.filter(asset => asset.text.trim()), { ...style })
    clearPreviews()
    renderedAssets.value = next
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '文字素材生成失败'
  } finally {
    rendering.value = false
  }
}

function downloadOne(asset: RenderedTextAsset) {
  downloadBlob(asset.blob, asset.fileName)
}

async function downloadZip() {
  if (!renderedAssets.value.length) return
  const zip = await createHistoryZip(renderedAssets.value.map(asset => ({ name: asset.fileName, blob: asset.blob })))
  downloadBlob(zip, 'wristo-text-assets.zip')
}

watch([assets, style], clearPreviews, { deep: true })
onBeforeUnmount(clearPreviews)
</script>

<style scoped>
.preset-picker{margin:-4px 0 8px;padding:10px;background:#151c22;border:1px solid #26313a}.preset-picker>span{display:block;margin-bottom:8px;color:#76818a;font-size:9px}.preset-picker>div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.preset-picker button{min-width:0;border:1px solid #3a474f;background:#0d1318;color:#c5cdd1;padding:7px 4px;font-size:10px;cursor:pointer}.preset-picker button:hover{border-color:var(--orange);color:var(--orange)}.badge-template-note{margin:0 0 12px;color:var(--orange);font-size:9px}
.text-assets-page{min-height:100vh;background:#090d11;color:var(--ink)}.text-assets-topbar{height:58px;border-bottom:1px solid var(--line);display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 16px;background:#0d1217}.text-assets-brand{display:flex;align-items:center;gap:16px;font-size:10px;letter-spacing:.12em;color:var(--orange)}.text-assets-brand b{color:#dce2e6;font:550 15px 'Bricolage Grotesque Variable';letter-spacing:-.02em}.local-state{font-size:10px;color:#9ca7ae}.local-state i,.privacy-copy i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#60d394;box-shadow:0 0 9px #60d394;margin-right:6px}.export-button,.render-button{justify-self:end;border:0;background:var(--orange);color:#17100a;padding:10px 14px;font-weight:800;cursor:pointer}.export-button span,.render-button span{margin-left:22px}.export-button:disabled,.render-button:disabled{background:#252d34;color:#626d76;cursor:not-allowed}.text-assets-layout{display:grid;grid-template-columns:310px minmax(470px,1fr) 300px;min-height:calc(100vh - 58px)}.asset-list-panel,.style-panel{background:#10161b;padding:22px;border-right:1px solid var(--line)}.style-panel{border-right:0;border-left:1px solid var(--line)}.panel-heading{display:flex;gap:13px;align-items:start;margin-bottom:22px}.panel-heading>span,.preview-heading>div>span{font:700 10px 'Instrument Sans Variable';letter-spacing:.14em;color:var(--orange)}.panel-heading strong,.panel-heading small{display:block}.panel-heading strong{font-size:13px}.panel-heading small{color:#69757e;font-size:9px;margin-top:5px}.asset-list{display:grid;gap:8px}.asset-row{display:grid;grid-template-columns:20px minmax(0,1fr) 72px 33px 22px;gap:6px;align-items:end;padding:9px 7px;background:#151c22;border:1px solid #26313a}.asset-row>span{color:var(--orange);font-size:9px;padding-bottom:7px}.asset-row label{min-width:0}.asset-row small{display:block;color:#68747d;font-size:8px;margin-bottom:4px}.asset-row input{box-sizing:border-box;width:100%;border:1px solid #3a464f;background:#0d1318;color:#e2e7e9;padding:6px;font-size:10px}.asset-row .color-field input{height:29px;padding:2px}.asset-row button{border:0;background:transparent;color:#89959d;font-size:18px;line-height:28px;cursor:pointer}.asset-row button:disabled{opacity:.25;cursor:not-allowed}.add-row{width:100%;margin-top:12px;border:1px dashed #45515b;background:transparent;color:#aeb8be;padding:10px;cursor:pointer;font-size:11px}.text-preview-panel{min-width:0;padding:28px;background:#0b1014;background-image:radial-gradient(rgba(255,255,255,.05) 1px,transparent 1px);background-size:18px 18px}.preview-heading{display:flex;justify-content:space-between;align-items:end;margin-bottom:20px}.preview-heading h1{font:550 34px 'Bricolage Grotesque Variable';letter-spacing:-.045em;margin:6px 0 0}.preview-heading p{font-size:10px;color:#68747d}.preview-canvas{min-height:410px;border:1px solid #2d3740;display:flex;align-items:center;justify-content:center;padding:26px;overflow:auto}.text-checker{background-color:#11171d;background-image:linear-gradient(45deg,#1c242c 25%,transparent 25%),linear-gradient(-45deg,#1c242c 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1c242c 75%),linear-gradient(-45deg,transparent 75%,#1c242c 75%);background-size:22px 22px;background-position:0 0,0 11px,11px -11px,-11px 0}.preview-placeholder{display:flex;flex-direction:column;gap:12px;text-align:center;color:#5f6a72}.preview-placeholder b{font:550 clamp(28px,4vw,58px) 'Bricolage Grotesque Variable';color:#76818a}.preview-placeholder span{font-size:11px}.asset-preview-grid{width:100%;display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px}.asset-preview{background:#10161b;border:1px solid #2b3740;padding:11px;display:grid;gap:8px}.asset-preview img{width:100%;height:96px;object-fit:contain;background-color:#141a20;background-image:linear-gradient(45deg,#1f2730 25%,transparent 25%),linear-gradient(-45deg,#1f2730 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1f2730 75%),linear-gradient(-45deg,transparent 75%,#1f2730 75%);background-size:14px 14px;background-position:0 0,0 7px,7px -7px,-7px 0}.asset-preview span{font:10px 'Instrument Sans Variable';color:#849099;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.asset-preview button{justify-self:start;border:1px solid #3b4851;background:transparent;color:#c1c9ce;padding:5px 8px;font-size:9px;cursor:pointer}.canvas-summary,.render-error{margin:13px 0 0;font-size:10px;color:#7f8c94}.render-error{color:#ff9d8f}.control-row{display:block;padding:13px 0;border-top:1px solid #252e35}.control-row>span{display:flex;justify-content:space-between;font-size:10px;color:#aeb7bd}.control-row output{color:var(--orange);font-weight:700}.control-row input[type=range]{width:100%;accent-color:var(--orange);margin-top:12px}.control-row select{width:100%;margin-top:10px;background:#171f26;border:1px solid #35404a;color:#d6dde1;padding:7px;font-size:10px}.apply-color{border-top:1px solid #252e35;padding:13px 0;display:flex;align-items:end;justify-content:space-between}.apply-color span{display:block;color:#aeb7bd;font-size:10px;margin-bottom:6px}.apply-color input{display:block;width:42px;height:28px;border:1px solid #3a444c;background:#111;padding:2px}.apply-color button{border:1px solid #44515a;background:transparent;color:#bdc5ca;padding:8px;font-size:10px;cursor:pointer}.render-button{width:100%;margin-top:16px}.privacy-copy{font-size:9px;color:#66717a;line-height:1.5;margin-top:18px}.privacy-copy i{width:6px;height:6px}
@media(max-width:1100px){.text-assets-layout{grid-template-columns:280px 1fr}.style-panel{grid-column:1/-1;border-left:0;border-top:1px solid var(--line);display:grid;grid-template-columns:repeat(3,1fr);gap:0 22px}.style-panel .panel-heading,.style-panel .render-button,.style-panel .privacy-copy{grid-column:1/-1}.render-button{justify-self:stretch}}@media(max-width:720px){.text-assets-topbar{grid-template-columns:1fr auto}.local-state{display:none}.text-assets-layout{display:block}.asset-list-panel,.style-panel{border:0;border-bottom:1px solid var(--line)}.style-panel{display:block}.text-preview-panel{padding:20px 12px}.preview-heading p{display:none}.preview-canvas{min-height:280px;padding:12px}.asset-row{grid-template-columns:18px minmax(0,1fr) 58px 30px 18px;gap:4px;padding:7px 4px}}
</style>
