import type { MetadataRoute } from 'next'
import { getSitemapImages } from '@/lib/queries'

const baseUrl = 'https://emly4u.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const images = await getSitemapImages()

  const imageRoutes: MetadataRoute.Sitemap = images.map((image) => ({
    url: `${baseUrl}/image/${image.id}`,
    lastModified: image.createdAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...imageRoutes,
  ]
}
