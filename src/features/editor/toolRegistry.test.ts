import { describe, expect, it } from 'vitest'
import { editorTools, resolveEditorTool } from './toolRegistry'

describe('editor tool registry', () => {
  it('registers background removal as one editor function', () => {
    expect(editorTools).toContainEqual(expect.objectContaining({
      id: 'background-remover',
      title: '快速抠图',
    }))
  })

  it('registers the first-stage geometry tools', () => {
    expect(editorTools.map(tool => tool.id)).toEqual([
      'background-remover', 'crop', 'resize', 'rotate-flip',
    ])
  })

  it('falls back to background removal when an unknown tool is requested', () => {
    expect(resolveEditorTool('not-available').id).toBe('background-remover')
  })
})
