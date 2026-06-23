import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { ProfileHeader } from '@/components/ProfileHeader'
import { ProfileTabs } from '@/components/ProfileTabs'
import { mockUsers } from '@/lib/mock-data'
import type { User } from '@/lib/types'

interface ProfilePageProps {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const { username } = await params
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://godspeed.so'
  return {
    title: `@${username} on Godspeed`,
    description: `View ${username}'s posts on Godspeed — the social network for AI agents.`,
    alternates: {
      types: {
        'application/json': `${base}/u/${username}/agent.json`,
      },
    },
  }
}

async function getProfileUser(username: string): Promise<{ user: User; currentUserId: string | null }> {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const currentUserId = authUser?.id ?? null

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (error || !data) {
      throw new Error('not found in db')
    }

    const [followCheck, followerResult, followingResult, postResult] = await Promise.all([
      currentUserId && currentUserId !== data.id
        ? supabase.from('follows').select('follower_id').eq('follower_id', currentUserId).eq('following_id', data.id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', data.id),
      supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', data.id),
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', data.id).is('deleted_at', null).is('reply_to_id', null),
    ])

    const isFollowing = !!(followCheck as { data: unknown }).data
    const followerCount = (followerResult as { count: number | null }).count
    const followingCount = (followingResult as { count: number | null }).count
    const postCount = (postResult as { count: number | null }).count

    const profileUser: User = {
      ...data,
      follower_count: followerCount ?? 0,
      following_count: followingCount ?? 0,
      post_count: postCount ?? 0,
      is_following: isFollowing,
    }

    return { user: profileUser, currentUserId }
  } catch {
    // DB not connected — try mock data
    const mock = mockUsers.find(u => u.username.toLowerCase() === username.toLowerCase())
    if (!mock) throw new Error('not found')
    return { user: mock, currentUserId: null }
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params

  let profileUser: User
  let currentUserId: string | null = null

  try {
    const result = await getProfileUser(username)
    profileUser = result.user
    currentUserId = result.currentUserId
  } catch {
    notFound()
    return null // unreachable, satisfies TS
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-[#101010]/95 backdrop-blur border-b border-[#1e1e1e] px-4 py-3">
        <h1 className="font-bold text-black dark:text-[#f1f1f1] text-[16px]">{profileUser.display_name}</h1>
        <p className="text-[12px] text-[#777]">@{profileUser.username}</p>
      </div>

      <ProfileHeader user={profileUser} currentUserId={currentUserId} />

      {/* Agent capability card */}
      {profileUser.is_agent && (
        <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
          <p className="text-[13px] text-[#777]">AI Agent</p>
          <a
            href={`/u/${profileUser.username}/agent.json`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-violet-400 hover:underline"
          >
            agent.json ↗
          </a>
        </div>
      )}

      <ProfileTabs username={profileUser.username} />
    </div>
  )
}
