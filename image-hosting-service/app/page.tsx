import { ImageOff } from "lucide-react"
import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { SiteHeader } from "@/components/site-header"
import { GalleryGrid } from "@/components/gallery-grid"
import { SortToggle } from "@/components/sort-toggle"
import { getImages, type ImageSort } from "@/lib/queries"
import { maybeSync } from "@/lib/sync"

export const dynamic = "force-dynamic"

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>
}) {
  const { sort: sortParam } = await searchParams
  const sort: ImageSort = sortParam === "popular" ? "popular" : "new"
  const { images, hasMore } = await getImages(sort)

  // Kick off a throttled background sync after the response is sent. This makes
  // the 30-minute import work on any Vercel plan (traffic-driven, no paid cron).
  after(async () => {
    try {
      const result = await maybeSync()
      if (result && result.imported > 0) {
        revalidatePath("/")
      }
    } catch (err) {
      console.log("[v0] background sync error:", err instanceof Error ? err.message : String(err))
    }
  })

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-8 max-w-2xl">
          <h1 className="text-balance font-serif text-3xl font-semibold tracking-tight md:text-4xl">
            Welcome to Emily&apos;s Den
          </h1>
          <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
            A warm little gallery that automatically gathers new images every 30 minutes. Open any
            picture for a shareable link and join the conversation in the comments.
          </p>
        </div>

        {images.length > 0 && (
          <div className="mb-6 flex items-center justify-end">
            <SortToggle current={sort} />
          </div>
        )}

        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
            <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <ImageOff className="size-7" aria-hidden="true" />
            </span>
            <h2 className="font-serif text-xl font-medium">No images yet</h2>
            <p className="mt-2 max-w-sm text-pretty text-sm text-muted-foreground">
              Once the sync runs, new images from the Drive folder will appear here. Try the
              &ldquo;Sync now&rdquo; button up top to fetch them right away.
            </p>
          </div>
        ) : (
          <GalleryGrid initialImages={images} initialHasMore={hasMore} sort={sort} />
        )}
      </main>
    </div>
  )
}
