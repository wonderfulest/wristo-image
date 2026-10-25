<template><main style="padding:40px"><h1>Wristo 登录</h1><p role="status">{{ message }}</p></main></template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { completeSignIn } from '@/features/auth/imageAuth'
const message = ref('正在完成登录…')
onMounted(async () => {
  try { await completeSignIn(); message.value = '登录成功，可以返回图片编辑器。' }
  catch (error) { message.value = error instanceof Error ? error.message : '登录失败，请重试' }
})
</script>
