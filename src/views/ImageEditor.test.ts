import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import ImageEditor from './ImageEditor.vue'

const createEditorRouter = () => createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/editor', component: ImageEditor }],
})

describe('ImageEditor', () => {
  it('opens the standard editing workspace by default', () => {
    const wrapper = mount(ImageEditor, {
      global: {
        stubs: {
          BackgroundRemover: { template: '<div data-testid="standard-editor" />' },
          ImageCompressor: { template: '<div data-testid="compressor-editor" />' },
        },
      },
    })

    expect(wrapper.find('[data-testid="standard-editor"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="compressor-editor"]').exists()).toBe(false)
  })

  it('opens the compression workspace from the editor tool query', async () => {
    const router = createEditorRouter()
    await router.push('/editor?tool=image-compressor')
    await router.isReady()
    const wrapper = mount(ImageEditor, {
      global: {
        plugins: [router],
        stubs: {
          BackgroundRemover: { template: '<div data-testid="standard-editor" />' },
          ImageCompressor: { template: '<div data-testid="compressor-editor" />' },
        },
      },
    })

    expect(wrapper.find('[data-testid="compressor-editor"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="standard-editor"]').exists()).toBe(false)
  })
})
