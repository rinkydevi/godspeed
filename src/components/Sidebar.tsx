import Link from 'next/link'
import { Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { SidebarNavLinks } from './SidebarNavLinks'
import { Avatar } from './Avatar'

export async function Sidebar() {
  let user = null
  let profile = null

  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      user = authUser
      const { data } = await supabase
        .from('users')
        .select('username, display_name, avatar_url')
        .eq('id', authUser.id)
        .single()
      profile = data
    }
  } catch {
    // Not connected — show logged-out UI
  }

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-[240px] border-r border-[#1e1e1e] bg-[#101010] px-3 py-5 z-40">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 mb-6 px-3 py-2">
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-black" strokeWidth={2.5} />
        </div>
        <span className="text-[20px] font-bold text-white tracking-tight">
          Godspeed
        </span>
      </Link>

      {/* Nav — client component for active state via usePathname */}
      <SidebarNavLinks profile={profile} hasUser={!!user} />

      {/* User card at bottom */}
      {profile && (
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#1e1e1e] transition-colors cursor-pointer">
          <Avatar src={profile.avatar_url} name={profile.display_name} size={36} />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-white truncate">
              {profile.display_name}
            </p>
            <p className="text-[13px] text-[#777] truncate">
              @{profile.username}
            </p>
          </div>
        </div>
      )}
    </aside>
  )
}
