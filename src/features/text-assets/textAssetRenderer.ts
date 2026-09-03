export type TextAssetBounds = {
  width: number
  height: number
}

export type TextAssetCanvas = {
  width: number
  height: number
}

export type TextAssetDraft = {
  id: string
  text: string
  fileName: string
  color: string
}

export type TextAssetStyle = {
  fontFamily: string
  fontSize: number
  fontWeight: number
  padding: number
  horizontalAlign: 'left' | 'center' | 'right'
}

export type RenderedTextAsset = TextAssetDraft & TextAssetCanvas & {
  blob: Blob
  url: string
}

const FALLBACK_FILE_NAME = 'text'

const positiveInteger = (value: number, fallback: number): number =>
  Math.max(0, Math.round(Number.isFinite(value) ? value : fallback))

export const calculateSharedCanvas = (
  bounds: readonly TextAssetBounds[],
  padding: number,
): TextAssetCanvas => {
  const safePadding = positiveInteger(padding, 0)
  const widest = Math.max(1, ...bounds.map(bound => Math.ceil(Math.max(0, bound.width))))
  const tallest = Math.max(1, ...bounds.map(bound => Math.ceil(Math.max(0, bound.height))))
  return { width: widest + safePadding * 2, height: tallest + safePadding * 2 }
}

export const normalizeTextAssetFileName = (value: string, fallback = FALLBACK_FILE_NAME): string => {
  const stem = value
    .trim()
    .replace(/\.png$/i, '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[. ]+|[. ]+$/g, '')
  return `${stem || fallback}.png`
}

const canvas2d = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前浏览器无法创建 2D 画布')
  return context
}

const font = (style: TextAssetStyle): string =>
  `${Math.min(900, Math.max(100, Math.round(style.fontWeight)))} ${Math.max(1, Math.round(style.fontSize))}px "${style.fontFamily}"`

const textBounds = (metrics: TextMetrics, fontSize: number): TextAssetBounds => {
  const width = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight || metrics.width
  const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || fontSize
  return { width: Math.max(1, width), height: Math.max(1, height) }
}

export const measureTextAsset = (text: string, style: TextAssetStyle): TextAssetBounds => {
  const canvas = document.createElement('canvas')
  const context = canvas2d(canvas)
  context.font = font(style)
  return textBounds(context.measureText(text), style.fontSize)
}

const textX = (metrics: TextMetrics, canvas: TextAssetCanvas, style: TextAssetStyle): number => {
  if (style.horizontalAlign === 'left') return style.padding - metrics.actualBoundingBoxLeft
  if (style.horizontalAlign === 'right') return canvas.width - style.padding - metrics.actualBoundingBoxRight
  return canvas.width / 2 - (metrics.actualBoundingBoxRight - metrics.actualBoundingBoxLeft) / 2
}

const textY = (metrics: TextMetrics, canvas: TextAssetCanvas): number =>
  canvas.height / 2 + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2

const canvasPng = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob)
    else reject(new Error('PNG 编码失败'))
  }, 'image/png'))

export const renderTextAssets = async (
  assets: readonly TextAssetDraft[],
  style: TextAssetStyle,
): Promise<RenderedTextAsset[]> => {
  const canvas = calculateSharedCanvas(assets.map(asset => measureTextAsset(asset.text, style)), style.padding)
  return Promise.all(assets.map(async asset => {
    const output = document.createElement('canvas')
    output.width = canvas.width
    output.height = canvas.height
    const context = canvas2d(output)
    context.font = font(style)
    context.fillStyle = asset.color
    context.textBaseline = 'alphabetic'
    const metrics = context.measureText(asset.text)
    context.fillText(asset.text, textX(metrics, canvas, style), textY(metrics, canvas))
    const blob = await canvasPng(output)
    return { ...asset, fileName: normalizeTextAssetFileName(asset.fileName), ...canvas, blob, url: URL.createObjectURL(blob) }
  }))
}

export const disposeRenderedTextAssets = (assets: readonly RenderedTextAsset[]): void => {
  assets.forEach(asset => URL.revokeObjectURL(asset.url))
}
