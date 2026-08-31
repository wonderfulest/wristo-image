export type EditorCategoryId = 'cutout' | 'adjust'
export type EditorToolId = 'background-remover' | 'refine' | 'background' | 'outline' | 'crop' | 'resize' | 'rotate-flip'

export interface EditorCategoryDefinition {
  id: EditorCategoryId
  title: string
  icon: string
}

export interface EditorToolDefinition {
  id: EditorToolId
  categoryId: EditorCategoryId
  title: string
  description: string
  icon: string
  requiresCutout: boolean
}

export const editorCategories: readonly EditorCategoryDefinition[] = [
  { id: 'cutout', title: '抠图', icon: '✦' },
  { id: 'adjust', title: '调整', icon: '⌗' },
]

export const editorTools: readonly EditorToolDefinition[] = [
  { id: 'background-remover', categoryId: 'cutout', title: '快速抠图', description: '框选图片中的图标，清除与选区边缘连通的近似背景色。', icon: '✦', requiresCutout: false },
  { id: 'refine', categoryId: 'cutout', title: '精修', description: '使用擦除和恢复画笔精修透明主体边缘。', icon: '◌', requiresCutout: true },
  { id: 'background', categoryId: 'cutout', title: '背景替换', description: '为透明主体设置纯色、渐变或自定义图片背景。', icon: '▧', requiresCutout: true },
  { id: 'outline', categoryId: 'cutout', title: '描边', description: '为透明主体增加可调颜色与宽度的外描边。', icon: '◎', requiresCutout: true },
  { id: 'crop', categoryId: 'adjust', title: '裁剪', description: '自由裁剪，或使用常用固定比例。', icon: '⌗', requiresCutout: false },
  { id: 'resize', categoryId: 'adjust', title: '调整尺寸', description: '按像素调整图片尺寸并保持比例。', icon: '↔', requiresCutout: false },
  { id: 'rotate-flip', categoryId: 'adjust', title: '旋转翻转', description: '旋转图片，或沿水平和垂直方向翻转。', icon: '↻', requiresCutout: false },
]

export const getCategoryTools = (categoryId: EditorCategoryId): readonly EditorToolDefinition[] =>
  editorTools.filter(tool => tool.categoryId === categoryId)

export const resolveEditorTool = (toolId: unknown): EditorToolDefinition =>
  editorTools.find(tool => tool.id === toolId) ?? editorTools[0]!
