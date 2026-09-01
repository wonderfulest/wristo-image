<template>
  <aside data-testid="image-history-panel" class="image-history-panel" aria-label="历史图片">
    <header>
      <div>
        <span>本地图库</span>
        <h2>历史图片</h2>
      </div>
      <button
        v-if="images.length"
        data-testid="clear-image-history"
        type="button"
        @click="requestClear"
      >清空</button>
    </header>

    <p class="local-description"><i />仅保存在当前浏览器</p>

    <div v-if="images.length" class="batch-toolbar" aria-label="批量操作">
      <button
        data-testid="select-all-history-images"
        type="button"
        @click="toggleAll"
      >{{ allSelected ? '取消全选' : '全选' }}</button>
      <span>{{ selectedCount ? `已选 ${selectedCount} 张` : '选择图片后批量下载' }}</span>
      <button
        data-testid="download-selected-history"
        class="batch-download"
        type="button"
        :disabled="!selectedCount || downloading"
        @click="emitSelected"
      >{{ downloading ? '正在打包…' : '下载 ZIP' }}</button>
    </div>

    <div v-if="images.length" class="history-grid">
      <article
        v-for="image in images"
        :key="image.id"
        data-testid="history-image"
        :class="['history-image', { selected: selectedIds.has(image.id) }]"
        role="button"
        tabindex="0"
        :title="`重新编辑 ${image.name}`"
        @click="emit('select', image.id)"
        @keydown.enter="emit('select', image.id)"
        @keydown.space.prevent="emit('select', image.id)"
      >
        <label class="history-image-selector" @click.stop>
          <input
            data-testid="select-history-image"
            type="checkbox"
            :checked="selectedIds.has(image.id)"
            :aria-label="`选择 ${image.name}`"
            @change="onSelectionChange(image.id, $event)"
          />
          <span aria-hidden="true">✓</span>
        </label>
        <img :src="image.previewUrl" :alt="image.name" />
        <span class="history-image-copy">
          <b>{{ image.name }}</b>
          <small>{{ image.width }} × {{ image.height }}</small>
        </span>
        <button
          data-testid="download-history-image"
          class="history-image-action download-history-image"
          type="button"
          :aria-label="`下载 ${image.name}`"
          :title="`下载 ${image.name}`"
          @click.stop="emit('download', image.id)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 18v2h14v-2" />
          </svg>
        </button>
        <button
          data-testid="delete-history-image"
          class="history-image-action delete-history-image"
          type="button"
          :aria-label="`删除 ${image.name}`"
          @click.stop="requestDelete(image)"
        >×</button>
      </article>
    </div>

    <div v-else class="history-empty">
      <span>▧</span>
      <strong>还没有历史图片</strong>
      <small>上传过的图片会显示在这里</small>
    </div>

    <footer>最多保留最近 50 张</footer>

    <AppConfirmDialog
      :open="Boolean(pendingAction)"
      :title="confirmationTitle"
      :description="confirmationDescription"
      :confirm-label="confirmationButtonLabel"
      @cancel="closeConfirmation"
      @confirm="confirmAction"
    />
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppConfirmDialog from '@/components/ui/AppConfirmDialog.vue'

export type ImageHistoryPanelItem = {
  id: string
  name: string
  width: number
  height: number
  createdAt: number
  previewUrl: string
}

const emit = defineEmits<{
  select: [id: string]
  download: [id: string]
  downloadSelected: [ids: string[]]
  delete: [id: string]
  clear: []
}>()

type PendingAction =
  | { type: 'delete'; image: ImageHistoryPanelItem }
  | { type: 'clear' }

const props = withDefaults(defineProps<{
  images: ImageHistoryPanelItem[]
  downloading?: boolean
}>(), {
  downloading: false,
})
const pendingAction = ref<PendingAction | null>(null)
const selectedIds = ref(new Set<string>())
const selectedCount = computed(() => selectedIds.value.size)
const allSelected = computed(() =>
  props.images.length > 0 && props.images.every(image => selectedIds.value.has(image.id)),
)

watch(
  () => props.images.map(image => image.id),
  (imageIds) => {
    const validIds = new Set(imageIds)
    selectedIds.value = new Set([...selectedIds.value].filter(id => validIds.has(id)))
  },
)

const onSelectionChange = (id: string, event: Event): void => {
  const next = new Set(selectedIds.value)
  if ((event.target as HTMLInputElement).checked) next.add(id)
  else next.delete(id)
  selectedIds.value = next
}
const toggleAll = (): void => {
  selectedIds.value = allSelected.value
    ? new Set()
    : new Set(props.images.map(image => image.id))
}
const emitSelected = (): void => {
  if (!selectedCount.value || props.downloading) return
  emit('downloadSelected', props.images.filter(image => selectedIds.value.has(image.id)).map(image => image.id))
}

const confirmationTitle = computed(() =>
  pendingAction.value?.type === 'clear' ? '清空全部历史图片？' : '删除这张历史图片？',
)
const confirmationDescription = computed(() => {
  if (pendingAction.value?.type === 'delete') {
    return `“${pendingAction.value.image.name}”将从当前浏览器中删除，此操作无法撤销。`
  }
  return `共 ${props.images.length} 张历史图片将从当前浏览器中删除，此操作无法撤销。`
})
const confirmationButtonLabel = computed(() =>
  pendingAction.value?.type === 'clear' ? '清空全部' : '删除',
)

const requestDelete = (image: ImageHistoryPanelItem): void => {
  pendingAction.value = { type: 'delete', image }
}
const requestClear = (): void => {
  pendingAction.value = { type: 'clear' }
}
const closeConfirmation = (): void => {
  pendingAction.value = null
}
const confirmAction = (): void => {
  const action = pendingAction.value
  if (!action) return
  if (action.type === 'delete') emit('delete', action.image.id)
  else emit('clear')
  closeConfirmation()
}
</script>

<style scoped>
.image-history-panel {
  min-width: 0;
  background: #fff;
  border-left: 1px solid #dfe3e7;
  padding: 18px 14px 12px;
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr) auto;
  gap: 12px;
  overflow: hidden;
  box-shadow: -5px 0 18px rgba(31, 40, 49, 0.035);
  z-index: 2;
}
.image-history-panel header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 8px;
}
.image-history-panel header span {
  color: #929aa3;
  font-size: 9px;
}
.image-history-panel h2 {
  margin: 3px 0 0;
  color: #24282e;
  font: 650 17px "Bricolage Grotesque Variable";
}
.image-history-panel header button {
  border: 0;
  background: transparent;
  color: #9a7a67;
  padding: 3px;
  font-size: 9px;
  cursor: pointer;
}
.local-description {
  margin: 0;
  color: #8b949d;
  font-size: 9px;
}
.local-description i {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 5px;
  border-radius: 50%;
  background: #3fcb83;
}
.batch-toolbar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 7px 8px;
  border: 1px solid #ece3dc;
  border-radius: 7px;
  background: #fffaf6;
  color: #8a786c;
  font-size: 8px;
}
.batch-toolbar span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.batch-toolbar button {
  border: 0;
  background: transparent;
  color: #a05a2c;
  padding: 2px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.batch-toolbar .batch-download {
  border-radius: 5px;
  background: #24282e;
  color: #fff;
  padding: 5px 7px;
}
.batch-toolbar .batch-download:disabled {
  background: #d8dadd;
  cursor: not-allowed;
}
.history-grid {
  min-height: 0;
  display: grid;
  align-content: start;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  overflow-y: auto;
  padding-right: 2px;
}
.history-image {
  position: relative;
  min-width: 0;
  border: 1px solid #e1e4e8;
  border-radius: 8px;
  padding: 4px;
  background: #f6f7f8;
  color: #444b53;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
}
.history-image:hover {
  border-color: #ff9d59;
  box-shadow: 0 3px 10px rgba(49, 38, 30, 0.08);
}
.history-image.selected {
  border-color: #f48a43;
  box-shadow: 0 0 0 2px rgba(244, 138, 67, 0.16);
}
.history-image-selector {
  position: absolute;
  top: 7px;
  left: 7px;
  width: 20px;
  height: 20px;
  z-index: 1;
  cursor: pointer;
}
.history-image-selector input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.history-image-selector span {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 5px;
  background: rgba(25, 29, 33, 0.68);
  color: transparent;
  font-size: 11px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.14);
}
.history-image-selector input:checked + span {
  border-color: #f48a43;
  background: #f48a43;
  color: #fff;
}
.history-image-selector input:focus-visible + span {
  outline: 2px solid #24282e;
  outline-offset: 2px;
}
.history-image img {
  width: 100%;
  aspect-ratio: 1;
  display: block;
  border-radius: 5px;
  background-color: #eceef0;
  background-image:
    linear-gradient(45deg, #d9dcdf 25%, transparent 25%),
    linear-gradient(-45deg, #d9dcdf 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #d9dcdf 75%),
    linear-gradient(-45deg, transparent 75%, #d9dcdf 75%);
  background-size: 12px 12px;
  object-fit: contain;
}
.history-image-copy {
  min-width: 0;
  display: block;
  padding: 6px 2px 2px;
}
.history-image-copy b,
.history-image-copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.history-image-copy b {
  font-size: 9px;
}
.history-image-copy small {
  margin-top: 2px;
  color: #9299a1;
  font-size: 8px;
}
.history-image-action {
  position: absolute;
  top: 7px;
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: 50%;
  background: rgba(25, 29, 33, 0.76);
  color: #fff;
  opacity: 0;
  cursor: pointer;
}
.download-history-image {
  right: 31px;
  display: grid;
  place-items: center;
  padding: 4px;
}
.download-history-image svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.delete-history-image {
  right: 7px;
}
.history-image:hover .history-image-action,
.history-image-action:focus-visible {
  opacity: 1;
}
.history-empty {
  align-self: center;
  display: grid;
  justify-items: center;
  gap: 6px;
  color: #a0a7ae;
  text-align: center;
}
.history-empty span {
  font-size: 30px;
  color: #c6cbd0;
}
.history-empty strong {
  color: #737c85;
  font-size: 11px;
}
.history-empty small,
.image-history-panel footer {
  color: #a0a7ae;
  font-size: 8px;
}
.image-history-panel footer {
  padding-top: 10px;
  border-top: 1px solid #eceef0;
  text-align: center;
}
</style>
