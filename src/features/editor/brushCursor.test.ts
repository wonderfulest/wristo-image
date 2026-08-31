import { describe, expect, it } from 'vitest'
import { resolveBrushCursor } from './brushCursor'

describe('resolveBrushCursor', () => {
  it('positions the cursor inside the stage and scales its diameter with the canvas', () => {
    expect(resolveBrushCursor({
      clientX: 250,
      clientY: 180,
      brushSize: 90,
      canvasWidth: 900,
      canvasBounds: { left: 100, top: 80, width: 450, height: 450 },
      stageBounds: { left: 20, top: 30 },
    })).toEqual({ left: 230, top: 150, diameter: 45 })
  })

  it('returns null when the canvas has no rendered width', () => {
    expect(resolveBrushCursor({
      clientX: 0,
      clientY: 0,
      brushSize: 32,
      canvasWidth: 100,
      canvasBounds: { left: 0, top: 0, width: 0, height: 0 },
      stageBounds: { left: 0, top: 0 },
    })).toBeNull()
  })
})
