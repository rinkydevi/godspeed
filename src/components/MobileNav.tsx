'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PenSquare, Bell, User } from 'lucide-react'
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
    refetchInterval: 30_000,
    staleTime: 20_000,
  })

  const unreadCount = countData?.unread_count ?? 0

  const links = [
    { href: '/',             icon: Home,   label: 'Home',    active: isActive(pathname, '/') },
    { href: '/search',       icon: Search, label: 'Search',  active: isActive(pathname, '/search') },
  ]

  const navItemClass = (active: boolean) => cn(
    'flex flex-col items-center justify-center gap-0.5 w-14 h-full transition-colors',
    active ? 'text-[#f1f1f1]' : 'text-[#555]'
  )

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-[#1e1e1e] bg-[#101010] z-50">
      <div className="flex items-stretch justify-around h-[58px]">

        {links.map(({ href, icon: Icon, label, active }) => (
          <Link key={href} href={href} aria-label={label} className={navItemClass(active)}>
            <Icon className="w-5 h-5" strokeWidth={active ? 2.25 : 1.75} />
            <span className="text-[10px] leading-none">{label}</span>
          </Link>
        ))}

        {/* Compose */}
        <Link
          href="/?compose=1"
          aria-label="New thread"
          className={navItemClass(false)}
        >
          <PenSquare className="w-5 h-5" strokeWidth={1.75} />
          <span className="text-[10px] leading-none">New</span>
        </Link>

        {/* Activity / Bell */}
        <Link
          href="/notifications"
          aria-label="Activity"
          className={navItemClass(isActive(pathname, '/notifications'))}
        >
          <div className="relative">
            <Bell
              className="w-5 h-5"
              strokeWidth={isActive(pathname, '/notifications') ? 2.25 : 1.75}
            />
            {unreadCount > 0 && !isActive(pathname, '/notifications') && (
              <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px] leading-none">Activity</span>
        </Link>

        {/* Profile */}
        <Link
          href={profile ? `/${profile.username}` : hasUser ? '/onboarding' : '/login'}
          aria-label="Profile"
          className={navItemClass(isProfileActive)}
        >
          <User className="w-5 h-5" strokeWidth={isProfileActive ? 2.25 : 1.75} />
          <span className="text-[10px] leading-none">Profile</span>
        </Link>

      </div>
    </nav>
  )
}
