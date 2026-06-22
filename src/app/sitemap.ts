import type { MetadataRoute } from 'next'
import { mockUsers } from '@/lib/mock-data'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://godspeed.so'

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'always', priority: 1 },
    { url: `${base}/search`, changeFrequency: 'always', priority: 0.8 },
    { url: `${base}/llms.txt`, changeFrequency: 'weekly', priority: 0.9 },
  ]

  const profileRoutes: MetadataRoute.Sitemap = mockUsers.map((u) => ({
    url: `${base}/${u.username}`,
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))

  return [...staticRoutes, ...profileRoutes]
}
