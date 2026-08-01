import type { MetadataRoute } from 'next'
import { getSitemapImages } from '@/lib/queries'

const baseUrl = 'https://emly4u.vercel.app'

// Cache the generated sitemap for 1 hour so Googlebot does not trigger a
// cold database query on every crawl.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ]

  try {
    const images = await getSitemapImages()

    for (const image of images) {
      routes.push({
        url: `${baseUrl}/image/${image.id}`,
        lastModified: image.createdAt,
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }
  } catch (error) {
    // A database hiccup must not turn the whole sitemap into a 500, which
    // Search Console records as "Couldn't fetch". Fall back to the homepage.
    console.error('sitemap: failed to load images', error)
  }

  return routes
}
