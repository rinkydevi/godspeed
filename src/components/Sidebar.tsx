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
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-[76px] bg-[#101010] py-3 z-40 items-center">
      {/* Logo */}
      <Link href="/" className="flex items-center justify-center w-full py-4 mb-2">
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
          <Zap className="w-5 h-5 text-black" strokeWidth={2.5} />
        </div>
      </Link>

      {/* Nav — client component for active state via usePathname */}
      <SidebarNavLinks profile={profile} hasUser={!!user} userId={user?.id} />

      {/* User avatar at bottom */}
      {profile && (
        <div className="flex items-center justify-center py-3 hover:bg-[#1e1e1e] rounded-xl w-[56px] transition-colors cursor-pointer" title={profile.display_name}>
          <Avatar src={profile.avatar_url} name={profile.display_name} size={28} />
        </div>
      )}
    </aside>
  )
}
