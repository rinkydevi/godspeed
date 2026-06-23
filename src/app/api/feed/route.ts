import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { mockPosts } from '@/lib/mock-data'
import { decodeCursor, encodeCursor } from '@/lib/utils'
import { rateLimitIP } from '@/lib/rate-limit'
import type { Post } from '@/lib/types'

const PAGE_SIZE = 20

export async function GET(request: NextRequest) {
  // 60 feed requests/min per IP — blocks scrapers, allows agent polling
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anon'
  const rl = await rateLimitIP(`feed:${ip}`, 60, 60)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)
  const author = searchParams.get('author')
  const agentsOnly = searchParams.get('agents_only') === 'true'
  const repliesOnly = searchParams.get('replies_only') === 'true'
  const followingOnly = searchParams.get('following') === 'true'

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

    // Get current user for is_liked
    const { data: { user: authUser } } = await supabase.auth.getUser()

    let query = supabase
      .from('posts_with_counts')
      .select('*, author:users!posts_author_id_fkey(*)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit + 1)

    // Cursor pagination (keyset)
    if (cursor) {
      const decoded = decodeCursor(cursor)
      if (decoded) {
        query = query.or(
          `created_at.lt.${decoded.createdAt},and(created_at.eq.${decoded.createdAt},id.lt.${decoded.id})`
        )
      }
    }

    // Replies vs threads filter
    if (repliesOnly) {
      query = query.not('reply_to_id', 'is', null)
    } else {
      query = query.is('reply_to_id', null)
    }

    // Author filter
    if (author) {
      const { data: authorUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', author)
        .single()
      if (authorUser) {
        query = query.eq('author_id', authorUser.id)
      }
    }

    // Agents-only filter: resolve agent user IDs first, then apply an IN filter.
    // Filtering on embedded resource columns (.eq('author.is_agent', ...)) is not
    // supported by PostgREST — it silently no-ops and returns all posts.
    if (agentsOnly) {
      const { data: agentUsers } = await supabase
        .from('users')
        .select('id')
        .eq('is_agent', true)
      const agentIds = (agentUsers ?? []).map((u: { id: string }) => u.id)
      if (agentIds.length === 0) {
        return NextResponse.json({ posts: [], nextCursor: null, hasMore: false })
      }
      query = query.in('author_id', agentIds)
    }

    // Following feed: only posts from users the current user follows
    if (followingOnly && authUser) {
      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', authUser.id)
        .single()
      if (userRow) {
        const { data: followed } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userRow.id)
        const followedIds = (followed ?? []).map((f: { following_id: string }) => f.following_id)
        if (followedIds.length === 0) {
          return NextResponse.json({ posts: [], nextCursor: null, hasMore: false })
        }
        query = query.in('author_id', followedIds)
      }
    }

    const { data: posts, error } = await query

    if (error) throw error

    const hasMore = posts.length > limit
    const pagePosts = hasMore ? posts.slice(0, limit) : posts

    // Fetch liked and bookmarked post ids for current user
    let likedIds = new Set<string>()
    let bookmarkedIds = new Set<string>()
    if (authUser && pagePosts.length > 0) {
      const postIds = pagePosts.map((p: Post) => p.id)
      const [{ data: likes }, { data: bookmarks }] = await Promise.all([
        supabase.from('likes').select('post_id').eq('user_id', authUser.id).in('post_id', postIds),
        supabase.from('bookmarks').select('post_id').eq('user_id', authUser.id).in('post_id', postIds),
      ])
      likedIds = new Set((likes ?? []).map((l: { post_id: string }) => l.post_id))
      bookmarkedIds = new Set((bookmarks ?? []).map((b: { post_id: string }) => b.post_id))
    }

    const enriched = pagePosts.map((p: Post) => ({
      ...p,
      is_liked: likedIds.has(p.id),
      is_bookmarked: bookmarkedIds.has(p.id),
    }))

    const lastPost = enriched[enriched.length - 1]
    const nextCursor = hasMore && lastPost
      ? encodeCursor(lastPost.created_at, lastPost.id)
      : null

    return NextResponse.json({
      posts: enriched,
      nextCursor,
      hasMore,
    })
  } catch {
    // DB not connected — return mock data
    let filtered = [...mockPosts].filter(p => repliesOnly ? p.reply_to_id !== null : p.reply_to_id === null)
    if (author) {
      filtered = filtered.filter(p => p.author.username.toLowerCase() === author.toLowerCase())
    }
    if (agentsOnly) {
      filtered = filtered.filter(p => p.author.is_agent)
    }

    let startIndex = 0
    if (cursor) {
      const decoded = decodeCursor(cursor)
      if (decoded) {
        const idx = filtered.findIndex(p => p.id === decoded.id)
        startIndex = idx >= 0 ? idx + 1 : 0
      }
    }

    const page = filtered.slice(startIndex, startIndex + limit)
    const hasMore = startIndex + limit < filtered.length
    const lastPost = page[page.length - 1]
    const nextCursor = hasMore && lastPost
      ? encodeCursor(lastPost.created_at, lastPost.id)
      : null

    return NextResponse.json({ posts: page, nextCursor, hasMore })
  }
}
