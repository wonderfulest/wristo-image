import { zipSync } from 'fflate'

export type OutlineMode = 'fill' | 'fill-outline' | 'outline-only'

export interface FontRecipe {
  fontSize: number
  fontWeight: number
  italicAngle: number
  horizontalScale: number
  outlineWidthEm: number
  outlineMode: OutlineMode
  antialias: boolean
  gradientEnabled: boolean
  gradientStartColor: string
  gradientEndColor: string
  gradientAngle: number
}

export interface FontGlyph {
  character: string
  fileName: string
}

export interface ExportedGlyph extends FontGlyph {
  png: Uint8Array
}

export const FONT_GLYPHS: readonly FontGlyph[] = Object.freeze([
  ...Array.from({ length: 10 }, (_, digit) => ({ character: String(digit), fileName: `${digit}.png` })),
  { character: ':', fileName: 'colon.png' },
])

export function defaultFontRecipe(): FontRecipe {
  return {
    fontSize: 84,
    fontWeight: 400,
    italicAngle: 0,
    horizontalScale: 1,
    outlineWidthEm: 0,
    outlineMode: 'fill',
    antialias: true,
    gradientEnabled: false,
    gradientStartColor: '#ffffff',
    gradientEndColor: '#ffffff',
    gradientAngle: 90,
  }
}

const clamp = (value: number, minimum: number, maximum: number, fallback: number): number =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : fallback))

const color = (value: string): string => /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : '#ffffff'

export function normalizeFontRecipe(input: FontRecipe): FontRecipe {
  return {
    fontSize: Math.round(clamp(input.fontSize, 6, 312, 84)),
    fontWeight: Math.round(clamp(input.fontWeight, 100, 900, 400) / 100) * 100,
    italicAngle: clamp(input.italicAngle, -20, 20, 0),
    horizontalScale: clamp(input.horizontalScale, 0.5, 1.5, 1),
    outlineWidthEm: clamp(input.outlineWidthEm, 0, 0.5, 0),
    outlineMode: ['fill', 'fill-outline', 'outline-only'].includes(input.outlineMode) ? input.outlineMode : 'fill',
    antialias: Boolean(input.antialias),
    gradientEnabled: Boolean(input.gradientEnabled),
    gradientStartColor: color(input.gradientStartColor),
    gradientEndColor: color(input.gradientEndColor),
    gradientAngle: ((clamp(input.gradientAngle, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 90) % 360) + 360) % 360,
  }
}

export function buildGlyphZip(glyphs: readonly ExportedGlyph[]): Uint8Array {
  const entries = Object.fromEntries(glyphs.map(glyph => [glyph.fileName, glyph.png]))
  return zipSync(entries, { level: 6 })
}
