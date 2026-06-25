'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PenSquare, Heart, User } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

const KNOWN_ROOTS = ['/', '/search', '/agents', '/notifications', '/bookmarks', '/lists', '/login', '/onboarding', '/settings']

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

interface MobileNavProps {
  profile?: { username: string } | null
  hasUser?: boolean
}

export function MobileNav({ profile, hasUser }: MobileNavProps = {}) {
  const pathname = usePathname()

  const isProfileActive = !KNOWN_ROOTS.some(
    (r) => pathname === r || pathname.startsWith(r + '/')
  )

  const { data: countData } = useQuery<{ unread_count: number }>({
    queryKey: ['notifications-count'],
    queryFn: async () => {
      const res = await fetch('/api/notifications?count=true')
      if (!res.ok) return { unread_count: 0 }
      return res.json()
    },
    refetchInterval: 60_000,
    staleTime: 60_000,
    enabled: !!hasUser,
    refetchOnMount: false,
  })

  const unreadCount = countData?.unread_count ?? 0

  const iconBase = 'flex items-center justify-center flex-1 h-full transition-opacity active:opacity-60'
  const iconColor = (active: boolean) => active ? 'text-[#f3f5f7]' : 'text-[#777]'

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#101010] border-t border-[#262626] z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch h-[56px]">

        <Link href="/" aria-label="Home" prefetch className={cn(iconBase, iconColor(isActive(pathname, '/')))}>
          <Home className="w-[26px] h-[26px]" strokeWidth={isActive(pathname, '/') ? 2 : 1.75} fill={isActive(pathname, '/') ? 'currentColor' : 'none'} />
        </Link>

        <Link href="/search" aria-label="Search" prefetch className={cn(iconBase, iconColor(isActive(pathname, '/search')))}>
          <Search className="w-[26px] h-[26px]" strokeWidth={isActive(pathname, '/search') ? 2.5 : 1.75} />
        </Link>

        <Link href="/?compose=1" aria-label="New thread" className={cn(iconBase, 'text-[#f3f5f7]')}>
          <div className="w-[44px] h-[32px] rounded-lg bg-[#1e1e1e] flex items-center justify-center">
            <PenSquare className="w-[20px] h-[20px]" strokeWidth={2} />
          </div>
        </Link>

        <Link
          href="/notifications"
          aria-label="Activity"
          prefetch
          className={cn(iconBase, iconColor(isActive(pathname, '/notifications')))}
        >
          <div className="relative">
            <Heart
              className="w-[26px] h-[26px]"
              strokeWidth={isActive(pathname, '/notifications') ? 2 : 1.75}
              fill={isActive(pathname, '/notifications') ? 'currentColor' : 'none'}
            />
            {unreadCount > 0 && !isActive(pathname, '/notifications') && (
              <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] rounded-full bg-[#ff3040] text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none border-2 border-[#101010]">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </Link>

        <Link
          href={profile ? `/${profile.username}` : hasUser ? '/onboarding' : '/login'}
          aria-label="Profile"
          prefetch
          className={cn(iconBase, iconColor(isProfileActive))}
        >
          <User
            className="w-[26px] h-[26px]"
            strokeWidth={isProfileActive ? 2 : 1.75}
            fill={isProfileActive ? 'currentColor' : 'none'}
          />
        </Link>

      </div>
    </nav>
  )
}
