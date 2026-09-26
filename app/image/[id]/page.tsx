import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { after } from "next/server"
import { ArrowLeft, Download, Eye } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { CopyLink } from "@/components/copy-link"
import { CommentSection } from "@/components/comment-section"
import { buttonVariants } from "@/components/ui/button"
import { incrementView } from "@/app/actions/gallery"
import { getComments, getImage } from "@/lib/queries"

export const dynamic = "force-dynamic"

// Shared promo tags/handle embedded in every image's metadata for indexing.
const TAGS = [
  "emly4u",
  "emly_kate",
  "emily_kate",
  "emily4u",
  "just_emly4u",
  "just_emily4u",
  "justemily4u",
  "justemly4u",
  "Emily Kate",
  "Emly Kate",
  "Hot Emily Kate",
  "Cute Emily Kate",
  "Goth Girl Emily",
  "AI wife",
]
const X_HANDLE = "@just_emly4u"
const X_URL = "https://x.com/just_emly4u"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const imageId = Number(id)
  if (!Number.isInteger(imageId)) return { title: "Image — Emily's Den" }

  const image = await getImage(imageId)
  if (!image) return { title: "Image not found — Emily's Den" }

  const title = `${image.name} — Emily's Den`
  const description = `${image.name} · #emly4u #Emily Kate #just_emly4u · ${X_URL}`
  const url = `/image/${imageId}`

  return {
    title,
    description,
    keywords: [...TAGS, image.name],
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      siteName: "Emily's Den",
      images: [{ url: image.blobUrl, alt: image.name }],
    },
    twitter: {
      card: "summary_large_image",
      site: X_HANDLE,
      creator: X_HANDLE,
      title,
      description,
      images: [image.blobUrl],
    },
    other: {
      "twitter:url": X_URL,
    },
  }
}

export default async function ImagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const imageId = Number(id)
  if (!Number.isInteger(imageId)) notFound()

  const image = await getImage(imageId)
  if (!image) notFound()

  // Count this open as a view, after the response is sent so it never blocks render.
  after(async () => {
    try {
      await incrementView(imageId)
    } catch (err) {
      console.log("[v0] view increment error:", err instanceof Error ? err.message : String(err))
    }
  })

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to gallery
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-4">
            <a
              href={`https://drive.google.com/file/d/${image.driveFileId}/view`}
              target="_blank"
              rel="noopener noreferrer"
              className="group overflow-hidden rounded-2xl border border-border/60 bg-card"
              aria-label={`Open ${image.name} in Google Drive`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.blobUrl || "/placeholder.svg"}
                alt={image.name}
                className="max-h-[70vh] w-full object-contain transition-opacity group-hover:opacity-90"
              />
            </a>
            <div className="flex flex-wrap items-center gap-3">
              <CopyLink url={`https://drive.google.com/file/d/${image.driveFileId}/view`} />
              <a
                href={`https://drive.google.com/file/d/${image.driveFileId}/view`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", className: "gap-2" })}
              >
                <Download className="size-4" aria-hidden="true" />
                Open in Drive
              </a>
            </div>
            <div>
              <h1 className="text-balance font-serif text-2xl font-semibold tracking-tight">
                {image.name}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span>
                  Added {new Date(image.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Eye className="size-4" aria-hidden="true" />
                  {image.views.toLocaleString()} {image.views === 1 ? "view" : "views"}
                </span>
              </p>
            </div>
          </div>

          <Suspense fallback={<CommentsLoading />}>
            <CommentsPanel imageId={imageId} />
          </Suspense>
        </div>
      </main>
    </div>
  )
}

async function CommentsPanel({ imageId }: { imageId: number }) {
  const comments = await getComments(imageId)
  return <CommentSection imageId={imageId} initialComments={comments} />
}

function CommentsLoading() {
  return (
    <aside className="flex min-h-64 items-center justify-center rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground" aria-busy="true">
      Loading conversation…
    </aside>
  )
}
