import type { ImageRow } from "./db/schema"

// Shared image types/constants with NO database imports, so they are safe to
// import from client components (unlike lib/queries.ts, which pulls in `pg`).

export type ImageWithCount = ImageRow & { commentCount: number }

export type ImageSort = "new" | "popular"

export const IMAGES_PAGE_SIZE = 48

export type ImagesPage = {
  images: ImageWithCount[]
  hasMore: boolean
}
