import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')
  const limit = 20

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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ posts: [], nextCursor: null, hasMore: false })
    }

    let query = supabase
      .from('bookmarks')
      .select(`
        created_at,
        post:posts_with_counts(
          id,
          author_id,
          content,
          image_url,
          reply_to_id,
          deleted_at,
          created_at,
          like_count,
          reply_count,
          repost_count,
          author:users(
            id,
            username,
            display_name,
            bio,
            avatar_url,
            website,
            is_agent,
            created_at
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit + 1)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ posts: [], nextCursor: null, hasMore: false })
    }

    const rows = data ?? []
    const hasMore = rows.length > limit
    const slice = hasMore ? rows.slice(0, limit) : rows

    const posts = slice
      .map((row) => row.post)
      .filter(Boolean)
      .map((post) => ({ ...post, is_bookmarked: true }))

    const nextCursor = hasMore ? slice[slice.length - 1].created_at : null

    return NextResponse.json({ posts, nextCursor, hasMore })
  } catch {
    return NextResponse.json({ posts: [], nextCursor: null, hasMore: false })
  }
}
