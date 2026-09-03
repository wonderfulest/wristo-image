import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TextAssetGenerator from './TextAssetGenerator.vue'

describe('TextAssetGenerator', () => {
  it('starts with weekday samples, one shared color action, and a disabled ZIP export', () => {
    const wrapper = mount(TextAssetGenerator, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    expect(wrapper.text()).toContain('透明文字素材')
    expect(wrapper.findAll('[data-testid="text-asset-row"]')).toHaveLength(7)
    expect(wrapper.text()).toContain('应用到全部')
    expect(wrapper.get('[data-testid="download-text-assets"]').attributes('disabled')).toBeDefined()
  })

  it('applies the shortcut color to every text asset without changing the rows', async () => {
    const wrapper = mount(TextAssetGenerator, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    await wrapper.get('input[aria-label="快捷颜色"]').setValue('#cf5b82')
    await wrapper.findAll('button').find(button => button.text() === '应用到全部')!.trigger('click')

    expect(wrapper.findAll('[data-testid="text-asset-row"]')).toHaveLength(7)
    expect(wrapper.findAll<HTMLInputElement>('input[type="color"]').slice(1)
      .every(input => input.element.value === '#cf5b82')).toBe(true)
  })

  it('derives an editable filename from new text without overwriting a custom filename', async () => {
    const wrapper = mount(TextAssetGenerator, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    await wrapper.get('input[aria-label="第 1 行文字"]').setValue('AM')
    expect((wrapper.get('input[aria-label="第 1 行文件名"]').element as HTMLInputElement).value).toBe('am')

    await wrapper.get('input[aria-label="第 1 行文件名"]').setValue('morning-label')
    await wrapper.get('input[aria-label="第 1 行文字"]').setValue('PM')
    expect((wrapper.get('input[aria-label="第 1 行文件名"]').element as HTMLInputElement).value).toBe('morning-label')
  })

  it('replaces the list with an AM/PM preset and exposes every watchface text preset', async () => {
    const wrapper = mount(TextAssetGenerator, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    expect(wrapper.text()).toContain('星期缩写')
    expect(wrapper.text()).toContain('星期全写')
    expect(wrapper.text()).toContain('AM / PM')
    expect(wrapper.text()).toContain('24H')

    await wrapper.findAll('button').find(button => button.text() === 'AM / PM')!.trigger('click')

    expect(wrapper.findAll('[data-testid="text-asset-row"]')).toHaveLength(2)
    expect((wrapper.get('input[aria-label="第 1 行文字"]').element as HTMLInputElement).value).toBe('AM')
    expect((wrapper.get('input[aria-label="第 2 行文字"]').element as HTMLInputElement).value).toBe('PM')
    expect((wrapper.get('input[aria-label="第 1 行文件名"]').element as HTMLInputElement).value).toBe('am')
  })

  it('loads the fixed-size red weekday badge template from quick selection', async () => {
    const wrapper = mount(TextAssetGenerator, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    await wrapper.findAll('button').find(button => button.text() === '红色星期徽章')!.trigger('click')

    expect(wrapper.text()).toContain('红色星期徽章 · 183 × 41 px')
    expect(wrapper.findAll('[data-testid="text-asset-row"]')).toHaveLength(7)
    expect((wrapper.get('input[aria-label="第 1 行文字"]').element as HTMLInputElement).value).toBe('S')
    expect((wrapper.get('input[aria-label="第 1 行文件名"]').element as HTMLInputElement).value).toBe('sunday')
    expect((wrapper.get('input[aria-label="第 1 行颜色"]').element as HTMLInputElement).value).toBe('#ff2222')
  })
})
