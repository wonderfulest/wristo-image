export interface BrushCursorInput {
  clientX: number
  clientY: number
  brushSize: number
  canvasWidth: number
  canvasBounds: { left: number; top: number; width: number; height: number }
  stageBounds: { left: number; top: number }
}

export interface BrushCursorPosition {
  left: number
  top: number
  diameter: number
}

export const resolveBrushCursor = (input: BrushCursorInput): BrushCursorPosition | null => {
  if (input.canvasWidth <= 0 || input.canvasBounds.width <= 0 || input.canvasBounds.height <= 0) return null
  return {
    left: input.clientX - input.stageBounds.left,
    top: input.clientY - input.stageBounds.top,
    diameter: input.brushSize * input.canvasBounds.width / input.canvasWidth,
  }
}
