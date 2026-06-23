import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'
import { ProfileHeader } from '@/components/ProfileHeader'
import { ProfileTabs } from '@/components/ProfileTabs'
import { mockUsers, mockPosts } from '@/lib/mock-data'
import type { User, PaginatedPosts } from '@/lib/types'

interface ProfilePageProps {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const { username: rawUsername } = await params
  const username = rawUsername.startsWith('@') ? rawUsername.slice(1) : rawUsername
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
    const [current, profileRes] = await Promise.all([
      getCurrentUser(),
      supabase.from('users').select('*').eq('username', username).single(),
    ])

    const currentProfileId = current?.profile?.id ?? null
    const { data, error } = profileRes
    if (error || !data) {
      throw new Error('not found in db')
    }

    const [followCheck, followerResult, followingResult, postResult] = await Promise.all([
      currentProfileId && currentProfileId !== data.id
        ? supabase.from('follows').select('follower_id').eq('follower_id', currentProfileId).eq('following_id', data.id).maybeSingle()
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

    return { user: profileUser, currentUserId: currentProfileId }
  } catch {
    const mock = mockUsers.find(u => u.username.toLowerCase() === username.toLowerCase())
    if (!mock) throw new Error('not found')
    return { user: mock, currentUserId: null }
  }
}

async function getInitialPosts(username: string): Promise<PaginatedPosts> {
  const PAGE_SIZE = 20
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('posts_with_counts')
      .select('*, author:users!posts_author_id_fkey(*)')
      .eq('author->username', username)
      .is('deleted_at', null)
      .is('reply_to_id', null)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE + 1)

    if (error || !data) throw new Error('query failed')

    const hasMore = data.length > PAGE_SIZE
    const posts = hasMore ? data.slice(0, PAGE_SIZE) : data
    const nextCursor = hasMore ? posts[posts.length - 1].created_at : null
    return { posts, hasMore, nextCursor }
  } catch {
    // Fall back to mock data
    const userPosts = mockPosts
      .filter(p => p.author.username.toLowerCase() === username.toLowerCase() && !p.reply_to_id)
      .slice(0, PAGE_SIZE)
    return { posts: userPosts, hasMore: false, nextCursor: null }
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username: rawUsername } = await params
  const username = rawUsername.startsWith('@') ? rawUsername.slice(1) : rawUsername

  let profileUser: User
  let currentUserId: string | null = null
  let initialPosts: PaginatedPosts

  try {
    const [profileResult, posts] = await Promise.all([
      getProfileUser(username),
      getInitialPosts(username),
    ])
    profileUser = profileResult.user
    currentUserId = profileResult.currentUserId
    initialPosts = posts
  } catch {
    notFound()
    return null
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

      <ProfileTabs username={profileUser.username} initialPosts={initialPosts} />
    </div>
  )
}
