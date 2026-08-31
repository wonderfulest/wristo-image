import { describe, expect, it } from 'vitest'
import { ImageHistory } from './imageHistory'
import type { PixelImage } from '@/features/background-remover/imageProcessor'

const snapshot = (value: number): PixelImage => ({ width: 1, height: 1, data: new Uint8ClampedArray([value, 0, 0, 255]) })
const red = (image: PixelImage | null): number | null => image?.data[0] ?? null

describe('ImageHistory', () => {
  it('undoes and redoes committed snapshots', () => {
    const history = new ImageHistory(snapshot(1))
    history.commit(snapshot(2))
    history.commit(snapshot(3))
    expect(red(history.undo())).toBe(2)
    expect(red(history.undo())).toBe(1)
    expect(red(history.redo())).toBe(2)
  })

  it('drops redo snapshots after a new commit', () => {
    const history = new ImageHistory(snapshot(1))
    history.commit(snapshot(2)); history.undo(); history.commit(snapshot(8))
    expect(history.canRedo).toBe(false)
    expect(red(history.current)).toBe(8)
  })

  it('keeps no more than twenty snapshots', () => {
    const history = new ImageHistory(snapshot(0))
    for (let value = 1; value <= 25; value += 1) history.commit(snapshot(value))
    for (let i = 0; i < 30; i += 1) history.undo()
    expect(red(history.current)).toBe(6)
  })
})
