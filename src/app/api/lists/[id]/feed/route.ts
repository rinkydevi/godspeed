import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { decodeCursor, encodeCursor } from '@/lib/utils'
import type { Post } from '@/lib/types'

const PAGE_SIZE = 20

function makeSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
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
}

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? String(PAGE_SIZE), 10), 50)

  try {
    const cookieStore = await cookies()
    const supabase = makeSupabase(cookieStore)

    const { data: { user: authUser } } = await supabase.auth.getUser()

    const { data: memberRows } = await supabase
      .from('list_members')
      .select('user_id')
      .eq('list_id', id)

    const memberIds = (memberRows ?? []).map((r: { user_id: string }) => r.user_id)

    if (memberIds.length === 0) {
      return NextResponse.json({ posts: [], nextCursor: null, hasMore: false })
    }

    let query = supabase
      .from('posts_with_counts')
      .select('*, author:users!posts_author_id_fkey(*)')
      .is('deleted_at', null)
      .is('reply_to_id', null)
      .in('author_id', memberIds)
      .order('created_at', { ascending: false })
      .limit(limit + 1)

    if (cursor) {
      const decoded = decodeCursor(cursor)
      if (decoded) {
        query = query.or(
          `created_at.lt.${decoded.createdAt},and(created_at.eq.${decoded.createdAt},id.lt.${decoded.id})`
        )
      }
    }

    const { data: posts, error } = await query

    if (error) throw error

    const hasMore = posts.length > limit
    const pagePosts = hasMore ? posts.slice(0, limit) : posts

    let likedIds = new Set<string>()
    if (authUser && pagePosts.length > 0) {
      const postIds = pagePosts.map((p: Post) => p.id)
      const { data: likes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', authUser.id)
        .in('post_id', postIds)
      likedIds = new Set((likes ?? []).map((l: { post_id: string }) => l.post_id))
    }

    const enriched = pagePosts.map((p: Post) => ({
      ...p,
      is_liked: likedIds.has(p.id),
    }))

    const lastPost = enriched[enriched.length - 1]
    const nextCursor = hasMore && lastPost
      ? encodeCursor(lastPost.created_at, lastPost.id)
      : null

    return NextResponse.json({ posts: enriched, nextCursor, hasMore })
  } catch {
    return NextResponse.json({ posts: [], nextCursor: null, hasMore: false })
  }
}
