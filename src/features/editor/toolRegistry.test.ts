import { describe, expect, it } from 'vitest'
import { editorCategories, editorTools, getCategoryTools, resolveEditorTool } from './toolRegistry'

describe('editor tool registry', () => {
  it('registers background removal as one editor function', () => {
    expect(editorTools).toContainEqual(expect.objectContaining({
      id: 'background-remover',
      title: '快速抠图',
    }))
  })

  it('registers every currently supported tool', () => {
    expect(editorTools.map(tool => tool.id)).toEqual([
      'background-remover', 'smart-erase', 'background-fill', 'restore', 'background', 'outline', 'crop', 'resize', 'rotate-flip',
    ])
  })

  it('groups tools into cutout and adjustment categories', () => {
    expect(editorCategories.map(category => category.id)).toEqual(['cutout', 'adjust'])
    expect(getCategoryTools('cutout').map(tool => tool.title)).toEqual(['快速抠图', '智能擦除', '背景填色', '恢复', '背景替换', '描边'])
    expect(getCategoryTools('adjust').map(tool => tool.title)).toEqual(['裁剪', '调整尺寸', '旋转翻转'])
  })

  it('keeps every tool independent from other tool results', () => {
    expect(editorTools.every(tool => !('requiresCutout' in tool))).toBe(true)
  })

  it('falls back to background removal when an unknown tool is requested', () => {
    expect(resolveEditorTool('not-available').id).toBe('background-remover')
  })
})
