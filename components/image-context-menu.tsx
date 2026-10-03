"use client"

import type { ReactNode } from "react"
import { Check, Copy, Download } from "lucide-react"
import { useEffect, useState } from "react"

export function ImageContextMenu({
  imageName,
  downloadUrl,
  driveUrl,
  children,
}: {
  imageName: string
  downloadUrl: string
  driveUrl: string
  children: ReactNode
}) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    await navigator.clipboard.writeText(driveUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
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
      y: Math.min(event.clientY, window.innerHeight - 64),
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
