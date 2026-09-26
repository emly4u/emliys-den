import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core"

export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  driveFileId: text("drive_file_id").notNull().unique(),
  name: text("name").notNull(),
  // Thumbnail URL only; full-resolution media remains in Google Drive.
  // Public thumbnail URL; full-resolution media remains in Google Drive.
  blobUrl: text("blob_url"),
  contentType: text("content_type"),
  views: integer("views").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  imageId: integer("image_id").notNull(),
  author: text("author"),
  body: text("body").notNull(),
  upvotes: integer("upvotes").notNull().default(0),
  downvotes: integer("downvotes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// Single-row table used to throttle background syncs so the 30-minute
// import works on any Vercel plan (not just plans with frequent cron).
export const syncState = pgTable("sync_state", {
  id: integer("id").primaryKey().default(1),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  running: boolean("running").notNull().default(false),
})

export type ImageRow = typeof images.$inferSelect
export type CommentRow = typeof comments.$inferSelect
