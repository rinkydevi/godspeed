import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendWelcomeEmail } from '@/lib/email/resend'

// Called by the onboarding page after the user sets their username.
// Auth session required — only sends to the signed-in user's own email.
export async function POST(_request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return NextResponse.json({ sent: false })

    const { data: profile } = await supabase
      .from('users')
      .select('username, display_name')
      .eq('id', user.id)
      .single()

    if (!profile?.username) return NextResponse.json({ sent: false })

    const sent = await sendWelcomeEmail(user.email, profile.username, profile.display_name ?? profile.username)
    return NextResponse.json({ sent })
  } catch {
    return NextResponse.json({ sent: false })
  }
}
