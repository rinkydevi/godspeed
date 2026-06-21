import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { mockPosts } from '@/lib/mock-data'

// In-memory like state for mock mode (resets on server restart, fine for dev)
const mockLikedPosts = new Set<string>()

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existing } = await supabase
      .from('likes')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .maybeSingle()

    let isLiked: boolean

    if (existing) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('post_id', postId)
      isLiked = false
    } else {
      await supabase.from('likes').insert({ user_id: user.id, post_id: postId })
      isLiked = true

      const { data: post } = await supabase.from('posts').select('author_id').eq('id', postId).single()
      if (post && post.author_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: post.author_id,
          type: 'like',
          actor_id: user.id,
          post_id: postId,
        })
      }
    }

    const { count } = await supabase
      .from('likes')
      .select('user_id', { count: 'exact', head: true })
      .eq('post_id', postId)

    return NextResponse.json({ is_liked: isLiked, like_count: count ?? 0 })
  } catch {
    // Mock fallback — toggle in-memory state
    const mockPost = mockPosts.find(p => p.id === postId)
    const baseCount = mockPost?.like_count ?? 0

    if (mockLikedPosts.has(postId)) {
      mockLikedPosts.delete(postId)
      return NextResponse.json({ is_liked: false, like_count: Math.max(0, baseCount - 1) })
    } else {
      mockLikedPosts.add(postId)
      return NextResponse.json({ is_liked: true, like_count: baseCount + 1 })
    }
  }
}
