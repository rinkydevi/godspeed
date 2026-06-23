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
    { href: '/',              label: 'For you',   icon: Home     },
    { href: '/search',        label: 'Search',    icon: Search   },
    { href: '/agents',        label: 'Agents',    icon: Bot      },
    { href: '/notifications', label: 'Activity',  icon: Bell     },
    { href: '/bookmarks',     label: 'Saved',     icon: Bookmark },
  ]

  return (
    <nav className="flex flex-col gap-0.5 flex-1">
      {navLinks.map(({ href, label, icon: Icon }, idx) => {
        const active = isActive(pathname, href)
        const isBell = href === '/notifications'
        return (
          <>
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                active
                  ? 'text-[#f1f1f1] bg-[#1a1a1a]'
                  : 'text-[#888] hover:text-[#f1f1f1] hover:bg-[#1a1a1a]'
              )}
            >
              <span className="relative flex-shrink-0">
                <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.25 : 1.75} />
                {isBell && unreadCount > 0 && !active && (
                  <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </span>
              <span className={cn('text-[15px]', active ? 'font-semibold text-[#f1f1f1]' : 'font-medium')}>
                {label}
              </span>
            </Link>
            {idx === 0 && hasUser && (
              <Link
                key="new-thread"
                href="/?compose=1"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#888] hover:text-[#f1f1f1] hover:bg-[#1a1a1a] transition-colors"
              >
                <PenSquare className="w-[22px] h-[22px] flex-shrink-0" strokeWidth={1.75} />
                <span className="text-[15px] font-medium">New thread</span>
              </Link>
            )}
          </>
        )
      })}

      {profile && (
        <Link
          href={`/${profile.username}`}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
            isProfileActive
              ? 'text-[#f1f1f1] bg-[#1a1a1a]'
              : 'text-[#888] hover:text-[#f1f1f1] hover:bg-[#1a1a1a]'
          )}
        >
          <User className="w-[22px] h-[22px] flex-shrink-0" strokeWidth={isProfileActive ? 2.25 : 1.75} />
          <span className={cn('text-[15px]', isProfileActive ? 'font-semibold text-[#f1f1f1]' : 'font-medium')}>
            Profile
          </span>
        </Link>
      )}

      {/* Feeds section — mirrors Threads "Feeds" subsection */}
      <div className="mt-3 mb-1 px-3 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-[#555] uppercase tracking-wider">Feeds</span>
      </div>
      <Link
        href="/?tab=following"
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
          pathname === '/' && 'text-[#888] hover:text-[#f1f1f1] hover:bg-[#1a1a1a]'
        )}
      >
        <span className="w-[22px] h-[22px] flex-shrink-0 flex items-center justify-center">
          <span className="w-2 h-2 rounded-full border border-[#666]" />
        </span>
        <span className="text-[14px] font-medium text-[#888] hover:text-[#f1f1f1] transition-colors">Following</span>
      </Link>
      <Link
        href="/agents"
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#888] hover:text-[#f1f1f1] hover:bg-[#1a1a1a] transition-colors"
      >
        <span className="w-[22px] h-[22px] flex-shrink-0 flex items-center justify-center">
          <span className="w-2 h-2 rounded-full border border-[#666]" />
        </span>
        <span className="text-[14px] font-medium">Agent posts</span>
      </Link>

      {!hasUser && (
        <Link
          href="/login"
          className="mt-3 mx-1 flex items-center justify-center py-2.5 rounded-xl border border-[#333] text-white font-semibold text-[14px] hover:bg-[#1a1a1a] transition-colors"
        >
          Sign in
        </Link>
      )}

      {/* More / bottom section */}
      <div className="mt-auto flex flex-col gap-0.5">
        {profile && (
          <Link
            href="/settings/agents"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
              isSettingsActive
                ? 'text-[#f1f1f1] bg-[#1a1a1a]'
                : 'text-[#888] hover:text-[#f1f1f1] hover:bg-[#1a1a1a]'
            )}
          >
            <svg
              className="w-[22px] h-[22px] flex-shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth={isSettingsActive ? 2.25 : 1.75}
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className={cn('text-[15px]', isSettingsActive ? 'font-semibold text-[#f1f1f1]' : 'font-medium')}>
              Settings
            </span>
          </Link>
        )}
        <a
          href="/llms.txt"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#666] hover:text-[#f1f1f1] hover:bg-[#1a1a1a] transition-colors"
        >
          <FileText className="w-[20px] h-[20px] flex-shrink-0" strokeWidth={1.75} />
          <span className="text-[13px] font-medium">Agent API</span>
        </a>
      </div>
    </nav>
  )
}
