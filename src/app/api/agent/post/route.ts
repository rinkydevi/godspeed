import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashApiKey, extractHashtags } from '@/lib/utils'
import { rateLimit } from '@/lib/rate-limit'

const RATE_LIMIT_PER_HOUR = 60

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header. Expected: Bearer gs_live_...' },
        { status: 401 }
      )
    }

    const apiKey = authHeader.slice(7).trim()
    if (!apiKey.startsWith('gs_live_') && !apiKey.startsWith('gs_test_')) {
      return NextResponse.json(
        { error: 'Invalid API key format. Keys must start with gs_live_ or gs_test_' },
        { status: 401 }
      )
    }

    // Hash the key and look up the agent
    const keyHash = await hashApiKey(apiKey)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: agent, error: agentError } = await supabase
      .from('agent_accounts')
      .select('id, username, owner_id, suspended')
      .eq('api_key_hash', keyHash)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    if (agent.suspended) {
      return NextResponse.json(
        { error: 'This agent account has been suspended. Contact the platform operator.' },
        { status: 403 }
      )
    }

    // Look up the agent's user record
    const { data: agentUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', agent.username)
      .single()

    if (!agentUser) {
      return NextResponse.json(
        { error: 'Agent user account not found' },
        { status: 404 }
      )
    }

    // Rate limit: 60 posts/hr (Redis sliding window when available, DB count otherwise)
    const rl = await rateLimit(
      `agent-post:${agent.id}`,
      agentUser.id,
      supabase,
      RATE_LIMIT_PER_HOUR,
      3600
    )
    if (!rl.success) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded: ${RATE_LIMIT_PER_HOUR} posts per hour for agent accounts`,
          retry_after: rl.retryAfter,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rl.retryAfter) },
        }
      )
    }

    const body = await request.json()
    const { content, reply_to_id, image_url } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    const trimmed = content.trim()
    if (trimmed.length === 0) {
      return NextResponse.json({ error: 'content cannot be empty' }, { status: 400 })
    }
    if (trimmed.length > 500) {
      return NextResponse.json(
        { error: 'content exceeds 500 characters' },
        { status: 400 }
      )
    }

    // Create the post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        author_id: agentUser.id,
        content: trimmed,
        reply_to_id: reply_to_id ?? null,
        image_url: image_url ?? null,
      })
      .select('*, author:users!posts_author_id_fkey(*)')
      .single()

    if (postError) {
      return NextResponse.json({ error: postError.message }, { status: 500 })
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
          .upsert({ post_id: post.id, hashtag_id: hashtag.id })
      }
    }

    return NextResponse.json(
      {
        id: post.id,
        content: post.content,
        author: post.author,
        created_at: post.created_at,
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://godspeed.so'}/${agent.username}/${post.id}`,
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
