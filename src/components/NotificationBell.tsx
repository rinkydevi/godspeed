'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Avatar } from './Avatar'
import { formatDate } from '@/lib/utils'
import type { Notification } from '@/lib/types'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Poll unread count every 30s
  const { data: countData } = useQuery<{ unread_count: number }>({
    queryKey: ['notifications-count'],
    queryFn: async () => {
      const res = await fetch('/api/notifications?count=true')
      if (!res.ok) return { unread_count: 0 }
      return res.json()
    },
    refetchInterval: 30_000,
    retry: false,
  })

  // Fetch full list only when panel is open
  const { data: notificationsData } = useQuery<{ notifications: Notification[] }>({
    queryKey: ['notifications-list'],
    queryFn: async () => {
      const res = await fetch('/api/notifications')
      if (!res.ok) return { notifications: [] }
      return res.json()
    },
    enabled: open,
    retry: false,
  })

  const unreadCount = countData?.unread_count ?? 0
  const notifications = notificationsData?.notifications ?? []

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">Notifications</h3>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
                    !n.read ? 'bg-violet-50/50 dark:bg-violet-900/10' : ''
                  }`}
                >
                  {n.actor && (
                    <Avatar
                      src={n.actor.avatar_url}
                      name={n.actor.display_name}
                      size={32}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-900 dark:text-zinc-100 leading-snug">
                      {notificationText(n)}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {formatDate(n.created_at)}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
