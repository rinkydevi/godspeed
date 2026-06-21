import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Post } from '@/lib/types'

export async function GET(
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

    const { data: { user: authUser } } = await supabase.auth.getUser()

    const { data: post, error } = await supabase
      .from('posts_with_counts')
      .select('*, author:users!posts_author_id_fkey(*)')
      .eq('id', postId)
      .single()

    if (error || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const { data: replies } = await supabase
      .from('posts_with_counts')
      .select('*, author:users!posts_author_id_fkey(*)')
      .eq('reply_to_id', postId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    let isLiked = false
    if (authUser) {
      const { data: like } = await supabase
        .from('likes')
        .select('user_id')
        .eq('user_id', authUser.id)
        .eq('post_id', postId)
        .maybeSingle()
      isLiked = !!like
    }

    return NextResponse.json({
      ...post,
      is_liked: isLiked,
      replies: replies ?? [],
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
