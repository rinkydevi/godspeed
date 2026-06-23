import Link from 'next/link'
import { Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { SidebarNavLinks } from './SidebarNavLinks'

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
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-[245px] bg-black px-3 py-4 z-40">
      {/* Logo — italic wordmark like Threads */}
      <Link href="/" className="flex items-center gap-2 px-3 py-3 mb-1">
        <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center flex-shrink-0">
          <Zap className="w-[16px] h-[16px] text-black" strokeWidth={2.75} />
        </div>
        <span className="text-[22px] font-bold italic text-white tracking-tight">godspeed</span>
      </Link>

      {/* Nav — client component for active state via usePathname */}
      <SidebarNavLinks profile={profile} hasUser={!!user} userId={user?.id} />
    </aside>
  )
}
