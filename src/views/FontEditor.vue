<template>
  <main class="font-editor-page">
    <header class="font-editor-topbar">
      <RouterLink class="font-editor-brand" to="/"><span>WRISTO / IMAGE</span><b>时间数字编辑器</b></RouterLink>
      <div class="topbar-meta"><span class="local-state"><i /> 本地处理</span><span>{{ source?.family || '未载入字体' }}</span></div>
      <button data-testid="download-glyphs" class="export-button" type="button" :disabled="!canDownload" @click="downloadGlyphs">
        {{ downloading ? '正在生成…' : '下载 PNG 字体' }} <span>↓</span>
      </button>
    </header>

    <div class="font-editor-layout">
      <aside class="font-source-panel">
        <div class="panel-title"><span>01</span><div><strong>字体源文件</strong><small>TTF / OTF · 最大 20 MB</small></div></div>
        <label class="font-drop" :class="{ ready: source, dragging }" @dragenter.prevent="dragging = true" @dragover.prevent="dragging = true" @dragleave.prevent="dragging = false" @drop.prevent="onDrop">
          <input data-testid="font-source-input" type="file" accept=".ttf,.otf,font/ttf,font/otf" @change="onFileInput" />
          <span class="font-drop-mark">Aa</span>
          <strong>{{ source?.file.name || '选择或拖入字体' }}</strong>
          <small>{{ source ? `${source.family} · ${(source.file.size / 1024).toFixed(0)} KB` : '文件只在浏览器中处理' }}</small>
        </label>
        <p v-if="error" class="font-error" role="alert">{{ error }}</p>
        <div class="charset-card">
          <span>默认字符集</span><b>0123456789:</b><small>导出 11 个透明 PNG，冒号文件名为 colon.png</small>
        </div>
        <div class="file-list">
          <div v-for="glyph in FONT_GLYPHS" :key="glyph.fileName"><span>{{ glyph.character }}</span><code>{{ glyph.fileName }}</code></div>
        </div>
      </aside>

      <section class="font-preview-panel">
        <div class="preview-heading"><div><span>02 / PREVIEW</span><h1>时间数字编辑器</h1></div><p>预览与导出使用相同的浏览器渲染链路</p></div>
        <div class="hero-preview">
          <div v-if="rendering" class="preview-placeholder">正在渲染字形…</div>
          <div v-else-if="!source" class="preview-placeholder"><b>0123456789:</b><span>上传字体后开始编辑</span></div>
          <div v-else class="preview-line">
            <img v-for="glyph in renderedGlyphs" :key="glyph.fileName" :src="glyph.url" :alt="glyph.character" />
          </div>
        </div>
        <div class="glyph-grid">
          <article v-for="glyph in glyphCards" :key="glyph.fileName" data-testid="glyph-preview" class="glyph-card">
            <div class="glyph-checker"><img v-if="glyph.url" :src="glyph.url" :alt="`${glyph.character} 字形预览`" /><span v-else>{{ glyph.character }}</span></div>
            <div><strong>{{ glyph.character }}</strong><code>{{ glyph.fileName }}</code><small>{{ glyph.width ? `${glyph.width} × ${glyph.height}px` : '等待字体' }}</small></div>
          </article>
        </div>
      </section>

      <aside class="font-controls-panel">
        <div class="panel-title"><span>03</span><div><strong>字形样式</strong><small>实时应用到预览与导出</small></div></div>

        <label data-testid="recipe-control" class="control-row"><span>字号 <output>{{ recipe.fontSize }} px</output></span><input v-model.number="recipe.fontSize" type="range" min="6" max="312" step="1" /></label>
        <label data-testid="recipe-control" class="control-row"><span>字重 <output>{{ recipe.fontWeight }}</output></span><input v-model.number="recipe.fontWeight" type="range" min="100" max="900" step="100" /></label>
        <label data-testid="recipe-control" class="control-row"><span>倾斜 <output>{{ recipe.italicAngle }}°</output></span><input v-model.number="recipe.italicAngle" type="range" min="-20" max="20" step="1" /></label>
        <label data-testid="recipe-control" class="control-row"><span>横向缩放 <output>{{ Math.round(recipe.horizontalScale * 100) }}%</output></span><input v-model.number="recipe.horizontalScale" type="range" min="0.5" max="1.5" step="0.01" /></label>
        <label data-testid="recipe-control" class="control-row"><span>描边宽度 <output>{{ recipe.outlineWidthEm.toFixed(2) }} em</output></span><input v-model.number="recipe.outlineWidthEm" type="range" min="0" max="0.5" step="0.01" :disabled="recipe.outlineMode === 'fill'" /></label>
        <label data-testid="recipe-control" class="select-row"><span>渲染模式</span><select v-model="recipe.outlineMode"><option value="fill">填充</option><option value="fill-outline">填充并描边</option><option value="outline-only">仅描边</option></select></label>
        <label data-testid="recipe-control" class="toggle-row"><span><b>抗锯齿</b><small>关闭后使用硬边像素</small></span><input v-model="recipe.antialias" type="checkbox" /></label>
        <div data-testid="recipe-control" class="gradient-row"><label><span>渐变</span><input v-model="recipe.gradientEnabled" type="checkbox" /></label><div><input v-model="recipe.gradientStartColor" aria-label="渐变起始颜色" type="color" /><span>→</span><input v-model="recipe.gradientEndColor" aria-label="渐变结束颜色" type="color" :disabled="!recipe.gradientEnabled" /></div></div>
        <label data-testid="recipe-control" class="control-row"><span>渐变角度 <output>{{ recipe.gradientAngle }}°</output></span><input v-model.number="recipe.gradientAngle" type="range" min="0" max="359" step="1" :disabled="!recipe.gradientEnabled" /></label>

        <button class="reset-recipe" type="button" @click="resetRecipe">恢复默认样式</button>
        <p class="privacy-copy"><i /> 字体文件和生成的 PNG 均不会上传服务器。</p>
      </aside>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { buildGlyphZip, defaultFontRecipe, FONT_GLYPHS, type FontRecipe } from '@/features/font-editor/fontEditor'
import { parseFontFile, type ParsedFontFile } from '@/features/font-editor/fontSource'
import { disposeRenderedGlyphs, registerFont, renderFontGlyphs, type RegisteredFont, type RenderedFontGlyph } from '@/features/font-editor/fontRenderer'

const source = ref<ParsedFontFile | null>(null)
const registered = ref<RegisteredFont | null>(null)
const renderedGlyphs = ref<RenderedFontGlyph[]>([])
const recipe = reactive<FontRecipe>(defaultFontRecipe())
const dragging = ref(false)
const rendering = ref(false)
const downloading = ref(false)
const error = ref('')
let renderToken = 0
let renderTimer: ReturnType<typeof setTimeout> | undefined

const glyphCards = computed(() => FONT_GLYPHS.map(glyph => renderedGlyphs.value.find(item => item.fileName === glyph.fileName) || { ...glyph, url: '', width: 0, height: 0 }))
const canDownload = computed(() => !!source.value && renderedGlyphs.value.length === FONT_GLYPHS.length && !rendering.value && !downloading.value && !error.value)

function message(reason: unknown): string {
  return reason instanceof Error ? reason.message.replace(/^[A-Z_]+:\s*/, '') : '字体处理失败'
}

async function loadFile(file?: File) {
  if (!file) return
  error.value = ''
  try {
    const nextSource = await parseFontFile(file)
    const missing = nextSource.missingGlyphs(FONT_GLYPHS.map(glyph => glyph.character))
    if (missing.length) throw new Error(`字体缺少字符：${missing.join(' ')}`)
    const nextRegistration = await registerFont(nextSource)
    registered.value?.dispose()
    source.value = nextSource
    registered.value = nextRegistration
    await refreshPreview()
  } catch (reason) {
    error.value = message(reason)
  }
}

function onFileInput(event: Event) {
  void loadFile((event.target as HTMLInputElement).files?.[0])
}

function onDrop(event: DragEvent) {
  dragging.value = false
  void loadFile(event.dataTransfer?.files?.[0])
}

async function refreshPreview() {
  if (!registered.value) return
  const token = ++renderToken
  rendering.value = true
  error.value = ''
  try {
    const next = await renderFontGlyphs(registered.value.family, { ...recipe })
    if (token !== renderToken) return disposeRenderedGlyphs(next)
    disposeRenderedGlyphs(renderedGlyphs.value)
    renderedGlyphs.value = next
  } catch (reason) {
    if (token === renderToken) error.value = message(reason)
  } finally {
    if (token === renderToken) rendering.value = false
  }
}

watch(recipe, () => {
  clearTimeout(renderTimer)
  renderTimer = setTimeout(() => void refreshPreview(), 120)
}, { deep: true })

function resetRecipe() {
  Object.assign(recipe, defaultFontRecipe())
}

function downloadGlyphs() {
  if (!canDownload.value || !source.value) return
  downloading.value = true
  try {
    const bytes = buildGlyphZip(renderedGlyphs.value)
    const url = URL.createObjectURL(new Blob([Uint8Array.from(bytes).buffer], { type: 'application/zip' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${source.value.file.name.replace(/\.[^.]+$/, '')}-${recipe.fontSize}px-glyphs.zip`
    anchor.click()
    URL.revokeObjectURL(url)
  } finally {
    downloading.value = false
  }
}

onBeforeUnmount(() => {
  clearTimeout(renderTimer)
  renderToken += 1
  registered.value?.dispose()
  disposeRenderedGlyphs(renderedGlyphs.value)
})
</script>

<style scoped>
.font-editor-page{min-height:100vh;background:#090d11;color:var(--ink)}.font-editor-topbar{height:58px;border-bottom:1px solid var(--line);display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 16px;background:#0d1217}.font-editor-brand{display:flex;align-items:center;gap:16px;font-size:10px;letter-spacing:.12em;color:var(--orange)}.font-editor-brand b{color:#dce2e6;font:550 15px 'Bricolage Grotesque Variable';letter-spacing:-.02em}.topbar-meta{display:flex;gap:20px;color:#75818b;font-size:10px}.local-state{color:#9ca7ae}.local-state i,.privacy-copy i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#60d394;box-shadow:0 0 9px #60d394;margin-right:6px}.export-button{justify-self:end;border:0;background:var(--orange);color:#17100a;padding:10px 14px;font-weight:800;cursor:pointer}.export-button span{margin-left:22px}.export-button:disabled{background:#252d34;color:#626d76;cursor:not-allowed}.font-editor-layout{display:grid;grid-template-columns:250px minmax(470px,1fr) 310px;min-height:calc(100vh - 58px)}.font-source-panel,.font-controls-panel{background:#10161b;padding:22px;border-right:1px solid var(--line)}.font-controls-panel{border-right:0;border-left:1px solid var(--line);overflow:auto}.panel-title{display:flex;gap:13px;align-items:start;margin-bottom:22px}.panel-title>span,.preview-heading>div>span{font:700 10px 'Instrument Sans Variable';letter-spacing:.14em;color:var(--orange)}.panel-title strong,.panel-title small{display:block}.panel-title strong{font-size:13px}.panel-title small{color:#69757e;font-size:9px;margin-top:5px}.font-drop{min-height:178px;border:1px dashed #3a4650;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;cursor:pointer;background:#0c1115;padding:16px}.font-drop:hover,.font-drop.dragging{border-color:var(--orange);background:#151719}.font-drop.ready{border-style:solid}.font-drop input{position:absolute;width:1px;height:1px;opacity:0}.font-drop-mark{font:600 36px 'Bricolage Grotesque Variable';color:var(--orange);margin-bottom:14px}.font-drop strong{max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.font-drop small{color:#717c85;font-size:9px;margin-top:7px}.font-error{background:#321a18;border:1px solid #6b3028;color:#ff9d8f;padding:10px;font-size:10px;line-height:1.5}.charset-card{margin-top:18px;padding:14px;background:#161d23;border-left:2px solid var(--orange)}.charset-card span,.charset-card b,.charset-card small{display:block}.charset-card span{font-size:9px;color:#7c8790}.charset-card b{font:550 22px 'Bricolage Grotesque Variable';letter-spacing:.06em;margin:9px 0}.charset-card small{font-size:9px;color:#68747d;line-height:1.5}.file-list{margin-top:17px;display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:var(--line)}.file-list>div{background:#10161b;padding:7px;display:flex;align-items:center;gap:6px}.file-list span{color:var(--orange);font-weight:700}.file-list code{font-size:8px;color:#78838c}.font-preview-panel{min-width:0;padding:28px;background:#0b1014;background-image:radial-gradient(rgba(255,255,255,.05) 1px,transparent 1px);background-size:18px 18px}.preview-heading{display:flex;align-items:end;justify-content:space-between;margin-bottom:20px}.preview-heading h1{font:550 34px 'Bricolage Grotesque Variable';letter-spacing:-.045em;margin:6px 0 0}.preview-heading p{font-size:10px;color:#68747d}.hero-preview{min-height:245px;border:1px solid #2d3740;background-color:#11171d;background-image:linear-gradient(45deg,#1c242c 25%,transparent 25%),linear-gradient(-45deg,#1c242c 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1c242c 75%),linear-gradient(-45deg,transparent 75%,#1c242c 75%);background-size:22px 22px;background-position:0 0,0 11px,11px -11px,-11px 0;display:flex;align-items:center;justify-content:center;overflow:auto;padding:34px}.preview-placeholder{color:#5f6a72;display:flex;flex-direction:column;align-items:center;gap:12px}.preview-placeholder b{font:550 clamp(38px,5vw,72px) 'Bricolage Grotesque Variable';color:#76818a}.preview-placeholder span{font-size:11px}.preview-line{display:flex;align-items:center;justify-content:center;gap:1px;min-width:max-content}.preview-line img{display:block;object-fit:contain;max-height:180px}.glyph-grid{display:grid;grid-template-columns:repeat(6,minmax(82px,1fr));gap:8px;margin-top:14px}.glyph-card{background:#11171d;border:1px solid #28323a;min-width:0}.glyph-checker{height:86px;display:flex;align-items:center;justify-content:center;background-color:#141a20;background-image:linear-gradient(45deg,#1f2730 25%,transparent 25%),linear-gradient(-45deg,#1f2730 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1f2730 75%),linear-gradient(-45deg,transparent 75%,#1f2730 75%);background-size:14px 14px;background-position:0 0,0 7px,7px -7px,-7px 0}.glyph-checker img{max-width:76%;max-height:72px}.glyph-checker>span{font-size:30px;color:#59636b}.glyph-card>div:last-child{padding:9px;display:grid;grid-template-columns:auto 1fr;gap:3px 7px;align-items:center}.glyph-card strong{color:var(--orange)}.glyph-card code{font-size:8px;color:#89949c;overflow:hidden;text-overflow:ellipsis}.glyph-card small{grid-column:1/-1;color:#59646d;font-size:8px}.control-row{display:block;padding:12px 0;border-top:1px solid #252e35}.control-row>span{display:flex;justify-content:space-between;font-size:10px;color:#aeb7bd}.control-row output{color:var(--orange);font-weight:700}.control-row input[type=range]{width:100%;accent-color:var(--orange);margin-top:12px}.control-row input:disabled{opacity:.3}.select-row,.toggle-row{border-top:1px solid #252e35;padding:12px 0;display:flex;align-items:center;justify-content:space-between;font-size:10px}.select-row select{background:#171f26;border:1px solid #35404a;color:#d6dde1;padding:7px}.toggle-row span b,.toggle-row span small{display:block}.toggle-row span b{font-size:10px}.toggle-row span small{font-size:8px;color:#66717a;margin-top:4px}.toggle-row input,.gradient-row input[type=checkbox]{accent-color:var(--orange)}.gradient-row{border-top:1px solid #252e35;padding:12px 0;display:flex;justify-content:space-between;align-items:center}.gradient-row>label{font-size:10px;display:flex;gap:8px}.gradient-row>div{display:flex;align-items:center;gap:6px;color:#606b74}.gradient-row input[type=color]{width:34px;height:28px;border:1px solid #3a444c;background:#111;padding:2px}.reset-recipe{width:100%;background:transparent;border:1px solid #35404a;color:#98a3ab;padding:10px;margin-top:14px;cursor:pointer}.privacy-copy{font-size:9px;color:#66717a;line-height:1.5;margin-top:18px}.privacy-copy i{width:6px;height:6px}.font-controls-panel input,.font-controls-panel select{cursor:pointer}
@media(max-width:1100px){.font-editor-layout{grid-template-columns:220px 1fr}.font-controls-panel{grid-column:1/-1;border-left:0;border-top:1px solid var(--line);display:grid;grid-template-columns:repeat(3,1fr);gap:0 22px}.font-controls-panel .panel-title,.font-controls-panel .reset-recipe,.font-controls-panel .privacy-copy{grid-column:1/-1}.glyph-grid{grid-template-columns:repeat(4,1fr)}}
@media(max-width:720px){.font-editor-topbar{grid-template-columns:1fr auto}.topbar-meta{display:none}.font-editor-layout{display:block}.font-source-panel,.font-controls-panel{border:0;border-bottom:1px solid var(--line)}.font-controls-panel{display:block}.font-preview-panel{padding:20px 12px}.preview-heading p{display:none}.glyph-grid{grid-template-columns:repeat(3,1fr)}.hero-preview{min-height:190px;padding:20px}.preview-line img{max-height:105px}}
</style>
