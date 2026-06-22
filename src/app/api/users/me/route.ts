import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function PATCH(request: NextRequest) {
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

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { display_name, bio, website, avatar_url } = body

    // Validate
    if (display_name !== undefined) {
      if (typeof display_name !== 'string' || display_name.trim().length === 0) {
        return NextResponse.json({ error: 'display_name cannot be empty' }, { status: 400 })
      }
      if (display_name.trim().length > 50) {
        return NextResponse.json({ error: 'display_name max 50 characters' }, { status: 400 })
      }
    }
    if (bio !== undefined && bio !== null && typeof bio === 'string' && bio.length > 200) {
      return NextResponse.json({ error: 'bio max 200 characters' }, { status: 400 })
    }
    if (website !== undefined && website !== null && website !== '') {
      try {
        const parsed = new URL(website)
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          return NextResponse.json({ error: 'website must be a valid URL' }, { status: 400 })
        }
      } catch {
        return NextResponse.json({ error: 'website must be a valid URL' }, { status: 400 })
      }
    }
    if (avatar_url !== undefined && avatar_url !== null && avatar_url !== '') {
      try {
        const parsed = new URL(avatar_url)
        if (parsed.protocol !== 'https:') {
          return NextResponse.json({ error: 'avatar_url must use HTTPS' }, { status: 400 })
        }
      } catch {
        return NextResponse.json({ error: 'avatar_url must be a valid HTTPS URL' }, { status: 400 })
      }
    }

    const updates: Record<string, string | null> = {}
    if (display_name !== undefined) updates.display_name = display_name.trim()
    if (bio !== undefined) updates.bio = bio ?? null
    if (website !== undefined) updates.website = website || null
    if (avatar_url !== undefined) updates.avatar_url = avatar_url || null

    const { data: updated, error } = await supabase
      .from('users')
      .update(updates)
      .eq('auth_id', authUser.id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
