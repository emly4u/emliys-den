import type { MetadataRoute } from 'next'

const baseUrl = 'https://emly4u.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: [`${baseUrl}/sitemap.xml`, `${baseUrl}/sitemap2.xml`],
    host: baseUrl,
  }
}
