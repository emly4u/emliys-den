import { getImage } from "@/lib/queries"

export const dynamic = "force-dynamic"

// Same-origin image bytes so client code can copy the image to the clipboard
// (browsers block fetch() of the cross-origin Drive URLs due to CORS).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const imageId = Number(id)
  if (!Number.isInteger(imageId)) return new Response("Not found", { status: 404 })

  const image = await getImage(imageId)
  if (!image) return new Response("Not found", { status: 404 })

  const fileId = encodeURIComponent(image.driveFileId)
  const sources = [
    `https://lh3.googleusercontent.com/d/${fileId}=w2000`,
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
  ]

  for (const source of sources) {
    const upstream = await fetch(source)
    const contentType = upstream.headers.get("content-type") ?? ""
    if (upstream.ok && contentType.startsWith("image/")) {
      return new Response(upstream.body, {
        headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=86400" },
      })
    }
  }

  return new Response("Image unavailable", { status: 502 })
}
