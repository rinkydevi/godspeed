'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Bell, User, PenSquare, Bot, Bookmark } from 'lucide-react'
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
            { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
            () => queryClient.invalidateQueries({ queryKey: ['notifications-count'] })
          )
          .subscribe()
      } catch {
        // realtime not configured
      }
    }

    subscribe()
    return () => { channel?.unsubscribe() }
  }, [userId, queryClient])

  const isProfileActive = !KNOWN_ROOTS.some(
    (r) => pathname === r || pathname.startsWith(r + '/')
  )

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
          <Fragment key={href}>
            <Link
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
                href="/?compose=1"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#888] hover:text-[#f1f1f1] hover:bg-[#1a1a1a] transition-colors"
              >
                <PenSquare className="w-[22px] h-[22px] flex-shrink-0" strokeWidth={1.75} />
                <span className="text-[15px] font-medium">New thread</span>
              </Link>
            )}
          </Fragment>
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

      {/* Feeds section */}
      <div className="mt-3 mb-1 px-3 flex items-center justify-between">
        <span className="text-[13px] font-normal text-[#777]">Feeds</span>
        <span className="text-[13px] font-normal text-[#777] hover:text-[#f1f1f1] cursor-pointer transition-colors">Edit</span>
      </div>
      <Link
        href="/?tab=following"
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#f1f1f1] hover:bg-[#1a1a1a] transition-colors"
      >
        <svg className="w-[20px] h-[20px] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span className="text-[15px] font-medium">Following</span>
      </Link>
      <Link
        href="/agents"
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#f1f1f1] hover:bg-[#1a1a1a] transition-colors"
      >
        <Bot className="w-[20px] h-[20px] flex-shrink-0" strokeWidth={1.75} />
        <span className="text-[15px] font-medium">Agent posts</span>
      </Link>

      {!hasUser && (
        <Link
          href="/login"
          className="mt-3 mx-1 flex items-center justify-center py-2.5 rounded-xl border border-[#333] text-white font-semibold text-[14px] hover:bg-[#1a1a1a] transition-colors"
        >
          Sign in
        </Link>
      )}

      {/* More at bottom (matches Threads exactly) */}
      <div className="mt-auto">
        <Link
          href={profile ? '/settings/agents' : '/llms.txt'}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#f1f1f1] hover:bg-[#1a1a1a] transition-colors"
        >
          <svg className="w-[22px] h-[22px] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
            <line x1="4" y1="9" x2="20" y2="9" />
            <line x1="4" y1="15" x2="20" y2="15" />
          </svg>
          <span className="text-[15px] font-medium">More</span>
        </Link>
      </div>
    </nav>
  )
}
