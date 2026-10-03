// Client-only person parsing for the wind effect. Labels every pixel as hair,
// clothes, or skin (face + body) using MediaPipe's selfie multiclass model, so
// the shader can move hair and clothes while leaving skin and background still.
// Loaded from a CDN at runtime to avoid a bundled dependency.

const VISION_URL: string = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.mjs"
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm"
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite"

// Category ids of the selfie multiclass model.
const HAIR = 1
const BODY_SKIN = 2
const FACE_SKIN = 3
const CLOTHES = 4

type CategoryMask = { width: number; height: number; getAsUint8Array(): Uint8Array }
type Segmenter = {
  segment(image: HTMLImageElement): { categoryMask?: CategoryMask; close(): void }
  close(): void
}
type VisionModule = {
  FilesetResolver: { forVisionTasks(wasmPath: string): Promise<unknown> }
  ImageSegmenter: { createFromOptions(fileset: unknown, options: object): Promise<Segmenter> }
}

export type SegmentationMask = {
  /** RGBA: R = hair, G = clothes, B = skin (face + body). */
  rgba: Uint8Array
  width: number
  height: number
  /** False when the image has no hair or clothes to animate. */
  hasMovable: boolean
  /** Horizontal body axis (0..1): centroid of skin pixels, 0.5 when none. */
  axisX: number
}

async function createSegmenter(vision: VisionModule): Promise<Segmenter> {
  const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL)
  const options = (delegate: "GPU" | "CPU") => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "IMAGE",
    outputCategoryMask: true,
    outputConfidenceMasks: false,
  })
  try {
    return await vision.ImageSegmenter.createFromOptions(fileset, options("GPU"))
  } catch {
    return await vision.ImageSegmenter.createFromOptions(fileset, options("CPU"))
  }
}

export async function segmentHairAndClothes(image: HTMLImageElement): Promise<SegmentationMask> {
  const vision = (await import(/* webpackIgnore: true */ VISION_URL)) as VisionModule
  const segmenter = await createSegmenter(vision)
  try {
    const result = segmenter.segment(image)
    const mask = result.categoryMask
    if (!mask) throw new Error("Segmentation returned no mask")

    const categories = mask.getAsUint8Array()
    const rgba = new Uint8Array(mask.width * mask.height * 4)
    let movable = 0
    let skinCount = 0
    let skinXSum = 0
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i]
      const isHair = category === HAIR
      const isClothes = category === CLOTHES
      const isSkin = category === BODY_SKIN || category === FACE_SKIN
      rgba[i * 4] = isHair ? 255 : 0
      rgba[i * 4 + 1] = isClothes ? 255 : 0
      rgba[i * 4 + 2] = isSkin ? 255 : 0
      rgba[i * 4 + 3] = 255
      if (isHair || isClothes) movable++
      if (isSkin) {
        skinCount++
        skinXSum += i % mask.width
      }
    }
    result.close()
    const axisX = skinCount > 0 ? skinXSum / skinCount / mask.width : 0.5
    return { rgba, width: mask.width, height: mask.height, hasMovable: movable > 0, axisX }
  } finally {
    segmenter.close()
  }
}
