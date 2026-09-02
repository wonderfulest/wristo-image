import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FontEditor from './FontEditor.vue'

describe('FontEditor', () => {
  it('offers the complete PNG font recipe and fixed glyph set', () => {
    const wrapper = mount(FontEditor, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    expect(wrapper.text()).toContain('字体编辑器')
    expect(wrapper.text()).toContain('0123456789:')
    expect(wrapper.find('[data-testid="font-source-input"]').attributes('accept')).toContain('.ttf')
    expect(wrapper.findAll('[data-testid="recipe-control"]')).toHaveLength(9)
    expect(wrapper.findAll('[data-testid="glyph-preview"]')).toHaveLength(11)
    expect(wrapper.get('[data-testid="download-glyphs"]').attributes('disabled')).toBeDefined()
  })
})
