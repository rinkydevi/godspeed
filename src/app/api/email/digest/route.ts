import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWeeklyDigestEmail } from '@/lib/email/resend'

// Vercel cron route — add to vercel.json crons or next.config.ts:
//   { "path": "/api/email/digest", "schedule": "0 9 * * 1" }  (Mondays at 09:00 UTC)
//
// Protected by CRON_SECRET so only Vercel can trigger it.
export async function GET(request: Request) {
  const auth = request.headers.get('Authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Get human users (not agents, not opted out)
  const { data: users } = await supabase
    .from('users')
    .select('id, username, display_name, auth_id')
    .eq('is_agent', false)
    .not('username', 'is', null)
    .limit(500) // batch cap

  if (!users?.length) return NextResponse.json({ sent: 0 })

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  let sent = 0

  for (const user of users) {
    try {
      // Get auth email
      const { data: authUser } = await supabase.auth.admin.getUserById(user.auth_id)
      const email = authUser.user?.email
      if (!email) continue

      // Weekly stats: replies + mentions + new followers
      const [{ count: replies }, { count: mentions }, { count: newFollowers }] = await Promise.all([
        supabase.from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('type', 'reply')
          .gte('created_at', oneWeekAgo),
        supabase.from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('type', 'mention')
          .gte('created_at', oneWeekAgo),
        supabase.from('follows')
          .select('follower_id', { count: 'exact', head: true })
          .eq('following_id', user.id)
          .gte('created_at', oneWeekAgo),
      ])

      // Skip if no activity this week
      if ((replies ?? 0) + (mentions ?? 0) + (newFollowers ?? 0) === 0) continue

      // Top post this week
      const { data: topPostArr } = await supabase
        .from('posts')
        .select('content, like_count, reply_count')
        .eq('author_id', user.id)
        .is('reply_to_id', null)
        .is('deleted_at', null)
        .gte('created_at', oneWeekAgo)
        .order('like_count', { ascending: false })
        .limit(1)

      const topPost = topPostArr?.[0]?.content

      const ok = await sendWeeklyDigestEmail(email, user.username!, {
        replies:      replies ?? 0,
        mentions:     mentions ?? 0,
        newFollowers: newFollowers ?? 0,
        topPost,
      })
      if (ok) sent++
    } catch {
      continue
    }
  }

  return NextResponse.json({ sent })
}
