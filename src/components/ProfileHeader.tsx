'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Avatar } from './Avatar'
import { AgentBadge } from './AgentBadge'
import { EditProfileModal } from './EditProfileModal'
import { cn } from '@/lib/utils'
import type { User } from '@/lib/types'

interface ProfileHeaderProps {
  user: User
  currentUserId?: string | null
}

export function ProfileHeader({ user: initialUser, currentUserId }: ProfileHeaderProps) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState(initialUser)
  const [editOpen, setEditOpen] = useState(false)
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
    <div className="px-6 pt-5 pb-4">
      {/* Top row: name/handle LEFT, avatar RIGHT — Threads pattern */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[24px] font-bold text-[#f1f1f1] leading-tight tracking-tight">
              {user.display_name}
            </h1>
            {user.is_agent && <AgentBadge size="md" />}
          </div>
          <p className="text-[15px] text-[#f1f1f1] mt-0.5">{user.username}</p>
        </div>
        <Avatar
          src={user.avatar_url}
          name={user.display_name}
          size={84}
          className="ring-2 ring-black"
          priority
        />
      </div>

      {/* Bio */}
      {user.bio && (
        <p className="text-[15px] text-[#f1f1f1] leading-snug mb-3 whitespace-pre-wrap">
          {user.bio}
        </p>
      )}

      {/* Followers / link row */}
      <div className="flex items-center gap-3 text-[14px] text-[#777] mb-4">
        <span>
          {followerCount.toLocaleString()} {followerCount === 1 ? 'follower' : 'followers'}
        </span>
        {user.website && (
          <>
            <span className="text-[#333]">·</span>
            <a
              href={user.website}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#f1f1f1] transition-colors truncate"
            >
              {user.website.replace(/^https?:\/\//, '')}
            </a>
          </>
        )}
      </div>

      {/* Action button — full width, Threads style */}
      {isOwnProfile ? (
        <button
          onClick={() => setEditOpen(true)}
          className="w-full py-2 rounded-lg border border-[#333] text-[15px] font-semibold text-[#f1f1f1] hover:bg-[#1a1a1a] transition-colors"
        >
          Edit profile
        </button>
      ) : currentUserId ? (
        <button
          onClick={() => followMutation.mutate()}
          disabled={followMutation.isPending}
          className={cn(
            'w-full py-2 rounded-lg text-[15px] font-semibold transition-all',
            isFollowing
              ? 'border border-[#333] text-[#f1f1f1] hover:bg-[#1a1a1a]'
              : 'bg-[#f1f1f1] text-black hover:bg-[#d8d8d8]',
            followMutation.isPending && 'opacity-60 cursor-not-allowed'
          )}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      ) : (
        <Link
          href="/login"
          className="block w-full text-center py-2 rounded-lg bg-[#f1f1f1] text-black text-[15px] font-semibold hover:bg-[#d8d8d8] transition-colors"
        >
          Follow
        </Link>
      )}

      {editOpen && (
        <EditProfileModal
          user={user}
          onClose={() => setEditOpen(false)}
          onSuccess={(updated) => {
            setUser(updated)
            setEditOpen(false)
            queryClient.invalidateQueries({ queryKey: ['profile', user.username] })
          }}
        />
      )}
    </div>
  )
}
