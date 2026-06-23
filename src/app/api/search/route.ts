import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { mockPosts, mockUsers, mockHashtags } from '@/lib/mock-data'
import { rateLimitIP } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q    = searchParams.get('q')?.trim() ?? ''
  const type = searchParams.get('type') ?? 'all'

  if (!q) {
    return NextResponse.json({ posts: [], users: [], hashtags: [] })
  }

  // 20 searches/min per IP (no-op when Upstash not configured)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anon'
  const rl = await rateLimitIP(`search:${ip}`, 20, 60)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many search requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const results: { posts: unknown[]; users: unknown[]; hashtags: unknown[] } = {
      posts: [], users: [], hashtags: [],
    }

    const cleanQ      = q.startsWith('#') ? q.slice(1) : q
    const trigram     = `%${cleanQ}%`

    if (type === 'posts' || type === 'all') {
      // Full-text search first (stemming, phrase support, negation via websearch syntax)
      const { data: ftsPosts } = await supabase
        .from('posts_with_counts')
        .select('*, author:users!posts_author_id_fkey(*)')
        .textSearch('content', cleanQ, { type: 'websearch', config: 'english' })
        .is('deleted_at', null)
        .limit(20)

      if (ftsPosts && ftsPosts.length > 0) {
        results.posts = ftsPosts
      } else {
        // Fallback: trigram ilike (catches partial words, typos)
        const { data: ilikePosts } = await supabase
          .from('posts_with_counts')
          .select('*, author:users!posts_author_id_fkey(*)')
          .ilike('content', trigram)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(20)
        results.posts = ilikePosts ?? []
      }
    }

    if (type === 'users' || type === 'all') {
      // Trigram ilike — uses gin_trgm_ops indexes on username, display_name, bio
      const { data } = await supabase
        .from('users')
        .select('*')
        .or(`username.ilike.${trigram},display_name.ilike.${trigram},bio.ilike.${trigram}`)
        .order('created_at', { ascending: false })
        .limit(20)
      results.users = data ?? []
    }

    if (type === 'tags' || type === 'all') {
      const { data } = await supabase
        .from('hashtags')
        .select('name, post_count')
        .ilike('name', trigram)
        .order('post_count', { ascending: false })
        .limit(20)
      results.hashtags = data ?? []
    }

    return NextResponse.json(results)
  } catch {
    const lq = cleanQ(q).toLowerCase()

    const posts = mockPosts
      .filter(p => p.content.toLowerCase().includes(lq))
      .slice(0, 20)

    const users = mockUsers
      .filter(u =>
        u.username.toLowerCase().includes(lq) ||
        u.display_name.toLowerCase().includes(lq) ||
        u.bio?.toLowerCase().includes(lq)
      )
      .slice(0, 20)

    const hashtags = mockHashtags
      .filter(h => h.name.toLowerCase().includes(lq))
      .slice(0, 20)

    return NextResponse.json({ posts, users, hashtags })
  }
}

function cleanQ(q: string) {
  return q.replace(/^#/, '')
}
