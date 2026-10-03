import { cache } from "react"
import { desc, eq, sql } from "drizzle-orm"
import { db } from "./db"
import { comments, images } from "./db/schema"
import type { CommentRow, ImageRow } from "./db/schema"
import { IMAGES_PAGE_SIZE } from "./images"
import type { ImageSort, ImagesPage, ImageWithCount } from "./images"

// Re-exported for server-side callers that import these from lib/queries.
export { IMAGES_PAGE_SIZE }
export type { ImageSort, ImagesPage, ImageWithCount }

export async function getImages(
  sort: ImageSort = "new",
  { limit = IMAGES_PAGE_SIZE, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<ImagesPage> {
  const orderBy =
    sort === "popular"
      ? [desc(images.views), desc(images.createdAt)]
      : [desc(images.createdAt)]

  // Fetch one extra row to detect whether another page exists.
  const rows = await db
    .select({
      id: images.id,
      driveFileId: images.driveFileId,
      name: images.name,
      blobUrl: images.blobUrl,
      contentType: images.contentType,
      views: images.views,
      createdAt: images.createdAt,
      commentCount: sql<number>`count(${comments.id})::int`,
    })
    .from(images)
    .leftJoin(comments, eq(comments.imageId, images.id))
    .groupBy(images.id)
    .orderBy(...orderBy)
    .limit(limit + 1)
    .offset(offset)

  const hasMore = rows.length > limit
  return { images: hasMore ? rows.slice(0, limit) : rows, hasMore }
}

/** One uniformly random image from the whole table, independent of sort and paging. */
export async function getRandomImage(): Promise<ImageRow | undefined> {
  const rows = await db.select().from(images).orderBy(sql`random()`).limit(1)
  return rows[0]
}

export async function getSitemapImages(): Promise<{ id: number; driveFileId: string; createdAt: Date }[]> {
  return db
    .select({ id: images.id, driveFileId: images.driveFileId, createdAt: images.createdAt })
    .from(images)
    .orderBy(desc(images.createdAt))
    // A single sitemap file is capped at 50,000 URLs by the spec. Bound the
    // query so an oversized table can never produce an invalid sitemap.
    .limit(50000)
}

export const getImage = cache(async (id: number): Promise<ImageRow | undefined> => {
  const rows = await db.select().from(images).where(eq(images.id, id)).limit(1)
  return rows[0]
})

export async function getComments(imageId: number): Promise<CommentRow[]> {
  return db
    .select()
    .from(comments)
    .where(eq(comments.imageId, imageId))
    .orderBy(desc(sql`${comments.upvotes} - ${comments.downvotes}`), desc(comments.createdAt))
}
