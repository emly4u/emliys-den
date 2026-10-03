import { ImageOff, Images, Sparkles } from "lucide-react"
import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { SiteHeader } from "@/components/site-header"
import { GalleryGrid } from "@/components/gallery-grid"
import { SortToggle } from "@/components/sort-toggle"
import { getImages, type ImageSort } from "@/lib/queries"
import { maybeSync } from "@/lib/sync"

export const dynamic = "force-dynamic"

export default async function HomePage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const { sort: sortParam } = await searchParams
  const sort: ImageSort = sortParam === "popular" ? "popular" : "new"
  const { images, hasMore } = await getImages(sort)
  const heroImage = images.length > 0 ? images[Math.floor(Math.random() * images.length)] : null

  after(async () => {
    try {
      const result = await maybeSync()
      if (result && result.imported > 0) revalidatePath("/")
    } catch (err) {
      console.log("[v0] background sync error:", err instanceof Error ? err.message : String(err))
    }
  })

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 md:px-8 md:pb-24 md:pt-14">
        <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card px-6 py-10 shadow-sm md:px-12 md:py-16">
          {heroImage?.blobUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroImage.blobUrl}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              className="pointer-events-none absolute inset-y-0 right-0 h-full w-full object-cover object-top opacity-30 [mask-image:linear-gradient(to_right,transparent_0%,black_70%)] md:w-3/5 md:opacity-100 md:[mask-image:linear-gradient(to_right,transparent_0%,black_55%)]"
            />
          ) : (
            <div className="pointer-events-none absolute right-0 top-0 size-48 rounded-bl-full bg-accent/30" aria-hidden="true" />
          )}
          <div className="relative max-w-3xl">
            <p className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-primary">
              <Sparkles className="size-4" aria-hidden="true" /> A living archive
            </p>
            <h1 className="max-w-2xl text-balance font-serif text-5xl font-semibold leading-[0.98] tracking-[-0.04em] md:text-7xl">
              A den for images worth keeping.
            </h1>
            <p className="mt-7 max-w-xl text-pretty text-base leading-7 text-muted-foreground md:text-lg">
              Emily&apos;s Den is a quietly growing collection of photographs, finds, and fragments gathered from a shared Drive.
            </p>
          </div>
          <div className="relative mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border/70 pt-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Images className="size-4 text-primary" aria-hidden="true" /> {images.length}{hasMore ? "+" : ""} images in view</span>
            <span>Updated as new finds arrive</span>
          </div>
        </section>

        <section className="mt-12" aria-labelledby="collection-heading">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">The collection</p>
              <h2 id="collection-heading" className="mt-2 font-serif text-3xl font-semibold tracking-tight md:text-4xl">Recent discoveries</h2>
            </div>
            {images.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <SortToggle current={sort} />
              </div>
            )}
          </div>

          {images.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border py-24 text-center">
              <span className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><ImageOff className="size-7" aria-hidden="true" /></span>
              <h2 className="font-serif text-2xl font-medium">The den is still quiet</h2>
              <p className="mt-3 max-w-sm text-pretty leading-6 text-muted-foreground">New images from the Drive folder will appear here after the first sync. Use “Sync now” to check for them.</p>
            </div>
          ) : (
            <GalleryGrid initialImages={images} initialHasMore={hasMore} sort={sort} />
          )}
        </section>
      </main>
    </div>
  )
}
