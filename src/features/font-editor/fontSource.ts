import { parse, type Font } from 'opentype.js'

export type FontSourceErrorCode = 'UNSUPPORTED_FORMAT' | 'TOO_LARGE' | 'INVALID_FONT'

export class FontSourceError extends Error {
  constructor(readonly code: FontSourceErrorCode, detail?: string) {
    super(detail ? `${code}: ${detail}` : code)
    this.name = 'FontSourceError'
  }
}

export interface ParsedFontFile {
  file: File
  family: string
  font: Font
  bytes: Uint8Array
  missingGlyphs(characters: readonly string[]): string[]
}

const MAX_FONT_BYTES = 20 * 1024 * 1024

function localizedName(values: Record<string, string> | undefined): string | undefined {
  if (!values) return undefined
  return values.en?.trim() || Object.values(values).find(value => value.trim())?.trim()
}

export async function parseFontFile(file: File): Promise<ParsedFontFile> {
  if (!/\.(?:ttf|otf)$/i.test(file.name)) throw new FontSourceError('UNSUPPORTED_FORMAT', '仅支持 TTF/OTF')
  if (file.size > MAX_FONT_BYTES) throw new FontSourceError('TOO_LARGE', '字体文件不能超过 20 MiB')

  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    const font = parse(buffer)
    const family = localizedName(font.names.fontFamily) || file.name.replace(/\.[^.]+$/, '')
    return {
      file,
      family,
      font,
      bytes,
      missingGlyphs: characters => characters.filter(character => {
        const codepoint = character.codePointAt(0)!
        const glyph = font.charToGlyph(character)
        return glyph.index === 0 && codepoint !== 0
      }),
    }
  } catch (error) {
    if (error instanceof FontSourceError) throw error
    throw new FontSourceError('INVALID_FONT', error instanceof Error ? error.message : '无法解析字体')
  }
}
