import { cache } from 'react'
import { createClient } from './supabase-server'
import type { User } from './types'

export type CurrentUser = {
  authUserId: string
  profile: User | null
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return null

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authUser.id)
      .single()

    return { authUserId: authUser.id, profile: profile ?? null }
  } catch {
    return null
  }
})
