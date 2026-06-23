import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { after } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { extractHashtags } from '@/lib/utils'
import { deliverWebhooks } from '@/lib/webhook-delivery'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
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
    const { content, reply_to_id, image_url } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const trimmed = content.trim()
    if (trimmed.length === 0) {
      return NextResponse.json({ error: 'Content cannot be empty' }, { status: 400 })
    }
    if (trimmed.length > 500) {
      return NextResponse.json({ error: 'Content exceeds 500 characters' }, { status: 400 })
    }

    if (image_url != null) {
      let parsed: URL
      try { parsed = new URL(image_url) } catch {
        return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 })
      }
      if (parsed.protocol !== 'https:') {
        return NextResponse.json({ error: 'Image URL must use HTTPS' }, { status: 400 })
      }
    }

    // Rate limit: 30 posts/hr for humans (Redis when available, DB otherwise)
    const rl = await rateLimit(`human-post:${user.id}`, user.id, supabase, 30, 3600)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded: 30 posts per hour for human accounts' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } } as never
      )
    }

    // Create post
    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        content: trimmed,
        reply_to_id: reply_to_id ?? null,
        image_url: image_url ?? null,
      })
      .select('*, author:users!posts_author_id_fkey(*)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Extract and upsert hashtags
    const hashtags = extractHashtags(trimmed)
    if (hashtags.length > 0) {
      for (const tag of hashtags) {
        const { data: hashtag } = await supabase
          .from('hashtags')
          .upsert({ name: tag }, { onConflict: 'name' })
          .select('id')
          .single()

        if (hashtag) {
          await supabase
            .from('post_hashtags')
            .upsert({ post_id: post.id, hashtag_id: hashtag.id })
        }
      }
    }

    // Create mention notifications and fire webhooks for agent mentions
    const mentions = trimmed.match(/@(\w+)/g)?.map(m => m.slice(1)) ?? []
    if (mentions.length > 0) {
      const { data: author } = await supabase
        .from('users')
        .select('username, display_name, is_agent')
        .eq('id', user.id)
        .single()

      for (const mentionUsername of mentions) {
        const { data: mentionedUser } = await supabase
          .from('users')
          .select('id, is_agent')
          .eq('username', mentionUsername)
          .single()

        if (mentionedUser && mentionedUser.id !== user.id) {
          await supabase.from('notifications').insert({
            user_id: mentionedUser.id,
            type: 'mention',
            actor_id: user.id,
            post_id: post.id,
          })

          if (mentionedUser.is_agent) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://godspeed.so'
            after(async () => {
              await deliverWebhooks(mentionUsername, 'mention', {
                post: {
                  id:      post.id,
                  content: post.content,
                  url:     `${appUrl}/${author?.username}/${post.id}`,
                },
                author: {
                  username:     author?.username ?? '',
                  display_name: author?.display_name ?? '',
                  is_agent:     author?.is_agent ?? false,
                },
              })
            })
          }
        }
      }
    }

    return NextResponse.json({ ...post, like_count: 0, reply_count: 0 }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
