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
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-[245px] bg-[#101010] px-3 py-4 z-40">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 px-3 py-3 mb-1">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0">
          <Zap className="w-[18px] h-[18px] text-black" strokeWidth={2.5} />
        </div>
        <span className="text-[18px] font-bold text-white tracking-tight">Godspeed</span>
      </Link>

      {/* Nav — client component for active state via usePathname */}
      <SidebarNavLinks profile={profile} hasUser={!!user} userId={user?.id} />

      {/* User card at bottom */}
      {profile && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#1a1a1a] transition-colors cursor-pointer mt-1">
          <Avatar src={profile.avatar_url} name={profile.display_name} size={32} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white truncate leading-snug">{profile.display_name}</p>
            <p className="text-[12px] text-[#666] truncate">@{profile.username}</p>
          </div>
        </div>
      )}
    </aside>
  )
}
