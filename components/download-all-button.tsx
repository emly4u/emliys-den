"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { loadMoreImages } from "@/app/actions/gallery"
import { buttonVariants } from "@/components/ui/button"
import { type ImageSort, type ImageWithCount } from "@/lib/images"

export function DownloadAllButton({ initialImages, initialHasMore, sort }: { initialImages: ImageWithCount[]; initialHasMore: boolean; sort: ImageSort }) {
  const [downloading, setDownloading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  async function downloadAll() {
    if (downloading) return
    setDownloading(true)
    setStatus(null)

    try {
      const allImages = [...initialImages]
      let offset = allImages.length
      let hasMore = initialHasMore

      while (hasMore) {
        const page = await loadMoreImages(sort, offset)
        allImages.push(...page.images)
        offset += page.images.length
        hasMore = page.hasMore
      }

      for (const [index, image] of allImages.entries()) {
        const url = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(image.driveFileId)}`
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Download failed for image ${index + 1}`)
        const blob = await response.blob()
        const objectUrl = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = objectUrl
        link.download = `${image.name || `image-${index + 1}`}.jpg`
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(objectUrl)
        await new Promise((resolve) => window.setTimeout(resolve, 250))
      }

      setStatus(`${allImages.length} images downloaded`)
    } catch {
      setStatus("Some images could not be downloaded. Try downloading them individually.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={downloadAll} disabled={downloading} className={buttonVariants({ variant: "outline", className: "gap-2" })}>
        {downloading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
        {downloading ? "Downloading…" : "Download all images"}
      </button>
      {status ? <span role="status" className="text-xs text-muted-foreground">{status}</span> : null}
    </div>
  )
}
