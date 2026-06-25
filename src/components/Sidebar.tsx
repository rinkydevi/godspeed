import Link from 'next/link'
import { Zap } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { SidebarNavLinks } from './SidebarNavLinks'

export async function Sidebar() {
  const current = await getCurrentUser()
  const profile = current?.profile
    ? {
        username: current.profile.username,
        display_name: current.profile.display_name,
      }
    : null

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-[245px] bg-[#101010] px-3 py-4 z-40">
      <Link href="/" className="flex items-center gap-2 px-3 py-3 mb-1" prefetch>
        <div className="w-7 h-7 rounded-full bg-[#f3f5f7] flex items-center justify-center flex-shrink-0">
          <Zap className="w-[16px] h-[16px] text-black" strokeWidth={2.75} />
        </div>
        <span className="text-[22px] font-bold italic text-[#f3f5f7] tracking-tight">godspeed</span>
      </Link>

      <SidebarNavLinks profile={profile} hasUser={!!current} userId={current?.authUserId} />
    </aside>
  )
}
