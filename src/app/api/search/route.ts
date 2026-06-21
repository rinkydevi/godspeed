import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { mockPosts, mockUsers, mockHashtags } from '@/lib/mock-data'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const type = searchParams.get('type') ?? 'all'

  if (!q) {
    return NextResponse.json({ posts: [], users: [], hashtags: [] })
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
      posts: [],
      users: [],
      hashtags: [],
    }

    // Strip leading # for hashtag search
    const cleanQ = q.startsWith('#') ? q.slice(1) : q
    const searchTerm = `%${cleanQ}%`

    if (type === 'posts' || type === 'all') {
      const { data } = await supabase
        .from('posts_with_counts')
        .select('*, author:users!posts_author_id_fkey(*)')
        .ilike('content', searchTerm)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(20)
      results.posts = data ?? []
    }

    if (type === 'users' || type === 'all') {
      const { data } = await supabase
        .from('users')
        .select('*')
        .or(`username.ilike.${searchTerm},display_name.ilike.${searchTerm},bio.ilike.${searchTerm}`)
        .order('created_at', { ascending: false })
        .limit(20)
      results.users = data ?? []
    }

    if (type === 'tags' || type === 'all') {
      const { data } = await supabase
        .from('hashtags')
        .select('name, post_count')
        .ilike('name', searchTerm)
        .order('post_count', { ascending: false })
        .limit(20)
      results.hashtags = data ?? []
    }

    return NextResponse.json(results)
  } catch {
    // Mock fallback
    const lq = q.toLowerCase().replace(/^#/, '')

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
