'use client'

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Avatar } from '@/components/Avatar'
import { SkeletonPost } from '@/components/SkeletonPost'
import { formatDate } from '@/lib/utils'
import type { Notification } from '@/lib/types'

function notificationText(n: Notification): string {
  const actorName = n.actor?.display_name ?? 'Someone'
  switch (n.type) {
    case 'like': return `${actorName} liked your post`
    case 'reply': return `${actorName} replied to your post`
    case 'follow': return `${actorName} started following you`
    case 'mention': return `${actorName} mentioned you`
    default: return `New notification from ${actorName}`
  }
}

export default function NotificationsPage() {
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery<{ notifications: Notification[] }>({
    queryKey: ['notifications-list'],
    queryFn: async () => {
      const res = await fetch('/api/notifications')
      if (!res.ok) return { notifications: [] }
      return res.json()
    },
    retry: false,
  })

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications', { method: 'PATCH' })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.setQueryData(['notifications-count'], { unread_count: 0 })
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] })
    },
  })

  // Clear unread count badge after viewing
  useEffect(() => {
    queryClient.setQueryData(['notifications-count'], { unread_count: 0 })
  }, [queryClient])

  const notifications = data?.notifications ?? []
  const hasUnread = notifications.some((n) => !n.read)

  return (
    <div>
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-[#101010]/95 backdrop-blur border-b border-[#1e1e1e] px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold text-black dark:text-[#f1f1f1] text-[16px]">Activity</h1>
        {hasUnread && (
          <button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="text-[13px] text-violet-500 hover:text-violet-400 font-medium transition-colors disabled:opacity-50"
          >
            Mark all read
          </button>
        )}
      </div>

      {isLoading && (
        <>
          <SkeletonPost />
          <SkeletonPost />
          <SkeletonPost />
        </>
      )}

      {isError && (
        <div className="px-4 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Failed to load notifications.
        </div>
      )}

      {!isLoading && !isError && notifications.length === 0 && (
        <div className="px-4 py-16 text-center text-[14px] text-[#777]">
          No activity yet.
        </div>
      )}

      {!isLoading && !isError && notifications.length > 0 && (
        <div className="divide-y divide-[#1e1e1e]">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 px-4 py-4 transition-colors ${
                !n.read ? 'bg-violet-500/5' : 'hover:bg-[#1e1e1e]/50'
              }`}
            >
              {n.actor && (
                <Avatar src={n.actor.avatar_url} name={n.actor.display_name} size={36} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[14px] text-black dark:text-[#f1f1f1] leading-snug">
                  {notificationText(n)}
                </p>
                {n.post?.content && (
                  <p className="text-[13px] text-[#777] mt-1 truncate">
                    {n.post.content}
                  </p>
                )}
                <p className="text-[12px] text-[#555] mt-1">
                  {formatDate(n.created_at)}
                </p>
              </div>
              {!n.read && (
                <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0 mt-1.5" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
