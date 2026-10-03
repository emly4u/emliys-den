"use client"

import { useEffect, useRef } from "react"
import { motionEventName } from "@/components/animation-toggle"
import { ANIMATE_SHADER, PRECOMPUTE_SHADER, VERTEX_SHADER } from "@/lib/wind-shaders"

const WIND = 1.25
const DURATION_SECONDS = 6
// The reference portrait width the wind frequencies were tuned for.
const REFERENCE_WIDTH = 1148

type FaceDetectorLike = { detect(image: CanvasImageSource): Promise<{ boundingBox: DOMRectReadOnly }[]> }

async function detectFaceCenterX(image: HTMLImageElement): Promise<number> {
  const Detector = (window as unknown as { FaceDetector?: new () => FaceDetectorLike }).FaceDetector
  if (!Detector) return image.naturalWidth / 2
  try {
    const faces = await new Detector().detect(image)
    if (faces.length === 0) return image.naturalWidth / 2
    const { x, width } = faces.reduce((a, b) =>
      a.boundingBox.width * a.boundingBox.height > b.boundingBox.width * b.boundingBox.height ? a : b,
    ).boundingBox
    return x + width / 2
  } catch {
    return image.naturalWidth / 2
  }
}

function createProgram(gl: WebGLRenderingContext, fragmentSource: string): WebGLProgram {
  const program = gl.createProgram()
  for (const [type, source] of [
    [gl.VERTEX_SHADER, VERTEX_SHADER],
    [gl.FRAGMENT_SHADER, fragmentSource],
  ] as const) {
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "Shader error")
    gl.attachShader(program, shader)
  }
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "Link error")
  return program
}

function createTexture(gl: WebGLRenderingContext, unit: number): WebGLTexture {
  const texture = gl.createTexture()!
  gl.activeTexture(gl.TEXTURE0 + unit)
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  return texture
}

function useUniforms(gl: WebGLRenderingContext, program: WebGLProgram) {
  gl.useProgram(program)
  const quad = gl.getAttribLocation(program, "a_pos")
  gl.enableVertexAttribArray(quad)
  gl.vertexAttribPointer(quad, 2, gl.FLOAT, false, 0, 0)
  return {
    set1f: (name: string, value: number) => gl.uniform1f(gl.getUniformLocation(program, name), value),
    set1i: (name: string, value: number) => gl.uniform1i(gl.getUniformLocation(program, name), value),
  }
}

/**
 * Overlays a live WebGL wind effect (hair and cloth sway) on top of the image
 * rendered beneath it. Hidden when motion is off or WebGL is unavailable, in
 * which case the underlying <img> shows through untouched.
 */
export function WindCanvas({ imageId }: { imageId: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas?.getContext("webgl")
    if (!canvas || !gl) return

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const motionEnabled = () => document.documentElement.dataset.motion !== "off" && !reducedMotion.matches

    let frameId = 0
    let animating = false
    let cancelled = false
    let draw: ((now: number) => void) | null = null

    function sync() {
      if (!canvas || !draw) return
      const shouldAnimate = motionEnabled() && !document.hidden
      canvas.style.visibility = motionEnabled() ? "visible" : "hidden"
      if (shouldAnimate && !animating) {
        animating = true
        frameId = requestAnimationFrame(draw)
      } else if (!shouldAnimate) {
        animating = false
        cancelAnimationFrame(frameId)
      }
    }

    // Same-origin bytes, so the canvas is never tainted and WebGL can sample them.
    const image = new Image()
    image.onload = async () => {
      const gl2 = gl as WebGLRenderingContext
      const width = image.naturalWidth
      const height = image.naturalHeight
      const centerX = await detectFaceCenterX(image)
      if (cancelled) return
      canvas.width = width
      canvas.height = height

      gl2.bindBuffer(gl2.ARRAY_BUFFER, gl2.createBuffer())
      gl2.bufferData(gl2.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl2.STATIC_DRAW)

      // Portrait on unit 0, amplitude map on unit 1.
      createTexture(gl2, 0)
      gl2.texImage2D(gl2.TEXTURE_2D, 0, gl2.RGBA, gl2.RGBA, gl2.UNSIGNED_BYTE, image)
      const motionTexture = createTexture(gl2, 1)
      gl2.texImage2D(gl2.TEXTURE_2D, 0, gl2.RGBA, width, height, 0, gl2.RGBA, gl2.UNSIGNED_BYTE, null)
      const framebuffer = gl2.createFramebuffer()
      gl2.bindFramebuffer(gl2.FRAMEBUFFER, framebuffer)
      gl2.framebufferTexture2D(gl2.FRAMEBUFFER, gl2.COLOR_ATTACHMENT0, gl2.TEXTURE_2D, motionTexture, 0)

      const precompute = useUniforms(gl2, createProgram(gl2, PRECOMPUTE_SHADER))
      precompute.set1i("u_portrait", 0)
      precompute.set1f("u_w", width)
      precompute.set1f("u_h", height)
      precompute.set1f("u_cx", centerX)
      gl2.viewport(0, 0, width, height)
      gl2.drawArrays(gl2.TRIANGLE_STRIP, 0, 4)
      gl2.bindFramebuffer(gl2.FRAMEBUFFER, null)

      const animateProgram = createProgram(gl2, ANIMATE_SHADER)
      const animate = useUniforms(gl2, animateProgram)
      const scale = REFERENCE_WIDTH / width
      animate.set1i("u_portrait", 0)
      animate.set1i("u_motion", 1)
      animate.set1f("u_wind", WIND)
      animate.set1f("u_duration", DURATION_SECONDS)
      animate.set1f("u_w", width)
      animate.set1f("u_h", height)
      animate.set1f("u_cx", centerX)
      animate.set1f("u_freq_yc", 0.013 * scale)
      animate.set1f("u_freq_xc", 0.007 * scale)
      const timeLocation = gl2.getUniformLocation(animateProgram, "u_time")

      const startedAt = performance.now()
      draw = (now) => {
        gl2.uniform1f(timeLocation, (now - startedAt) * 0.001)
        gl2.drawArrays(gl2.TRIANGLE_STRIP, 0, 4)
        frameId = requestAnimationFrame(draw!)
      }
      sync()
    }
    image.src = `/api/image/${imageId}`

    window.addEventListener(motionEventName, sync)
    document.addEventListener("visibilitychange", sync)
    reducedMotion.addEventListener("change", sync)
    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
      window.removeEventListener(motionEventName, sync)
      document.removeEventListener("visibilitychange", sync)
      reducedMotion.removeEventListener("change", sync)
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    }
  }, [imageId])

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none invisible absolute inset-0 size-full object-contain" />
}
