"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, Eye, Loader2, MessageCircle } from "lucide-react"
import { loadMoreImages } from "@/app/actions/gallery"
import { IMAGES_PAGE_SIZE, type ImageSort, type ImageWithCount } from "@/lib/images"

export function GalleryGrid({ initialImages, initialHasMore, sort }: { initialImages: ImageWithCount[]; initialHasMore: boolean; sort: ImageSort }) {
  const [images, setImages] = useState(initialImages)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  useEffect(() => { setImages(initialImages); setHasMore(initialHasMore) }, [initialImages, initialHasMore])

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return
    loadingRef.current = true
    setLoading(true)
    try {
      const page = await loadMoreImages(sort, images.length)
      setImages((prev) => { const seen = new Set(prev.map((i) => i.id)); return [...prev, ...page.images.filter((i) => !seen.has(i.id))] })
      setHasMore(page.hasMore)
    } finally { loadingRef.current = false; setLoading(false) }
  }, [hasMore, images.length, sort])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) loadMore() }, { rootMargin: "600px" })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  return <>
    <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
      {images.map((image, index) => <Link key={image.id} href={`/image/${image.id}`} className="group relative mb-4 block break-inside-avoid overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background">
        <Image src={image.blobUrl || "/placeholder.svg"} alt={image.name} width={600} height={600} sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw" loading={index < IMAGES_PAGE_SIZE ? "eager" : "lazy"} className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-foreground/85 via-foreground/10 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
          <div className="flex items-end justify-between gap-3 text-background">
            <span className="line-clamp-2 text-sm font-semibold leading-5">{image.name}</span>
            <ArrowUpRight className="size-5 shrink-0" aria-hidden="true" />
          </div>
          <div className="mt-3 flex gap-3 text-xs text-background/80"><span className="flex items-center gap-1"><Eye className="size-3.5" aria-hidden="true" />{image.views}</span><span className="flex items-center gap-1"><MessageCircle className="size-3.5" aria-hidden="true" />{image.commentCount}</span></div>
        </div>
      </Link>)}
    </div>
    {hasMore && <div ref={sentinelRef} className="flex items-center justify-center py-12 text-muted-foreground" aria-live="polite">{loading && <span className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Loading more images</span>}</div>}
  </>
}
