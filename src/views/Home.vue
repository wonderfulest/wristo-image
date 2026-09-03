<template>
  <main class="home-page">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <div class="eyebrow"><span>01</span> BROWSER IMAGE EDITOR</div>
        <h1 id="hero-title">打开浏览器，<br><em>就是图片编辑器。</em></h1>
        <p class="hero-lead">一个轻量、完整的浏览器图片编辑器。裁剪、抠图、擦除、换背景、调整尺寸与压缩，都在同一个工作台完成。</p>
        <div class="hero-actions">
          <RouterLink class="hero-action" to="/editor">开始编辑图片 <span>↗</span></RouterLink>
          <a class="tool-jump" href="#all-tools">查看全部工具 <span>↓</span></a>
        </div>
        <div class="privacy-line"><span /> 常规工具本地处理 · 无需登录 · AI 去水印按需上传</div>
      </div>

      <div class="editor-preview" aria-hidden="true">
        <div class="preview-topbar">
          <span class="preview-brand">WRISTO / IMAGE</span>
          <span class="preview-file">summer-photo.png</span>
          <span class="preview-export">导出</span>
        </div>
        <div class="preview-body">
          <div class="preview-rail"><span class="active">✦</span><span>◌</span><span>⌗</span><span>↔</span><span>↻</span></div>
          <div class="preview-panel"><small>当前工具</small><strong>快速抠图</strong><i /><i class="short" /><i /></div>
          <div class="preview-canvas checkerboard">
            <div class="selection-box"><i /><i /><i /><i /></div>
            <div class="preview-subject"><span /></div>
            <div class="preview-cursor">↖</div>
          </div>
        </div>
        <div class="preview-status"><span>1200 × 1200 px</span><span>100%</span></div>
      </div>
    </section>

    <section id="all-tools" class="tool-section" aria-labelledby="tool-title">
      <div class="section-heading">
        <div><span>TOOLS / 14</span><h2 id="tool-title">你需要的，都在这里</h2></div>
        <p>从简单调整到背景处理，点开就能使用。</p>
      </div>
      <div class="tool-grid">
        <RouterLink
          v-for="(tool, index) in homeTools"
          :key="tool.id"
          data-testid="home-tool-link"
          class="tool-card"
          :class="{ featured: tool.featured }"
          :to="tool.to"
        >
          <div class="tool-card-top"><span class="tool-icon">{{ tool.icon }}</span><span class="tool-index">{{ String(index + 1).padStart(2, '0') }}</span></div>
          <div class="tool-card-copy"><h3>{{ tool.title }}</h3><p>{{ tool.description }}</p></div>
          <span class="tool-arrow">↗</span>
        </RouterLink>
      </div>
    </section>

    <section class="local-section" aria-label="本地处理说明">
      <span class="local-number">02</span>
      <div><p class="local-kicker">LOCAL FIRST</p><h2>图片不必绕远路。</h2></div>
      <p>常规编辑与导出直接在浏览器中完成；仅在使用 AI 去水印时，图片会临时发送到 Wristo 服务端处理。</p>
      <RouterLink to="/editor">选择一张图片 <span>→</span></RouterLink>
    </section>
  </main>
</template>

<script setup lang="ts">
import { editorTools } from '@/features/editor/toolRegistry'

const homeTools = [
  ...editorTools.map(tool => ({ ...tool, to: `/editor?tool=${tool.id}`, featured: tool.id === 'background-remover' })),
  { id: 'image-compressor', title: '图片压缩', description: '设定目标大小，在文件体积与清晰度之间自动取得平衡。', icon: '⇣', to: '/editor?tool=image-compressor', featured: true },
  { id: 'font-editor', title: '时间数字编辑器', description: '导入 TTF 或 OTF，调节字重、倾斜、描边与渐变，导出数字和冒号 PNG。', icon: '12', to: '/font-editor', featured: true },
  { id: 'text-assets', title: '透明文字素材', description: '批量输入星期、AM/PM 或 24H 等文字，分别配色并导出同尺寸透明 PNG。', icon: 'Aa', to: '/text-assets', featured: true },
]
</script>

<style scoped>
.home-page{max-width:1360px;margin:0 auto;padding:0 clamp(20px,4vw,58px) 96px}.hero{min-height:680px;padding:88px 0 82px;display:grid;grid-template-columns:minmax(460px,.92fr) minmax(520px,1.08fr);gap:clamp(40px,6vw,90px);align-items:center;position:relative}.hero-copy{position:relative;z-index:2}.hero h1{font:560 clamp(62px,6.6vw,104px)/.91 'Bricolage Grotesque Variable';letter-spacing:-.067em;margin:30px 0 32px;max-width:720px}.hero h1 em{color:var(--orange);font-style:normal}.hero-lead{color:#aab3bb;max-width:630px;font-size:18px;line-height:1.75;margin:0}.hero-actions{display:flex;align-items:center;gap:28px;margin-top:28px}.hero-action{margin:0}.tool-jump{font-size:13px;color:#aab3bb;border-bottom:1px solid #3a444e;padding:8px 2px}.tool-jump span{color:var(--orange);margin-left:8px}.editor-preview{min-width:0;background:#0e141a;border:1px solid #333d46;box-shadow:0 35px 90px rgba(0,0,0,.46),12px 12px 0 rgba(255,159,67,.08);transform:rotate(1.2deg);position:relative}.editor-preview:before{content:'';position:absolute;inset:-18px 22px 18px -22px;border:1px solid rgba(255,159,67,.25);z-index:-1}.preview-topbar{height:48px;border-bottom:1px solid var(--line);display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 15px;font-size:9px;letter-spacing:.11em;color:#7f8a93}.preview-brand{color:var(--orange);font-weight:700}.preview-file{text-transform:none;letter-spacing:0}.preview-export{justify-self:end;background:var(--orange);color:#160f08;padding:7px 12px;font-weight:800}.preview-body{height:390px;display:grid;grid-template-columns:54px 145px 1fr}.preview-rail{border-right:1px solid var(--line);display:flex;flex-direction:column;align-items:center;padding-top:18px;gap:10px}.preview-rail span{width:31px;height:31px;display:grid;place-items:center;color:#727d86;font-size:13px}.preview-rail .active{background:var(--orange);color:#15100a}.preview-panel{border-right:1px solid var(--line);padding:23px 16px}.preview-panel small{display:block;color:#69747d;font-size:8px;text-transform:uppercase;letter-spacing:.12em}.preview-panel strong{display:block;font:540 20px 'Bricolage Grotesque Variable';margin:7px 0 28px}.preview-panel i{display:block;height:5px;background:#29323a;margin:13px 0;border-radius:3px}.preview-panel i.short{width:62%}.preview-canvas{position:relative;overflow:hidden}.checkerboard{background-color:#11171d;background-image:linear-gradient(45deg,#1d252d 25%,transparent 25%),linear-gradient(-45deg,#1d252d 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1d252d 75%),linear-gradient(-45deg,transparent 75%,#1d252d 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0}.selection-box{position:absolute;inset:42px 28px 38px;border:1px dashed rgba(255,255,255,.7)}.selection-box i{position:absolute;width:8px;height:8px;background:#fff}.selection-box i:nth-child(1){left:-4px;top:-4px}.selection-box i:nth-child(2){right:-4px;top:-4px}.selection-box i:nth-child(3){left:-4px;bottom:-4px}.selection-box i:nth-child(4){right:-4px;bottom:-4px}.preview-subject{position:absolute;width:160px;height:190px;left:53%;top:51%;transform:translate(-50%,-50%) rotate(-8deg);background:linear-gradient(145deg,#ffc061 0%,#ff8c32 55%,#e4561e 100%);border-radius:45% 52% 28% 55%;filter:drop-shadow(0 20px 26px rgba(255,112,30,.24))}.preview-subject:before{content:'';position:absolute;width:76px;height:76px;left:5px;top:17px;border-radius:50%;background:#0f151b}.preview-subject span{position:absolute;width:38px;height:58px;background:#141b21;right:17px;bottom:22px;border-radius:50% 20% 50% 30%}.preview-cursor{position:absolute;right:26%;bottom:20%;color:#fff;font-size:21px;text-shadow:0 2px 5px #000}.preview-status{height:32px;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:flex-end;gap:25px;padding:0 15px;color:#65717b;font-size:8px}.tool-section{border-top:1px solid var(--line);padding-top:54px;scroll-margin-top:88px}.tool-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.tool-card{min-height:245px;border:1px solid var(--line);background:var(--panel);padding:25px;display:flex;flex-direction:column;position:relative;overflow:hidden;transition:transform .22s,border-color .22s,background .22s}.tool-card:before{content:'';position:absolute;width:130px;height:130px;border-radius:50%;right:-76px;top:-78px;border:1px solid rgba(255,159,67,.18);transition:.3s}.tool-card:hover{transform:translateY(-5px);border-color:#755033;background:#151b21}.tool-card:hover:before{transform:scale(1.3);background:rgba(255,159,67,.05)}.tool-card.featured{grid-column:span 2;background:linear-gradient(135deg,#161c22,#11171d)}.tool-card-top{display:flex;align-items:flex-start;justify-content:space-between}.tool-icon{width:64px;height:64px;display:grid;place-items:center;border:1px solid #38434c;color:var(--orange);font-size:28px}.tool-index{font:700 10px 'Instrument Sans Variable';letter-spacing:.12em;color:#606b74}.tool-card-copy{margin-top:auto;padding-top:30px}.tool-card h3{font:550 25px 'Bricolage Grotesque Variable';letter-spacing:-.035em;margin:0 0 9px}.tool-card p{font-size:12px;color:#818c95;line-height:1.55;margin:0;max-width:330px}.tool-arrow{position:absolute;right:24px;bottom:23px;color:var(--orange);font-size:18px;opacity:0;transform:translate(-6px,6px);transition:.2s}.tool-card:hover .tool-arrow{opacity:1;transform:none}.local-section{margin-top:110px;padding:62px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);display:grid;grid-template-columns:60px 1.1fr 1fr auto;gap:35px;align-items:center}.local-number,.local-kicker{color:var(--orange);font-size:11px;letter-spacing:.15em}.local-kicker{margin:0 0 8px}.local-section h2{font:550 clamp(32px,4vw,52px) 'Bricolage Grotesque Variable';letter-spacing:-.045em;margin:0}.local-section>p{color:#89949d;font-size:13px;line-height:1.7;margin:0;max-width:400px}.local-section>a{border:1px solid #424c55;padding:14px 17px;font-size:12px;white-space:nowrap}.local-section>a span{color:var(--orange);margin-left:20px}
@media(max-width:1080px){.hero{grid-template-columns:1fr;padding-top:78px}.hero-copy{max-width:820px}.editor-preview{width:min(760px,92%);justify-self:end}.tool-grid{grid-template-columns:repeat(3,1fr)}.local-section{grid-template-columns:45px 1fr 1fr}.local-section>a{grid-column:2}}
@media(max-width:760px){.home-page{padding-bottom:60px}.hero{min-height:auto;padding:66px 0 70px;gap:55px}.hero h1{font-size:clamp(50px,14vw,72px)}.hero-lead{font-size:16px}.hero-actions{align-items:flex-start;flex-direction:column;gap:16px}.editor-preview{width:100%;transform:none}.editor-preview:before{display:none}.preview-body{height:300px;grid-template-columns:46px 105px 1fr}.preview-panel{padding:18px 11px}.preview-panel strong{font-size:15px}.preview-subject{width:100px;height:135px}.section-heading{align-items:start}.section-heading h2{font-size:30px}.tool-grid{grid-template-columns:repeat(2,1fr)}.tool-card,.tool-card.featured{grid-column:span 1;min-height:215px;padding:20px}.tool-icon{width:56px;height:56px;font-size:24px}.tool-card h3{font-size:21px}.tool-card p{font-size:11px}.local-section{margin-top:72px;grid-template-columns:1fr;gap:18px}.local-number{display:none}.local-section>a{grid-column:auto;justify-self:start}}
@media(max-width:460px){.preview-panel{display:none}.preview-body{grid-template-columns:44px 1fr}.tool-grid{grid-template-columns:1fr}.tool-card{min-height:190px}.tool-card-copy{padding-right:22px}.local-section{padding:45px 0}}
</style>
