"use client"

import { useEffect, useRef } from "react"
import { motionEventName } from "@/components/animation-toggle"
import { segmentHairAndClothes } from "@/lib/wind-segmentation"
import { ANIMATE_SHADER, PRECOMPUTE_SHADER, VERTEX_SHADER } from "@/lib/wind-shaders"

const WIND = 1.25
const DURATION_SECONDS = 6
// The reference portrait width the wind amplitudes and frequencies were tuned for.
const REFERENCE_WIDTH = 1148

const PORTRAIT_UNIT = 0
const MOTION_UNIT = 1
const MASK_UNIT = 2

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

function useProgramWithQuad(gl: WebGLRenderingContext, program: WebGLProgram) {
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
 * Overlays a live WebGL wind effect on the image rendered beneath it. A person
 * segmentation pass restricts the motion to hair and clothes; skin and
 * background never move. Hidden when motion is off, WebGL is unavailable, or
 * segmentation fails, in which case the underlying <img> shows through untouched.
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
      canvas.style.visibility = motionEnabled() ? "visible" : "hidden"
      const shouldAnimate = motionEnabled() && !document.hidden
      if (shouldAnimate && !animating) {
        animating = true
        frameId = requestAnimationFrame(draw)
      } else if (!shouldAnimate) {
        animating = false
        cancelAnimationFrame(frameId)
      }
    }

    async function setup(image: HTMLImageElement) {
      const mask = await segmentHairAndClothes(image)
      if (cancelled || !mask.hasMovable || !canvas || !gl) return

      const width = image.naturalWidth
      const height = image.naturalHeight
      canvas.width = width
      canvas.height = height

      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)

      createTexture(gl, PORTRAIT_UNIT)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)

      createTexture(gl, MASK_UNIT)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, mask.width, mask.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, mask.rgba)

      const motionTexture = createTexture(gl, MOTION_UNIT)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
      const framebuffer = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, motionTexture, 0)

      const precompute = useProgramWithQuad(gl, createProgram(gl, PRECOMPUTE_SHADER))
      precompute.set1i("u_mask", MASK_UNIT)
      precompute.set1f("u_aspect", height / width)
      gl.viewport(0, 0, width, height)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)

      const animateProgram = createProgram(gl, ANIMATE_SHADER)
      const animate = useProgramWithQuad(gl, animateProgram)
      const scale = width / REFERENCE_WIDTH
      animate.set1i("u_portrait", PORTRAIT_UNIT)
      animate.set1i("u_motion", MOTION_UNIT)
      animate.set1f("u_wind", WIND)
      animate.set1f("u_duration", DURATION_SECONDS)
      animate.set1f("u_w", width)
      animate.set1f("u_h", height)
      animate.set1f("u_scale", scale)
      animate.set1f("u_freq_yc", 0.013 / scale)
      animate.set1f("u_freq_xc", 0.007 / scale)
      const timeLocation = gl.getUniformLocation(animateProgram, "u_time")

      const startedAt = performance.now()
      draw = (now) => {
        gl.uniform1f(timeLocation, (now - startedAt) * 0.001)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        frameId = requestAnimationFrame(draw!)
      }
      sync()
    }

    // Same-origin bytes, so the canvas is never tainted and WebGL can sample them.
    const image = new Image()
    image.onload = () => {
      setup(image).catch(() => {
        // Without a reliable hair/clothes mask, leave the image still.
      })
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
