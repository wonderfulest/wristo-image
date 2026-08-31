import type { PixelImage } from '@/features/background-remover/imageProcessor'

const clone = (image: PixelImage): PixelImage => ({ width: image.width, height: image.height, data: new Uint8ClampedArray(image.data) })

export class ImageHistory {
  private snapshots: PixelImage[]
  private index = 0
  constructor(initial: PixelImage, private readonly limit = 20) { this.snapshots = [clone(initial)] }
  get current(): PixelImage { return clone(this.snapshots[this.index]!) }
  get canUndo(): boolean { return this.index > 0 }
  get canRedo(): boolean { return this.index < this.snapshots.length - 1 }
  commit(image: PixelImage): PixelImage {
    this.snapshots = this.snapshots.slice(0, this.index + 1)
    this.snapshots.push(clone(image))
    if (this.snapshots.length > this.limit) this.snapshots.shift()
    this.index = this.snapshots.length - 1
    return this.current
  }
  undo(): PixelImage { if (this.canUndo) this.index -= 1; return this.current }
  redo(): PixelImage { if (this.canRedo) this.index += 1; return this.current }
}
