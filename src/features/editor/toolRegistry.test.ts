import { describe, expect, it } from 'vitest'
import { editorTools, resolveEditorTool } from './toolRegistry'

describe('editor tool registry', () => {
  it('registers background removal as one editor function', () => {
    expect(editorTools).toContainEqual(expect.objectContaining({
      id: 'background-remover',
      title: '快速抠图',
    }))
  })

  it('falls back to background removal when an unknown tool is requested', () => {
    expect(resolveEditorTool('not-available').id).toBe('background-remover')
  })
})
