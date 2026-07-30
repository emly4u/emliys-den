import { put } from "@vercel/blob"
import { inArray, sql } from "drizzle-orm"
import { db } from "./db"
import { images } from "./db/schema"

// How often a background sync is allowed to run.
export const SYNC_INTERVAL_MINUTES = 30
// If a claimed run never released the lock (e.g. crash), allow reclaim after this long.
const STALE_LOCK_MINUTES = 10

// The public Google Drive folder to import images from.
export const DRIVE_FOLDER_ID = "1oSuvUT50dWZK3EvWYa1JtR8N5_DSQZKs"

type DriveFile = {
  id: string
  name: string
  mimeType: string
}

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder"

/**
 * Lists the direct children of a single Drive folder (images and subfolders),
 * following pagination. Used by the recursive walk below.
 */
async function listFolderChildren(folderId: string, apiKey: string): Promise<DriveFile[]> {
  const children: DriveFile[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false and (mimeType contains 'image/' or mimeType = '${FOLDER_MIME_TYPE}')`,
      key: apiKey,
      fields: "nextPageToken, files(id, name, mimeType)",
      pageSize: "1000",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    })
    if (pageToken) params.set("pageToken", pageToken)

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`)
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Drive list failed (${res.status}): ${text}`)
    }
    const data = (await res.json()) as { files?: DriveFile[]; nextPageToken?: string }
    if (data.files) children.push(...data.files)
    pageToken = data.nextPageToken
  } while (pageToken)

  return children
}

/**
 * Recursively lists all image files in the configured Drive folder and every
 * subfolder beneath it, using the Drive v3 API. Requires GOOGLE_API_KEY and the
 * root folder to be shared as "Anyone with the link".
 *
 * The Drive API has no "search descendants" operator, so we walk the folder
 * tree ourselves. A visited-set guards against cycles (shortcuts/aliases), and
 * file IDs are de-duplicated so an image reachable via two paths imports once.
 */
async function listDriveImages(apiKey: string): Promise<DriveFile[]> {
  const files: DriveFile[] = []
  const seenFileIds = new Set<string>()
  const visitedFolders = new Set<string>()
  const queue: string[] = [DRIVE_FOLDER_ID]

  while (queue.length > 0) {
    const folderId = queue.shift() as string
    if (visitedFolders.has(folderId)) continue
    visitedFolders.add(folderId)

    const children = await listFolderChildren(folderId, apiKey)
    for (const child of children) {
      if (child.mimeType === FOLDER_MIME_TYPE) {
        if (!visitedFolders.has(child.id)) queue.push(child.id)
      } else if (!seenFileIds.has(child.id)) {
        seenFileIds.add(child.id)
        files.push(child)
      }
    }
  }

  return files
}

async function downloadDriveFile(fileId: string, apiKey: string): Promise<ArrayBuffer> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}&supportsAllDrives=true`
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Drive download failed for ${fileId} (${res.status}): ${text}`)
  }
  return res.arrayBuffer()
}

export type SyncResult = {
  scanned: number
  imported: number
  skipped: number
  importedNames: string[]
  errors: string[]
}

/**
 * Imports NEW images from the Drive folder into Blob + the database.
 * Images already present (matched by drive_file_id) are skipped.
 */
export async function syncDriveImages(): Promise<SyncResult> {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not set")
  }

  const driveFiles = await listDriveImages(apiKey)
  const result: SyncResult = {
    scanned: driveFiles.length,
    imported: 0,
    skipped: 0,
    importedNames: [],
    errors: [],
  }

  if (driveFiles.length === 0) return result

  // Figure out which files already exist so we never re-import.
  const driveIds = driveFiles.map((f) => f.id)
  const existing = await db
    .select({ driveFileId: images.driveFileId })
    .from(images)
    .where(inArray(images.driveFileId, driveIds))
  const existingIds = new Set(existing.map((e) => e.driveFileId))

  const newFiles = driveFiles.filter((f) => !existingIds.has(f.id))
  result.skipped = driveFiles.length - newFiles.length

  for (const file of newFiles) {
    try {
      const buffer = await downloadDriveFile(file.id, apiKey)
      const blob = await put(`drive/${file.id}-${file.name}`, Buffer.from(buffer), {
        access: "public",
        contentType: file.mimeType,
        addRandomSuffix: false,
      })

      await db.insert(images).values({
        driveFileId: file.id,
        name: file.name,
        blobUrl: blob.url,
        contentType: file.mimeType,
      })

      result.imported += 1
      result.importedNames.push(file.name)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      result.errors.push(`${file.name}: ${message}`)
    }
  }

  return result
}

/**
 * Attempts to run a sync, but only if at least SYNC_INTERVAL_MINUTES have
 * passed since the last run. Uses a single atomic UPDATE to claim the run so
 * concurrent visitors can't trigger overlapping imports. This lets the
 * "every 30 minutes" behavior work on ANY Vercel plan (it's driven by traffic
 * rather than relying on a paid cron schedule).
 *
 * Returns the sync result if a run happened, or null if it was throttled.
 */
export async function maybeSync(): Promise<SyncResult | null> {
  if (!process.env.GOOGLE_API_KEY) return null

  // Atomically claim the run: only succeeds if enough time has passed and no
  // other run is currently in progress (or the previous one is stale).
  const claimed = await db.execute(sql`
    UPDATE sync_state
    SET running = true, last_run_at = now()
    WHERE id = 1
      AND (last_run_at IS NULL OR last_run_at < now() - (${SYNC_INTERVAL_MINUTES} || ' minutes')::interval)
      AND (running = false OR last_run_at < now() - (${STALE_LOCK_MINUTES} || ' minutes')::interval)
    RETURNING id
  `)

  const rows = (claimed as unknown as { rows?: unknown[] }).rows ?? (claimed as unknown as unknown[])
  const didClaim = Array.isArray(rows) ? rows.length > 0 : false
  if (!didClaim) return null

  try {
    return await syncDriveImages()
  } finally {
    // Release the lock; keep last_run_at set to the claim time so the next
    // eligible run is at least SYNC_INTERVAL_MINUTES away.
    await db.execute(sql`UPDATE sync_state SET running = false WHERE id = 1`)
  }
}
