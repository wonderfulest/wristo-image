import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppConfirmDialog from './AppConfirmDialog.vue'

describe('AppConfirmDialog', () => {
  it('renders consistent destructive-action copy and emits explicit actions', async () => {
    const wrapper = mount(AppConfirmDialog, {
      props: {
        open: true,
        title: '删除这张历史图片？',
        description: '此操作无法撤销。',
        confirmLabel: '删除',
      },
    })

    const dialog = document.body.querySelector('[role="dialog"]')
    expect(dialog?.textContent).toContain('危险操作')
    expect(dialog?.textContent).toContain('删除这张历史图片？')
    expect(dialog?.textContent).toContain('此操作无法撤销。')

    document.body.querySelector<HTMLButtonElement>('[data-testid="app-confirm-cancel"]')!.click()
    document.body.querySelector<HTMLButtonElement>('[data-testid="app-confirm-submit"]')!.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toHaveLength(1)
    wrapper.unmount()
  })
})
