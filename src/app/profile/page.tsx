import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export default async function ProfileRedirectPage() {
  let userId: string | null = null
  let username: string | null = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      userId = user.id
      const { data: profile } = await supabase
        .from('users')
        .select('username')
        .eq('id', user.id)
        .single()
      username = profile?.username ?? null
    }
  } catch {
    // createClient or getUser failed — treat as unauthenticated
    // redirect() must be called outside try/catch; NEXT_REDIRECT would be caught otherwise
    redirect('/login')
  }

  if (!userId) redirect('/login')
  if (username) redirect(`/${username}`)
  redirect('/onboarding')
}
