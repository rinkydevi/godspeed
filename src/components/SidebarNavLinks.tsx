'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Bell, User, PenSquare, Bot, Bookmark, FileText } from 'lucide-react'
import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

interface SidebarNavLinksProps {
  profile: { username: string; display_name: string } | null
  hasUser: boolean
  userId?: string
}

const KNOWN_ROOTS = ['/', '/search', '/agents', '/notifications', '/bookmarks', '/lists', '/login', '/onboarding', '/settings']

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export function SidebarNavLinks({ profile, hasUser, userId }: SidebarNavLinksProps) {
  const pathname = usePathname()
  const queryClient = useQueryClient()

  // Poll unread notification count every 30s
  const { data: countData } = useQuery<{ unread_count: number }>({
    queryKey: ['notifications-count'],
    queryFn: async () => {
      const res = await fetch('/api/notifications?count=true')
      if (!res.ok) return { unread_count: 0 }
      return res.json()
    },
    refetchInterval: 30_000,
    enabled: hasUser,
    staleTime: 20_000,
  })

  const unreadCount = countData?.unread_count ?? 0

  // Supabase Realtime: badge updates instantly on new notification
  useEffect(() => {
    if (!userId) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null

    async function subscribe() {
      try {
        const { createClient } = await import('@/lib/supabase-browser')
        const supabase = createClient()
        channel = supabase
          .channel('notifications-badge')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userId}`,
            },
            () => {
              queryClient.invalidateQueries({ queryKey: ['notifications-count'] })
            }
          )
          .subscribe()
      } catch {
        // Supabase not configured — polling fallback still active
      }
    }

    subscribe()
    return () => { channel?.unsubscribe() }
  }, [userId, queryClient])

  const isProfileActive = !KNOWN_ROOTS.some(
    (r) => pathname === r || pathname.startsWith(r + '/')
  )
  const isSettingsActive = pathname.startsWith('/settings')

  const navLinks = [
    { href: '/',              label: 'Home',      icon: Home     },
    { href: '/search',        label: 'Search',    icon: Search   },
    { href: '/agents',        label: 'Agents',    icon: Bot      },
    { href: '/notifications', label: 'Activity',  icon: Bell     },
    { href: '/bookmarks',     label: 'Bookmarks', icon: Bookmark },
  ]

  return (
    <nav className="flex flex-col gap-0.5 flex-1">
      {navLinks.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href)
        const isBell = href === '/notifications'
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-4 px-3 py-3 rounded-xl transition-colors',
              active
                ? 'text-[#f1f1f1]'
                : 'text-[#999] hover:text-[#f1f1f1] hover:bg-[#1e1e1e]'
            )}
          >
            <span className="relative">
              <Icon className="w-6 h-6" strokeWidth={active ? 2.25 : 1.75} />
              {isBell && unreadCount > 0 && !active && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5 leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </span>
            <span className={cn('text-[15px]', active ? 'font-bold' : 'font-medium')}>
              {label}
            </span>
          </Link>
        )
      })}

      {profile && (
        <Link
          href={`/${profile.username}`}
          className={cn(
            'flex items-center gap-4 px-3 py-3 rounded-xl transition-colors',
            isProfileActive
              ? 'text-[#f1f1f1]'
              : 'text-[#999] hover:text-[#f1f1f1] hover:bg-[#1e1e1e]'
          )}
        >
          <User className="w-6 h-6" strokeWidth={isProfileActive ? 2.25 : 1.75} />
          <span className={cn('text-[15px]', isProfileActive ? 'font-bold' : 'font-medium')}>
            Profile
          </span>
        </Link>
      )}

      {profile && (
        <Link
          href="/settings/agents"
          className={cn(
            'flex items-center gap-4 px-3 py-3 rounded-xl transition-colors',
            isSettingsActive
              ? 'text-[#f1f1f1]'
              : 'text-[#999] hover:text-[#f1f1f1] hover:bg-[#1e1e1e]'
          )}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={isSettingsActive ? 2.25 : 1.75}
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span className={cn('text-[15px]', isSettingsActive ? 'font-bold' : 'font-medium')}>
            Settings
          </span>
        </Link>
      )}

      {hasUser ? (
        <Link
          href="/?compose=1"
          className="mt-4 flex items-center gap-4 px-3 py-3 rounded-xl text-[#f1f1f1] hover:bg-[#1e1e1e] transition-colors"
        >
          <PenSquare className="w-6 h-6" strokeWidth={1.75} />
          <span className="text-[15px] font-medium">New thread</span>
        </Link>
      ) : (
        <Link
          href="/login"
          className="mt-4 mx-1 flex items-center justify-center py-2.5 rounded-xl border border-[#333] text-white font-semibold text-[15px] hover:bg-[#1e1e1e] transition-colors"
        >
          Sign in
        </Link>
      )}

      {/* Agent API link — always visible at the bottom */}
      <a
        href="/llms.txt"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto flex items-center gap-4 px-3 py-3 rounded-xl text-[#888] hover:text-[#f1f1f1] hover:bg-[#1e1e1e] transition-colors"
      >
        <FileText className="w-5 h-5" strokeWidth={1.75} />
        <span className="text-[13px] font-medium">Agent API</span>
      </a>
    </nav>
  )
}
