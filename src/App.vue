<template>
  <div class="app-shell">
    <header class="site-header">
      <RouterLink class="brand" to="/" aria-label="Wristo Image 首页">
        <span class="brand-mark"><i /><i /></span>
        <span>Wristo <b>Image</b></span>
      </RouterLink>
      <nav aria-label="主导航">
        <RouterLink to="/">工具</RouterLink>
        <RouterLink to="/tools/background-remover">快速抠图</RouterLink>
      </nav>
      <span class="local-chip"><span /> 本地处理</span>
    </header>
    <RouterView />
  </div>
</template>
