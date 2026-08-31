export interface EditorToolDefinition {
  id: 'background-remover' | 'crop' | 'resize' | 'rotate-flip'
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
  { id: 'crop', title: '裁剪', description: '自由裁剪，或使用常用固定比例。', icon: '⌗' },
  { id: 'resize', title: '调整尺寸', description: '按像素调整图片尺寸并保持比例。', icon: '↔' },
  { id: 'rotate-flip', title: '旋转翻转', description: '旋转图片，或沿水平和垂直方向翻转。', icon: '↻' },
]

export const resolveEditorTool = (toolId: unknown): EditorToolDefinition =>
  editorTools.find(tool => tool.id === toolId) ?? editorTools[0]!
