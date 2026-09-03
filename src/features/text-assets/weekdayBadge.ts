import type { RenderedTextAsset, TextAssetDraft } from './textAssetRenderer'

export const WEEKDAY_BADGE_CANVAS = Object.freeze({ width: 183, height: 41 })

export type WeekdayBadgeAsset = TextAssetDraft & {
  slot: number
}

const weekdayBadgeStates: ReadonlyArray<Pick<WeekdayBadgeAsset, 'text' | 'fileName' | 'slot'>> = [
  { text: 'S', fileName: 'sunday', slot: 156 },
  { text: 'M', fileName: 'monday', slot: 0 },
  { text: 'T', fileName: 'tuesday', slot: 26 },
  { text: 'W', fileName: 'wednesday', slot: 52 },
  { text: 'T', fileName: 'thursday', slot: 78 },
  { text: 'F', fileName: 'friday', slot: 104 },
  { text: 'S', fileName: 'saturday', slot: 130 },
]

export const createWeekdayBadgePreset = (color = '#ff2222'): WeekdayBadgeAsset[] =>
  weekdayBadgeStates.map((state, index) => ({ id: `weekday-badge-${index}`, ...state, color }))

const canvas2d = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前浏览器无法创建 2D 画布')
  return context
}

const roundedRect = (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void => {
  const safeRadius = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + safeRadius, y)
  context.arcTo(x + width, y, x + width, y + height, safeRadius)
  context.arcTo(x + width, y + height, x, y + height, safeRadius)
  context.arcTo(x, y + height, x, y, safeRadius)
  context.arcTo(x, y, x + width, y, safeRadius)
  context.closePath()
}

const drawTopMarker = (context: CanvasRenderingContext2D, centerX: number): void => {
  context.save()
  context.shadowColor = 'rgba(0, 0, 0, .5)'
  context.shadowBlur = 2
  context.fillStyle = '#ffffff'
  context.beginPath()
  context.moveTo(centerX - 10, 3)
  context.lineTo(centerX, 11)
  context.lineTo(centerX + 10, 3)
  context.lineTo(centerX + 5, 16)
  context.lineTo(centerX, 21)
  context.lineTo(centerX - 5, 16)
  context.closePath()
  context.fill()
  context.restore()
}

const canvasPng = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob)
    else reject(new Error('PNG 编码失败'))
  }, 'image/png'))

export const renderWeekdayBadges = async (assets: readonly WeekdayBadgeAsset[]): Promise<RenderedTextAsset[]> =>
  Promise.all(assets.map(async asset => {
    const canvas = document.createElement('canvas')
    canvas.width = WEEKDAY_BADGE_CANVAS.width
    canvas.height = WEEKDAY_BADGE_CANVAS.height
    const context = canvas2d(canvas)
    const centerX = asset.slot + 13
    drawTopMarker(context, centerX)
    roundedRect(context, asset.slot, 20, 26, 21, 5)
    context.fillStyle = asset.color
    context.fill()
    context.fillStyle = '#ffffff'
    context.font = '800 16px Arial'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(asset.text, centerX, 31)
    const blob = await canvasPng(canvas)
    return {
      ...asset,
      fileName: `${asset.fileName.replace(/\.png$/i, '')}.png`,
      ...WEEKDAY_BADGE_CANVAS,
      blob,
      url: URL.createObjectURL(blob),
    }
  }))
