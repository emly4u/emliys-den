"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Eye, Loader2, MessageCircle } from "lucide-react"
import { loadMoreImages } from "@/app/actions/gallery"
import { IMAGES_PAGE_SIZE, type ImageSort, type ImageWithCount } from "@/lib/images"

export function GalleryGrid({
  initialImages,
  initialHasMore,
  sort,
}: {
  initialImages: ImageWithCount[]
  initialHasMore: boolean
  sort: ImageSort
}) {
  const [images, setImages] = useState(initialImages)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  // Guards against firing a second request before the first resolves.
  const loadingRef = useRef(false)

  // Reset when the sort (and therefore the initial page) changes.
  useEffect(() => {
    setImages(initialImages)
    setHasMore(initialHasMore)
  }, [initialImages, initialHasMore])

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return
    loadingRef.current = true
    setLoading(true)
    try {
      const page = await loadMoreImages(sort, images.length)
      setImages((prev) => {
        const seen = new Set(prev.map((i) => i.id))
        return [...prev, ...page.images.filter((i) => !seen.has(i.id))]
      })
      setHasMore(page.hasMore)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [hasMore, images.length, sort])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: "600px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {images.map((image, index) => (
          <Link
            key={image.id}
            href={`/image/${image.id}`}
            className="group relative block overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Image
              src={image.blobUrl || "/placeholder.svg"}
              alt={image.name}
              width={400}
              height={400}
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              loading={index < IMAGES_PAGE_SIZE ? "eager" : "lazy"}
              className="h-auto w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="line-clamp-1 text-sm font-medium text-white">{image.name}</span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-white/90">
                <span className="flex items-center gap-1">
                  <Eye className="size-3.5" aria-hidden="true" />
                  {image.views}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="size-3.5" aria-hidden="true" />
                  {image.commentCount}
                </span>
              </span>
            </div>
          </Link>
        ))}
      </div>

      {hasMore && (
        <div
          ref={sentinelRef}
          className="flex items-center justify-center py-10 text-muted-foreground"
        >
          {loading && (
            <span className="flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading more…
            </span>
          )}
        </div>
      )}
    </>
  )
}
