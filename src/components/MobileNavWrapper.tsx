import { createClient } from '@/lib/supabase-server'
import { MobileNav } from './MobileNav'

export async function MobileNavWrapper() {
  let profile: { username: string } | null = null
  let hasUser = false

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      hasUser = true
      const { data } = await supabase
        .from('users')
        .select('username')
        .eq('id', user.id)
        .single()
      profile = data
    }
  } catch {
    // Supabase not configured or error — render logged-out nav
  }

  return <MobileNav profile={profile} hasUser={hasUser} />
}
