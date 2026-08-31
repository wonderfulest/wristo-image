<template>
  <Teleport to="body">
    <Transition name="app-modal">
      <div
        v-if="open"
        data-testid="app-modal-backdrop"
        class="app-modal-backdrop"
        @click.self="requestBackdropClose"
      >
        <section
          class="app-modal-panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :style="{ '--app-modal-width': width }"
        >
          <header class="app-modal-header">
            <div>
              <span v-if="eyebrow" class="app-modal-eyebrow">{{ eyebrow }}</span>
              <h2 :id="titleId">{{ title }}</h2>
            </div>
            <button
              v-if="showClose"
              data-testid="app-modal-close"
              class="app-modal-close"
              type="button"
              aria-label="关闭弹窗"
              @click="emit('close')"
            ><span aria-hidden="true">×</span></button>
          </header>

          <div class="app-modal-content"><slot /></div>
          <footer v-if="$slots.footer" class="app-modal-footer"><slot name="footer" /></footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, useId, watch } from 'vue'

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  eyebrow?: string
  width?: string
  showClose?: boolean
  closeOnBackdrop?: boolean
}>(), {
  eyebrow: '',
  width: '420px',
  showClose: true,
  closeOnBackdrop: true,
})
const emit = defineEmits<{ close: [] }>()
const titleId = `app-modal-title-${useId()}`

const syncBodyLock = (open: boolean): void => {
  document.body.classList.toggle('modal-open', open)
}
const requestBackdropClose = (): void => {
  if (props.closeOnBackdrop) emit('close')
}
const onKeydown = (event: KeyboardEvent): void => {
  if (props.open && event.key === 'Escape') emit('close')
}

watch(() => props.open, syncBodyLock, { immediate: true })
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  syncBodyLock(false)
})
</script>

<style scoped>
:global(body.modal-open) { overflow: hidden; }
.app-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: radial-gradient(circle at 50% 42%, rgba(255, 255, 255, 0.08), transparent 36%), rgba(15, 18, 21, 0.64);
  backdrop-filter: blur(9px) saturate(0.82);
}
.app-modal-panel {
  position: relative;
  width: min(var(--app-modal-width), calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  overflow: auto;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 18px;
  background: #fffdfb;
  color: #252a30;
  box-shadow: 0 30px 90px rgba(12, 16, 20, 0.34), 0 2px 8px rgba(12, 16, 20, 0.12);
}
.app-modal-panel::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  border-radius: 18px 18px 0 0;
  background: linear-gradient(90deg, #ff9d59, #ff7228 58%, #da513a);
}
.app-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 24px 0;
}
.app-modal-eyebrow {
  color: #a46b4b;
  font-size: 10px;
  font-weight: 720;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.app-modal-header h2 {
  margin: 6px 0 0;
  color: #24282e;
  font: 650 23px/1.15 "Bricolage Grotesque Variable";
  letter-spacing: -0.025em;
}
.app-modal-close {
  display: grid;
  flex: none;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid #e7e2de;
  border-radius: 50%;
  background: #f8f5f2;
  color: #737a81;
  cursor: pointer;
  transition: 0.18s ease;
}
.app-modal-close span { font-size: 21px; line-height: 1; transform: translateY(-1px); }
.app-modal-close:hover {
  border-color: #ffc29c;
  background: #fff0e6;
  color: #d95f0b;
  transform: rotate(4deg);
}
.app-modal-content { padding: 20px 24px 24px; }
.app-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px 20px;
  border-top: 1px solid #eee9e5;
  background: #faf8f6;
  border-radius: 0 0 18px 18px;
}
.app-modal-enter-active, .app-modal-leave-active { transition: opacity 0.2s ease; }
.app-modal-enter-active .app-modal-panel, .app-modal-leave-active .app-modal-panel { transition: transform 0.22s ease, opacity 0.18s ease; }
.app-modal-enter-from, .app-modal-leave-to { opacity: 0; }
.app-modal-enter-from .app-modal-panel, .app-modal-leave-to .app-modal-panel { opacity: 0; transform: translateY(10px) scale(0.975); }
@media (max-width: 520px) {
  .app-modal-backdrop { padding: 16px; }
  .app-modal-header { padding: 21px 20px 0; }
  .app-modal-content { padding: 18px 20px 20px; }
  .app-modal-footer { padding: 14px 20px 18px; }
}
@media (prefers-reduced-motion: reduce) {
  .app-modal-enter-active, .app-modal-leave-active,
  .app-modal-enter-active .app-modal-panel, .app-modal-leave-active .app-modal-panel { transition: none; }
}
</style>
