<template>
  <ImageCompressor v-if="isCompressor" />
  <BackgroundRemover v-else />
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { routeLocationKey } from 'vue-router'
import BackgroundRemover from './BackgroundRemover.vue'
import ImageCompressor from './ImageCompressor.vue'

const props = defineProps<{ tool?: string }>()
const route = inject(routeLocationKey, null)
const isCompressor = computed(() => (props.tool ?? route?.query.tool) === 'image-compressor')
</script>
