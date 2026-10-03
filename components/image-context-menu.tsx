"use client"

import type { ReactNode } from "react"
import { Check, Copy, Download, Image as ImageIcon } from "lucide-react"
import { useEffect, useState } from "react"

export function ImageContextMenu({
  imageName,
  downloadUrl,
  imageUrl,
  children,
}: {
  imageName: string
  downloadUrl: string
  imageUrl: string
  children: ReactNode
}) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const [imageCopied, setImageCopied] = useState<"idle" | "done" | "failed">("idle")

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  // The async clipboard API only reliably accepts image/png, so re-encode via canvas.
  async function copyImage() {
    try {
      const response = await fetch(imageUrl, { cache: "force-cache" })
      if (!response.ok) throw new Error(`Image request failed: ${response.status}`)
      const bitmap = await createImageBitmap(await response.blob())
      const canvas = document.createElement("canvas")
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0)
      const png = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Encode failed"))), "image/png"),
      )
      await navigator.clipboard.write([new ClipboardItem({ "image/png": png })])
      setImageCopied("done")
    } catch {
      setImageCopied("failed")
    }
    window.setTimeout(() => setImageCopied("idle"), 1600)
  }

  useEffect(() => {
    if (!position) return
    const close = () => setPosition(null)
    window.addEventListener("click", close)
    window.addEventListener("scroll", close, { passive: true })
    return () => {
      window.removeEventListener("click", close)
      window.removeEventListener("scroll", close)
    }
  }, [position])

  function handleContextMenu(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault()
    setPosition({
      x: Math.min(event.clientX, window.innerWidth - 220),
      y: Math.min(event.clientY, window.innerHeight - 112),
    })
  }

  return (
    <div className="relative" onContextMenu={handleContextMenu}>
      {children}
      {position && (
        <div
          role="menu"
          aria-label={`Actions for ${imageName}`}
          className="fixed z-50 min-w-48 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
          style={{ left: position.x, top: position.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={copyImage}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
          >
            {imageCopied === "done" ? <Check className="size-4" aria-hidden="true" /> : <ImageIcon className="size-4" aria-hidden="true" />}
            {imageCopied === "done" ? "Image copied" : imageCopied === "failed" ? "Copy failed" : "Copy image"}
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
          >
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied ? "Link copied" : "Copy image link"}
          </button>
          <a
            href={downloadUrl}
            download={`${imageName}.jpg`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
          >
            <Download className="size-4" aria-hidden="true" />
            Download
          </a>
        </div>
      )}
    </div>
  )
}
