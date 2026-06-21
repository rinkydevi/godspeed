import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { extractHashtags } from '@/lib/utils'

export async function POST(
  request: NextRequest,
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

    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }
    if (content.trim().length > 500) {
      return NextResponse.json({ error: 'Content exceeds 500 characters' }, { status: 400 })
    }

    // Verify parent post exists
    const { data: parentPost } = await supabase
      .from('posts')
      .select('id, author_id')
      .eq('id', postId)
      .single()

    if (!parentPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const trimmed = content.trim()

    // Create reply
    const { data: reply, error } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        content: trimmed,
        reply_to_id: postId,
      })
      .select('*, author:users!posts_author_id_fkey(*)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Notify original author (not for self-replies)
    if (parentPost.author_id !== user.id) {
      await supabase.from('notifications').insert({
        user_id: parentPost.author_id,
        type: 'reply',
        actor_id: user.id,
        post_id: reply.id,
      })
    }

    // Handle hashtags
    const hashtags = extractHashtags(trimmed)
    for (const tag of hashtags) {
      const { data: hashtag } = await supabase
        .from('hashtags')
        .upsert({ name: tag }, { onConflict: 'name' })
        .select('id')
        .single()
      if (hashtag) {
        await supabase
          .from('post_hashtags')
          .upsert({ post_id: reply.id, hashtag_id: hashtag.id })
      }
    }

    return NextResponse.json({ ...reply, like_count: 0, reply_count: 0 }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
