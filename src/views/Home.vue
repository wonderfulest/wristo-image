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
    </section>
  </main>
</template>
