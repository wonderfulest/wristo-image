import { describe, expect, it } from 'vitest'
import type { PixelImage } from '@/features/background-remover/imageProcessor'
import { CanvasToolSession } from './canvasToolSession'

const image = (red: number): PixelImage => ({
  width: 1,
  height: 1,
  data: new Uint8ClampedArray([red, 0, 0, 255]),
})

describe('CanvasToolSession', () => {
  it('previews without mutating the current canvas and applies explicitly', () => {
    const current = image(10)
    const session = new CanvasToolSession(current)

    session.preview(image(20))

    expect(current.data[0]).toBe(10)
    expect(session.rendered.data[0]).toBe(20)
    expect(session.apply().data[0]).toBe(20)
  })

  it('cancels a preview back to the canvas snapshot', () => {
    const session = new CanvasToolSession(image(10))
    session.preview(image(20))

    expect(session.cancel().data[0]).toBe(10)
    expect(session.rendered.data[0]).toBe(10)
  })

  it('returns clones so tools cannot mutate the shared canvas implicitly', () => {
    const current = image(10)
    const session = new CanvasToolSession(current)

    const rendered = session.rendered
    rendered.data[0] = 99

    expect(current.data[0]).toBe(10)
    expect(session.rendered.data[0]).toBe(10)
  })

  it('undoes and redoes committed tool steps one at a time', () => {
    const session = new CanvasToolSession(image(10))

    session.commitStep(image(20))
    session.commitStep(image(30))

    expect(session.canUndo).toBe(true)
    expect(session.undo().data[0]).toBe(20)
    expect(session.undo().data[0]).toBe(10)
    expect(session.canUndo).toBe(false)
    expect(session.canRedo).toBe(true)
    expect(session.redo().data[0]).toBe(20)
  })

  it('drops redo steps when a new tool step is committed after undo', () => {
    const session = new CanvasToolSession(image(10))
    session.commitStep(image(20))
    session.commitStep(image(30))
    session.undo()

    session.commitStep(image(40))

    expect(session.canRedo).toBe(false)
    expect(session.rendered.data[0]).toBe(40)
  })
})
