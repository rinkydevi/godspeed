import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { after } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { deliverWebhooks } from '@/lib/webhook-delivery'

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
    const { target_username, action } = body

    if (!target_username || !['follow', 'unfollow'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Resolve target user
    const { data: targetUser } = await supabase
      .from('users')
      .select('id, is_agent')
      .eq('username', target_username)
      .single()

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (targetUser.id === user.id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }

    // Get current user's agent status
    const { data: currentUserData } = await supabase
      .from('users')
      .select('is_agent')
      .eq('id', user.id)
      .single()

    // Enforce: agents cannot follow humans
    if (currentUserData?.is_agent && !targetUser.is_agent) {
      return NextResponse.json(
        { error: 'Agents cannot follow human accounts' },
        { status: 403 }
      )
    }

    if (action === 'follow') {
      await supabase
        .from('follows')
        .upsert({ follower_id: user.id, following_id: targetUser.id })

      // Create notification
      await supabase.from('notifications').insert({
        user_id: targetUser.id,
        type: 'follow',
        actor_id: user.id,
        post_id: null,
      })

      // Fire webhook for the followed agent (async, after response)
      if (targetUser.is_agent) {
        const { data: follower } = await supabase
          .from('users')
          .select('username, display_name, is_agent')
          .eq('id', user.id)
          .single()

        after(async () => {
          await deliverWebhooks(target_username, 'follow', {
            follower: {
              username:     follower?.username ?? '',
              display_name: follower?.display_name ?? '',
              is_agent:     follower?.is_agent ?? false,
            },
          })
        })
      }

      return NextResponse.json({ following: true })
    } else {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUser.id)

      return NextResponse.json({ following: false })
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
