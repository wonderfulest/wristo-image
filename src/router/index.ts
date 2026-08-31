import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/Home.vue') },
    {
      path: '/tools/background-remover',
      name: 'background-remover',
      component: () => import('@/views/BackgroundRemover.vue'),
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
