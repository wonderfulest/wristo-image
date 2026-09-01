import type { PixelImage } from '@/features/background-remover/imageProcessor'

const cloneImage = (image: PixelImage): PixelImage => ({
  width: image.width,
  height: image.height,
  data: new Uint8ClampedArray(image.data),
})

export class CanvasToolSession {
  private readonly baseImage: PixelImage
  private previewImage: PixelImage
  private steps: PixelImage[]
  private stepIndex = 0

  constructor(currentImage: PixelImage) {
    this.baseImage = cloneImage(currentImage)
    this.previewImage = cloneImage(currentImage)
    this.steps = [cloneImage(currentImage)]
  }

  get original(): PixelImage { return cloneImage(this.baseImage) }
  get rendered(): PixelImage { return cloneImage(this.previewImage) }
  get canUndo(): boolean { return this.stepIndex > 0 }
  get canRedo(): boolean { return this.stepIndex < this.steps.length - 1 }

  preview(image: PixelImage): PixelImage {
    this.previewImage = cloneImage(image)
    return this.rendered
  }

  commitStep(image: PixelImage): PixelImage {
    this.steps = this.steps.slice(0, this.stepIndex + 1)
    this.steps.push(cloneImage(image))
    this.stepIndex += 1
    this.previewImage = cloneImage(image)
    return this.rendered
  }

  undo(): PixelImage {
    if (this.canUndo) this.stepIndex -= 1
    this.previewImage = cloneImage(this.steps[this.stepIndex]!)
    return this.rendered
  }

  redo(): PixelImage {
    if (this.canRedo) this.stepIndex += 1
    this.previewImage = cloneImage(this.steps[this.stepIndex]!)
    return this.rendered
  }

  apply(): PixelImage { return this.rendered }

  cancel(): PixelImage {
    this.previewImage = cloneImage(this.baseImage)
    this.steps = [cloneImage(this.baseImage)]
    this.stepIndex = 0
    return this.rendered
  }
}
