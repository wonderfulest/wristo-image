import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/Home.vue') },
    {
      path: '/editor',
      name: 'editor',
      component: () => import('@/views/ImageEditor.vue'),
      meta: { editor: true },
    },
    {
      path: '/tools/background-remover',
      redirect: { path: '/editor', query: { tool: 'background-remover' } },
    },
    {
      path: '/tools/image-compressor',
      redirect: { path: '/editor', query: { tool: 'image-compressor' } },
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
