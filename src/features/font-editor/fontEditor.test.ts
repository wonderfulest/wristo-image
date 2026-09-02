import { unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import {
  FONT_GLYPHS,
  buildGlyphZip,
  defaultFontRecipe,
  normalizeFontRecipe,
  type ExportedGlyph,
} from './fontEditor'

describe('font editor contract', () => {
  it('uses digits and colon as the fixed default glyph set', () => {
    expect(FONT_GLYPHS.map(item => item.fileName)).toEqual([
      '0.png', '1.png', '2.png', '3.png', '4.png',
      '5.png', '6.png', '7.png', '8.png', '9.png', 'colon.png',
    ])
    expect(FONT_GLYPHS.map(item => item.character).join('')).toBe('0123456789:')
  })

  it('normalizes every editable recipe value to the supported range', () => {
    expect(normalizeFontRecipe({
      ...defaultFontRecipe(),
      fontSize: 999,
      fontWeight: 42,
      italicAngle: -80,
      horizontalScale: 9,
      outlineWidthEm: -2,
      gradientAngle: 721,
      gradientStartColor: 'bad',
    })).toMatchObject({
      fontSize: 312,
      fontWeight: 100,
      italicAngle: -20,
      horizontalScale: 1.5,
      outlineWidthEm: 0,
      gradientAngle: 1,
      gradientStartColor: '#ffffff',
    })
  })

  it('builds a zip containing exactly the eleven named PNG glyphs', () => {
    const png = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10)
    const glyphs: ExportedGlyph[] = FONT_GLYPHS.map(glyph => ({ ...glyph, png }))

    const archive = unzipSync(buildGlyphZip(glyphs))

    expect(Object.keys(archive).sort()).toEqual(FONT_GLYPHS.map(item => item.fileName).sort())
    expect(Array.from(archive['colon.png'])).toEqual(Array.from(png))
  })
})
