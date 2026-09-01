<template>
  <main class="home-page">
    <section class="hero">
      <div class="eyebrow"><span>01</span> IMAGE UTILITY LAB</div>
      <h1>把图片，处理成<br><em>刚好能用的样子。</em></h1>
      <p>快速、克制、留在本地。Wristo Image 为设计师准备了一组无需上传的浏览器图片工具。</p>
      <RouterLink class="hero-action" to="/editor?tool=background-remover">
        开始快速抠图
        <span>↗</span>
      </RouterLink>
      <div class="privacy-line"><span /> 你的图片不会离开这台设备</div>
    </section>

    <section class="tool-section" aria-labelledby="tool-title">
      <div class="section-heading">
        <div><span>TOOLS /</span><h2 id="tool-title">当前工具</h2></div>
        <p>从真正高频的图片处理开始。</p>
      </div>
      <RouterLink class="tool-card" to="/editor?tool=background-remover">
        <div class="tool-visual" aria-hidden="true">
          <div class="crop-corner top-left" /><div class="crop-corner top-right" />
          <div class="crop-corner bottom-left" /><div class="crop-corner bottom-right" />
          <div class="subject-shape"><span /></div>
          <div class="checker" />
        </div>
        <div class="tool-meta">
          <span class="tool-index">01</span>
          <div><h3>快速抠图</h3><p>框选图标，移除与边缘连通的背景，导出透明 PNG。</p></div>
          <span class="tool-arrow">→</span>
        </div>
      </RouterLink>
      <RouterLink class="tool-card compressor-tool-card" to="/tools/image-compressor">
        <div class="tool-visual compressor-visual" aria-hidden="true">
          <div class="weight-before">4.8 <small>MB</small></div>
          <span class="compression-line" />
          <div class="weight-after">150 <small>KB</small></div>
        </div>
        <div class="tool-meta">
          <span class="tool-index">02</span>
          <div><h3>图片压缩</h3><p>输入文件大小上限，自动平衡画质与尺寸，确保商城素材可以上传。</p></div>
          <span class="tool-arrow">→</span>
        </div>
      </RouterLink>
    </section>
  </main>
</template>

<style scoped>
.compressor-tool-card{margin-top:22px}.compressor-visual{display:flex;align-items:center;justify-content:center;gap:24px}.weight-before,.weight-after{font:560 clamp(35px,4vw,62px) 'Bricolage Grotesque Variable';letter-spacing:-.06em}.weight-before{color:#59636c;text-decoration:line-through;text-decoration-thickness:2px}.weight-after{color:var(--orange)}.weight-before small,.weight-after small{font:700 11px 'Instrument Sans Variable';letter-spacing:.08em}.compression-line{width:70px;height:1px;background:var(--orange);position:relative}.compression-line:after{content:'›';position:absolute;right:-2px;top:-15px;color:var(--orange);font-size:24px}
</style>
