import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://godspeed.so'
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/api/feed', '/api/search', '/u/', '/llms.txt'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
