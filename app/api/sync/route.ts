import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { syncDriveImages } from "@/lib/sync"

export const dynamic = "force-dynamic"
export const maxDuration = 60

async function runSync() {
  const result = await syncDriveImages()
  if (result.imported > 0) {
    revalidatePath("/")
    revalidatePath("/sitemap.xml")
  }
  return result
}

// Triggered by the Vercel cron every 30 minutes (GET).
export async function GET(request: Request) {
  // If a CRON_SECRET is configured, require it for cron-triggered runs.
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get("authorization")
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const result = await runSync()
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Manual trigger from the UI (POST).
export async function POST() {
  try {
    const result = await runSync()
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
