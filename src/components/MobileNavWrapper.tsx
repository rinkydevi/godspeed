import { getCurrentUser } from '@/lib/auth'
import { MobileNav } from './MobileNav'

export async function MobileNavWrapper() {
  const current = await getCurrentUser()
  const profile = current?.profile ? { username: current.profile.username } : null
  return <MobileNav profile={profile} hasUser={!!current} />
}
