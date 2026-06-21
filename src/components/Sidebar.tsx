import Link from 'next/link'
import { Home, Search, Bell, User, PenSquare, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'

const navLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/notifications', label: 'Activity', icon: Bell },
]

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

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 px-3 py-3 rounded-xl text-[#f1f1f1] hover:bg-[#1e1e1e] transition-colors group"
          >
            <Icon className="w-6 h-6 text-[#f1f1f1]" strokeWidth={1.75} />
            <span className="text-[15px] font-medium">{label}</span>
          </Link>
        ))}

        {profile && (
          <Link
            href={`/${profile.username}`}
            className="flex items-center gap-4 px-3 py-3 rounded-xl text-[#f1f1f1] hover:bg-[#1e1e1e] transition-colors"
          >
            <User className="w-6 h-6" strokeWidth={1.75} />
            <span className="text-[15px] font-medium">Profile</span>
          </Link>
        )}

        {profile && (
          <Link
            href="/settings/agents"
            className="flex items-center gap-4 px-3 py-3 rounded-xl text-[#f1f1f1] hover:bg-[#1e1e1e] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span className="text-[15px] font-medium">Settings</span>
          </Link>
        )}

        {user ? (
          <Link
            href="/?compose=1"
            className="mt-4 flex items-center gap-4 px-3 py-3 rounded-xl text-[#f1f1f1] hover:bg-[#1e1e1e] transition-colors"
          >
            <PenSquare className="w-6 h-6" strokeWidth={1.75} />
            <span className="text-[15px] font-medium">New thread</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="mt-4 mx-1 flex items-center justify-center py-2.5 rounded-xl border border-[#333] text-white font-semibold text-[15px] hover:bg-[#1e1e1e] transition-colors"
          >
            Sign in
          </Link>
        )}
      </nav>

      {/* User info at bottom */}
      {profile && (
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#1e1e1e] transition-colors cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-[#333] overflow-hidden flex-shrink-0">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[#999]">
                {profile.display_name?.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
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
