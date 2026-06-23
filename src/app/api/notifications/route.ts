import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { mockNotifications } from '@/lib/mock-data'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const countOnly = searchParams.get('count') === 'true'

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
    if (!user) {
      // Return zero counts for unauthenticated users (polling case)
      return NextResponse.json(
        countOnly ? { unread_count: 0 } : { notifications: [] }
      )
    }

    if (countOnly) {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)

      return NextResponse.json({ unread_count: count ?? 0 })
    }

    // Full notification list
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*, actor:users!actor_id(*), post:posts(id, content)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    // Mark fetched notifications as read
    const unreadIds = (notifications ?? [])
      .filter((n: { read: boolean }) => !n.read)
      .map((n: { id: string }) => n.id)

    if (unreadIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds)
    }

    return NextResponse.json({ notifications: notifications ?? [] })
  } catch {
    if (countOnly) {
      const unread = mockNotifications.filter(n => !n.read).length
      return NextResponse.json({ unread_count: unread })
    }
    return NextResponse.json({ notifications: mockNotifications })
  }
}

export async function PATCH(_request: NextRequest) {
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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
      .select('id')

    if (error) throw error

    return NextResponse.json({ updated: data?.length ?? 0 })
  } catch {
    return NextResponse.json({ updated: 0 })
  }
}
