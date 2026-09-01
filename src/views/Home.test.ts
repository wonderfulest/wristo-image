import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Home from './Home.vue'

describe('Home', () => {
  it('positions Wristo Image as a full browser image editor', () => {
    const wrapper = mount(Home, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    expect(wrapper.get('h1').text()).toContain('图片编辑器')
    expect(wrapper.text()).toContain('裁剪、抠图、擦除、换背景、调整尺寸与压缩')

    const primaryAction = wrapper.findAllComponents(RouterLinkStub)
      .find(link => link.text().includes('开始编辑图片'))
    expect(primaryAction?.props('to')).toBe('/editor')
  })

  it('shows all ten editing tools as direct entry points', () => {
    const wrapper = mount(Home, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    const toolLinks = wrapper.findAll('[data-testid="home-tool-link"]')
    expect(toolLinks).toHaveLength(10)
    expect(toolLinks.map(link => link.text())).toEqual(expect.arrayContaining([
      expect.stringContaining('快速抠图'),
      expect.stringContaining('智能擦除'),
      expect.stringContaining('背景填色'),
      expect.stringContaining('恢复'),
      expect.stringContaining('背景替换'),
      expect.stringContaining('描边'),
      expect.stringContaining('裁剪'),
      expect.stringContaining('调整尺寸'),
      expect.stringContaining('旋转翻转'),
      expect.stringContaining('图片压缩'),
    ]))
  })

  it('opens image compression inside the unified editor', () => {
    const wrapper = mount(Home, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    const compressorLink = wrapper.findAllComponents(RouterLinkStub)
      .find(link => link.text().includes('图片压缩'))

    expect(compressorLink?.props('to')).toBe('/editor?tool=image-compressor')
  })
})
