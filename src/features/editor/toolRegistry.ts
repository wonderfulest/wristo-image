export interface EditorToolDefinition {
  id: 'background-remover'
  title: string
  description: string
  icon: string
}

export const editorTools: readonly EditorToolDefinition[] = [
  {
    id: 'background-remover',
    title: '快速抠图',
    description: '框选图片中的图标，清除与选区边缘连通的近似背景色。',
    icon: '✦',
  },
]

export const resolveEditorTool = (toolId: unknown): EditorToolDefinition =>
  editorTools.find(tool => tool.id === toolId) ?? editorTools[0]!
