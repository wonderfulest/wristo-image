export type EditorCategoryId = 'cutout' | 'adjust'
export type EditorToolId = 'background-remover' | 'smart-erase' | 'background-fill' | 'restore' | 'background' | 'outline' | 'crop' | 'resize' | 'rotate-flip'

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
}

export const editorCategories: readonly EditorCategoryDefinition[] = [
  { id: 'cutout', title: '抠图', icon: '✦' },
  { id: 'adjust', title: '调整', icon: '⌗' },
]

export const editorTools: readonly EditorToolDefinition[] = [
  { id: 'background-remover', categoryId: 'cutout', title: '快速抠图', description: '框选图片中的图标，清除选区内全部近似背景色，包括封闭区域。', icon: '✦' },
  { id: 'smart-erase', categoryId: 'cutout', title: '智能擦除', description: '涂抹不需要的区域，并用周围背景智能补齐。', icon: '◌' },
  { id: 'background-fill', categoryId: 'cutout', title: '背景填色', description: '框选矩形区域，使用纯色或周围背景内容进行填充。', icon: '▣' },
  { id: 'restore', categoryId: 'cutout', title: '恢复', description: '用画笔从原图重新显露被移除的区域。', icon: '↺' },
  { id: 'background', categoryId: 'cutout', title: '背景替换', description: '为当前画布设置纯色、渐变或自定义图片背景。', icon: '▧' },
  { id: 'outline', categoryId: 'cutout', title: '描边', description: '为当前画布中的透明主体增加可调外描边。', icon: '◎' },
  { id: 'crop', categoryId: 'adjust', title: '裁剪', description: '自由裁剪，或使用常用固定比例。', icon: '⌗' },
  { id: 'resize', categoryId: 'adjust', title: '调整尺寸', description: '按像素调整图片尺寸并保持比例。', icon: '↔' },
  { id: 'rotate-flip', categoryId: 'adjust', title: '旋转翻转', description: '旋转图片，或沿水平和垂直方向翻转。', icon: '↻' },
]

export const getCategoryTools = (categoryId: EditorCategoryId): readonly EditorToolDefinition[] =>
  editorTools.filter(tool => tool.categoryId === categoryId)

export const resolveEditorTool = (toolId: unknown): EditorToolDefinition =>
  editorTools.find(tool => tool.id === toolId) ?? editorTools[0]!
