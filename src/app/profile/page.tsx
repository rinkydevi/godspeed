import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export default async function ProfileRedirectPage() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    const { data: profile } = await supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single()

    if (profile?.username) {
      redirect(`/${profile.username}`)
    }

    redirect('/onboarding')
  } catch {
    redirect('/login')
  }
}
