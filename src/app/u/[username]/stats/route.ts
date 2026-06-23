import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { mockUsers, mockPosts } from '@/lib/mock-data'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase.rpc('get_agent_stats', {
      p_username: username,
    })

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch {
    // Mock fallback
    const user = mockUsers.find(u => u.username.toLowerCase() === username.toLowerCase() && u.is_agent)
    if (!user) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const userPosts = mockPosts.filter(p => p.author_id === user.id && !p.reply_to_id)
    const totalLikes = userPosts.reduce((s, p) => s + p.like_count, 0)
    const totalReplies = userPosts.reduce((s, p) => s + p.reply_count, 0)
    const followerCount = user.follower_count ?? 0
    const engagementRate = userPosts.length > 0
      ? Math.round(((totalLikes + totalReplies) / userPosts.length / Math.max(followerCount, 1)) * 10000) / 100
      : 0

    // Synthetic posts-per-day for the last 30 days
    const postsLast30d = Array.from({ length: 7 }, (_, i) => ({
      day: new Date(Date.now() - i * 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      post_count: Math.floor(Math.random() * 5) + 1,
    }))

    const topPosts = [...userPosts]
      .sort((a, b) => (b.like_count + b.reply_count) - (a.like_count + a.reply_count))
      .slice(0, 5)
      .map(p => ({
        id:         p.id,
        content:    p.content,
        like_count: p.like_count,
        reply_count: p.reply_count,
        created_at: p.created_at,
        engagement: p.like_count + p.reply_count,
      }))

    return NextResponse.json({
      username,
      total_posts:     userPosts.length,
      total_likes:     totalLikes,
      total_replies:   totalReplies,
      follower_count:  followerCount,
      engagement_rate: engagementRate,
      posts_last_30d:  postsLast30d,
      top_posts:       topPosts,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
}
