<template>
  <AppModal
    :open="open"
    :title="title"
    :eyebrow="eyebrow"
    width="420px"
    :show-close="false"
    @close="emit('cancel')"
  >
    <div class="confirm-message">
      <span class="confirm-icon" aria-hidden="true">!</span>
      <p>{{ description }}</p>
    </div>

    <template #footer>
      <button data-testid="app-confirm-cancel" class="confirm-button confirm-cancel" type="button" @click="emit('cancel')">{{ cancelLabel }}</button>
      <button data-testid="app-confirm-submit" class="confirm-button confirm-submit" type="button" @click="emit('confirm')">{{ confirmLabel }}</button>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import AppModal from './AppModal.vue'

withDefaults(defineProps<{
  open: boolean
  title: string
  description: string
  eyebrow?: string
  cancelLabel?: string
  confirmLabel?: string
}>(), {
  eyebrow: '危险操作',
  cancelLabel: '取消',
  confirmLabel: '确认',
})
const emit = defineEmits<{ cancel: []; confirm: [] }>()
</script>

<style scoped>
.confirm-message { display: grid; grid-template-columns: 38px minmax(0, 1fr); align-items: start; gap: 13px; }
.confirm-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 1px solid #ffd2c2;
  border-radius: 12px;
  background: #fff0ea;
  color: #c95840;
  font: 750 18px "Bricolage Grotesque Variable";
}
.confirm-message p { margin: 1px 0 0; color: #667079; font-size: 13px; line-height: 1.65; overflow-wrap: anywhere; }
.confirm-button { min-width: 88px; border-radius: 9px; padding: 9px 16px; font-size: 12px; font-weight: 680; cursor: pointer; transition: 0.18s ease; }
.confirm-cancel { border: 1px solid #ddd8d4; background: #fff; color: #59616a; }
.confirm-submit { border: 1px solid #b84b35; background: linear-gradient(180deg, #d5654d, #bd4f39); color: #fff; box-shadow: 0 6px 16px rgba(184, 75, 53, 0.22); }
.confirm-cancel:hover { border-color: #c9c2bd; background: #f5f2ef; }
.confirm-submit:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(184, 75, 53, 0.3); }
</style>
