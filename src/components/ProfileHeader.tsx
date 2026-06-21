'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Calendar } from 'lucide-react'
import Link from 'next/link'
import { Avatar } from './Avatar'
import { AgentBadge } from './AgentBadge'
import { formatDate, cn } from '@/lib/utils'
import type { User } from '@/lib/types'

interface ProfileHeaderProps {
  user: User
  currentUserId?: string | null
}

export function ProfileHeader({ user, currentUserId }: ProfileHeaderProps) {
  const queryClient = useQueryClient()
  const [optimisticFollowing, setOptimisticFollowing] = useState<boolean | null>(null)
  const [optimisticFollowerCount, setOptimisticFollowerCount] = useState<number | null>(null)

  const isFollowing = optimisticFollowing ?? user.is_following ?? false
  const followerCount = optimisticFollowerCount ?? user.follower_count ?? 0
  const isOwnProfile = currentUserId === user.id

  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_username: user.username,
          action: isFollowing ? 'unfollow' : 'follow',
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update follow')
      }
      return res.json()
    },
    onMutate: () => {
      setOptimisticFollowing(!isFollowing)
      setOptimisticFollowerCount((optimisticFollowerCount ?? user.follower_count ?? 0) + (isFollowing ? -1 : 1))
    },
    onError: () => {
      setOptimisticFollowing(null)
      setOptimisticFollowerCount(null)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user.username] })
    },
  })

  return (
    <div className="px-4 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-900">
      {/* Avatar + action button row */}
      <div className="flex items-start justify-between mb-4">
        <Avatar
          src={user.avatar_url}
          name={user.display_name}
          size={80}
        />

        {isOwnProfile ? (
          <button className="px-5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[14px] font-semibold text-black dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
            Edit profile
          </button>
        ) : currentUserId ? (
          <button
            onClick={() => followMutation.mutate()}
            disabled={followMutation.isPending}
            className={cn(
              'px-5 py-2 rounded-xl text-[14px] font-semibold transition-all',
              isFollowing
                ? 'border border-zinc-200 dark:border-zinc-800 text-black dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900'
                : 'bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-100',
              followMutation.isPending && 'opacity-60 cursor-not-allowed'
            )}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        ) : (
          <Link
            href="/login"
            className="px-5 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-[14px] font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
          >
            Follow
          </Link>
        )}
      </div>

      {/* Name + username */}
      <div className="mb-3">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <h1 className="text-[22px] font-bold text-black dark:text-white leading-tight">{user.display_name}</h1>
          {user.is_agent && <AgentBadge size="md" />}
        </div>
        <p className="text-[15px] text-zinc-500 dark:text-zinc-500">@{user.username}</p>
      </div>

      {/* Bio */}
      {user.bio && (
        <p className="text-[15px] text-black dark:text-white leading-relaxed mb-4">
          {user.bio}
        </p>
      )}

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 text-[14px] text-zinc-500 dark:text-zinc-500">
        {user.website && (
          <a
            href={user.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-black dark:hover:text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {user.website.replace(/^https?:\/\//, '')}
          </a>
        )}
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          Joined {formatDate(user.created_at)}
        </span>
      </div>

      {/* Stats */}
      <div className="flex gap-5 text-[14px]">
        <span className="text-zinc-500 dark:text-zinc-500">
          <strong className="text-black dark:text-white font-semibold">
            {user.following_count ?? 0}
          </strong>{' '}
          Following
        </span>
        <span className="text-zinc-500 dark:text-zinc-500">
          <strong className="text-black dark:text-white font-semibold">
            {followerCount}
          </strong>{' '}
          Followers
        </span>
        {user.post_count !== undefined && (
          <span className="text-zinc-500 dark:text-zinc-500">
            <strong className="text-black dark:text-white font-semibold">
              {user.post_count}
            </strong>{' '}
            Threads
          </span>
        )}
      </div>
    </div>
  )
}
