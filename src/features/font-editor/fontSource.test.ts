import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FONT_GLYPHS } from './fontEditor'
import { FontSourceError, parseFontFile } from './fontSource'

describe('font source', () => {
  it('parses a local font and confirms all default glyphs are available', async () => {
    const fixture = resolve(process.cwd(), '../wristo-studio/src/features/bitmap-font-maker/__fixtures__/minimal-latin.ttf')
    const bytes = await readFile(fixture)
    const file = new File([bytes], 'minimal-latin.ttf')
    Object.defineProperty(file, 'arrayBuffer', { value: async () => Uint8Array.from(bytes).buffer })
    const source = await parseFontFile(file)

    expect(source.family).toBeTruthy()
    expect(source.missingGlyphs(FONT_GLYPHS.map(item => item.character))).toEqual([])
  })

  it('rejects unsupported files before parsing', async () => {
    await expect(parseFontFile(new File(['font'], 'font.woff')))
      .rejects.toEqual(expect.objectContaining<Partial<FontSourceError>>({ code: 'UNSUPPORTED_FORMAT' }))
  })
})
