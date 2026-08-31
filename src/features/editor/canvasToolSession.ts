import type { PixelImage } from '@/features/background-remover/imageProcessor'

const cloneImage = (image: PixelImage): PixelImage => ({
  width: image.width,
  height: image.height,
  data: new Uint8ClampedArray(image.data),
})

export class CanvasToolSession {
  private readonly baseImage: PixelImage
  private previewImage: PixelImage

  constructor(currentImage: PixelImage) {
    this.baseImage = cloneImage(currentImage)
    this.previewImage = cloneImage(currentImage)
  }

  get original(): PixelImage { return cloneImage(this.baseImage) }
  get rendered(): PixelImage { return cloneImage(this.previewImage) }

  preview(image: PixelImage): PixelImage {
    this.previewImage = cloneImage(image)
    return this.rendered
  }

  apply(): PixelImage { return this.rendered }

  cancel(): PixelImage {
    this.previewImage = cloneImage(this.baseImage)
    return this.rendered
  }
}
