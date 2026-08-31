import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppModal from './AppModal.vue'

describe('AppModal', () => {
  it('teleports a shared dialog shell to the document body', () => {
    const wrapper = mount(AppModal, {
      props: { open: true, title: '保存图片', eyebrow: '导出设置' },
      slots: { default: '<p>弹窗内容</p>' },
    })

    const dialog = document.body.querySelector('[role="dialog"]')
    expect(dialog?.textContent).toContain('导出设置')
    expect(dialog?.textContent).toContain('保存图片')
    expect(dialog?.textContent).toContain('弹窗内容')
    expect(document.body.classList.contains('modal-open')).toBe(true)

    wrapper.unmount()
    expect(document.body.classList.contains('modal-open')).toBe(false)
  })

  it('requests closing from the backdrop, close button and Escape key', async () => {
    const wrapper = mount(AppModal, { props: { open: true, title: '测试弹窗' } })

    const backdrop = document.body.querySelector<HTMLElement>('[data-testid="app-modal-backdrop"]')!
    const closeButton = document.body.querySelector<HTMLButtonElement>('[data-testid="app-modal-close"]')!
    backdrop.click()
    closeButton.click()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('close')).toHaveLength(3)
    wrapper.unmount()
  })
})
