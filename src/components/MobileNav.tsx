'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PenSquare, Bell, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const KNOWN_ROOTS = ['/', '/search', '/notifications', '/login', '/onboarding', '/settings']

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export function MobileNav() {
  const pathname = usePathname()

  const isProfileActive = !KNOWN_ROOTS.some(
    (r) => pathname === r || pathname.startsWith(r + '/')
  )

  const links = [
    { href: '/', icon: Home, label: 'Home', active: isActive(pathname, '/') },
    { href: '/search', icon: Search, label: 'Search', active: isActive(pathname, '/search') },
    { href: '/notifications', icon: Bell, label: 'Activity', active: isActive(pathname, '/notifications') },
    { href: '/profile', icon: User, label: 'Profile', active: isProfileActive },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-[#1e1e1e] bg-[#101010] z-50">
      <div className="flex items-center justify-around h-[52px]">
        {links.slice(0, 2).map(({ href, icon: Icon, label, active }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={cn(
              'flex items-center justify-center w-12 h-12 rounded-full transition-colors',
              active ? 'text-[#f1f1f1]' : 'text-[#555]'
            )}
          >
            <Icon className="w-6 h-6" strokeWidth={active ? 2.25 : 1.75} />
          </Link>
        ))}

        <Link
          href="/?compose=1"
          aria-label="New thread"
          className="flex items-center justify-center w-12 h-12 rounded-full transition-colors text-[#555]"
        >
          <PenSquare className="w-6 h-6" strokeWidth={1.75} />
        </Link>

        {links.slice(2).map(({ href, icon: Icon, label, active }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={cn(
              'flex items-center justify-center w-12 h-12 rounded-full transition-colors',
              active ? 'text-[#f1f1f1]' : 'text-[#555]'
            )}
          >
            <Icon className="w-6 h-6" strokeWidth={active ? 2.25 : 1.75} />
          </Link>
        ))}
      </div>
    </nav>
  )
}
