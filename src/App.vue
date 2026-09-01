<template>
  <div class="app-shell">
    <header v-if="!route.meta.editor" class="site-header">
      <RouterLink class="brand" to="/" aria-label="Wristo Image 首页">
        <span class="brand-mark"><i /><i /></span>
        <span>Wristo <b>Image</b></span>
      </RouterLink>
      <nav aria-label="主导航">
        <RouterLink to="/editor">图片编辑器</RouterLink>
        <RouterLink to="/#all-tools">全部工具</RouterLink>
        <RouterLink to="/editor?tool=image-compressor">图片压缩</RouterLink>
      </nav>
      <span class="local-chip"><span /> 本地处理</span>
    </header>
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>
