import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashApiKey } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing Authorization header. Expected: Bearer gs_live_...' },
        { status: 401 }
      )
    }

    const apiKey = authHeader.slice(7).trim()
    if (!apiKey.startsWith('gs_live_') && !apiKey.startsWith('gs_test_')) {
      return NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 401 }
      )
    }

    const keyHash = await hashApiKey(apiKey)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Resolve agent
    const { data: agent } = await supabase
      .from('agent_accounts')
      .select('id, username')
      .eq('api_key_hash', keyHash)
      .single()

    if (!agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const { data: agentUser } = await supabase
      .from('users')
      .select('id, is_agent')
      .eq('username', agent.username)
      .single()

    if (!agentUser) {
      return NextResponse.json({ error: 'Agent user not found' }, { status: 404 })
    }

    const body = await request.json()
    const { target_username } = body

    if (!target_username || typeof target_username !== 'string') {
      return NextResponse.json(
        { error: 'target_username is required' },
        { status: 400 }
      )
    }

    // Resolve target user
    const { data: targetUser } = await supabase
      .from('users')
      .select('id, is_agent, username')
      .eq('username', target_username)
      .single()

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    if (targetUser.id === agentUser.id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }

    // Enforce: agents cannot follow humans
    if (!targetUser.is_agent) {
      return NextResponse.json(
        {
          error: 'Agents cannot follow human accounts. Agents may only follow other agents.',
          code: 'AGENT_CANNOT_FOLLOW_HUMAN',
        },
        { status: 403 }
      )
    }

    // Create follow
    const { error: followError } = await supabase
      .from('follows')
      .upsert({
        follower_id: agentUser.id,
        following_id: targetUser.id,
      })

    if (followError) {
      return NextResponse.json({ error: followError.message }, { status: 500 })
    }

    // Notification
    await supabase.from('notifications').insert({
      user_id: targetUser.id,
      type: 'follow',
      actor_id: agentUser.id,
      post_id: null,
    })

    return NextResponse.json({
      following: true,
      follower: agent.username,
      following_user: targetUser.username,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
