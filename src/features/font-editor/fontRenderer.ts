import type { ParsedFontFile } from './fontSource'
import { FONT_GLYPHS, normalizeFontRecipe, type ExportedGlyph, type FontRecipe } from './fontEditor'

export interface RenderedFontGlyph extends ExportedGlyph {
  url: string
  width: number
  height: number
}

export interface RegisteredFont {
  family: string
  dispose(): void
}

let registrationId = 0

export async function registerFont(source: ParsedFontFile): Promise<RegisteredFont> {
  const family = `WristoFontEditor-${++registrationId}`
  const buffer = source.bytes.buffer.slice(source.bytes.byteOffset, source.bytes.byteOffset + source.bytes.byteLength) as ArrayBuffer
  const face = new FontFace(family, buffer)
  await face.load()
  document.fonts.add(face)
  return { family, dispose: () => document.fonts.delete(face) }
}

function canvas2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('当前浏览器无法创建 2D 画布')
  return context
}

function paintGlyph(family: string, character: string, input: FontRecipe): HTMLCanvasElement {
  const recipe = normalizeFontRecipe(input)
  if (recipe.outlineMode === 'outline-only' && recipe.outlineWidthEm <= 0) throw new Error('仅描边模式需要大于 0 的描边宽度')
  const extent = Math.max(96, Math.ceil(recipe.fontSize * 5))
  const staging = document.createElement('canvas')
  staging.width = extent
  staging.height = extent
  const context = canvas2d(staging)
  const outline = recipe.outlineMode === 'fill' ? 0 : recipe.outlineWidthEm * recipe.fontSize
  const originX = extent / 2
  const originY = extent / 2 + recipe.fontSize * 0.35
  const italicShear = Math.tan((-recipe.italicAngle * Math.PI) / 180)

  context.save()
  context.translate(originX, originY)
  context.transform(recipe.horizontalScale, 0, italicShear, 1, 0, 0)
  context.font = `${recipe.fontWeight} ${recipe.fontSize}px "${family}"`
  context.textAlign = 'center'
  context.textBaseline = 'alphabetic'
  context.lineJoin = 'round'
  context.lineWidth = Math.max(1, outline * 2)
  const angle = recipe.gradientAngle * Math.PI / 180
  const radius = recipe.fontSize
  const gradient = context.createLinearGradient(
    Math.cos(angle + Math.PI) * radius,
    Math.sin(angle + Math.PI) * radius,
    Math.cos(angle) * radius,
    Math.sin(angle) * radius,
  )
  gradient.addColorStop(0, recipe.gradientStartColor)
  gradient.addColorStop(1, recipe.gradientEnabled ? recipe.gradientEndColor : recipe.gradientStartColor)
  context.fillStyle = gradient
  context.strokeStyle = gradient
  if (recipe.outlineMode !== 'fill' && outline > 0) context.strokeText(character, 0, 0)
  if (recipe.outlineMode !== 'outline-only') context.fillText(character, 0, 0)
  context.restore()

  const image = context.getImageData(0, 0, extent, extent)
  let left = extent
  let top = extent
  let right = -1
  let bottom = -1
  for (let index = 0; index < image.data.length; index += 4) {
    let alpha = image.data[index + 3]
    if (!recipe.antialias) {
      alpha = alpha >= 128 ? 255 : 0
      image.data[index + 3] = alpha
    }
    if (alpha === 0) continue
    const pixel = index / 4
    const x = pixel % extent
    const y = Math.floor(pixel / extent)
    left = Math.min(left, x)
    top = Math.min(top, y)
    right = Math.max(right, x)
    bottom = Math.max(bottom, y)
  }
  if (right < left || bottom < top) throw new Error(`字符 ${character} 渲染为空`)
  if (!recipe.antialias) context.putImageData(image, 0, 0)

  const output = document.createElement('canvas')
  output.width = right - left + 1
  output.height = bottom - top + 1
  canvas2d(output).drawImage(staging, left, top, output.width, output.height, 0, 0, output.width, output.height)
  return output
}

function canvasPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => canvas.toBlob(async blob => {
    if (!blob) return reject(new Error('PNG 编码失败'))
    resolve(new Uint8Array(await blob.arrayBuffer()))
  }, 'image/png'))
}

export async function renderFontGlyphs(family: string, recipe: FontRecipe): Promise<RenderedFontGlyph[]> {
  return Promise.all(FONT_GLYPHS.map(async glyph => {
    const canvas = paintGlyph(family, glyph.character, recipe)
    const png = await canvasPng(canvas)
    const ownedPng = Uint8Array.from(png)
    return { ...glyph, png: ownedPng, url: URL.createObjectURL(new Blob([ownedPng.buffer], { type: 'image/png' })), width: canvas.width, height: canvas.height }
  }))
}

export function disposeRenderedGlyphs(glyphs: readonly RenderedFontGlyph[]): void {
  glyphs.forEach(glyph => URL.revokeObjectURL(glyph.url))
}
