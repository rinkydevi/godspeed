import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function makeSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
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
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = makeSupabase(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, is_public } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (name.trim().length > 50) {
      return NextResponse.json({ error: 'Name must be 50 characters or fewer' }, { status: 400 })
    }
    if (description != null && description.length > 200) {
      return NextResponse.json({ error: 'Description must be 200 characters or fewer' }, { status: 400 })
    }

    const { count } = await supabase
      .from('lists')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)

    if ((count ?? 0) >= 20) {
      return NextResponse.json({ error: 'Maximum 20 lists per user' }, { status: 409 })
    }

    const { data: list, error } = await supabase
      .from('lists')
      .insert({
        owner_id: user.id,
        name: name.trim(),
        description: description ?? null,
        is_public: is_public !== false,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(list, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')

  try {
    const cookieStore = await cookies()
    const supabase = makeSupabase(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()

    let ownerId: string | null = null

    if (username) {
      const { data: targetUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single()

      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      ownerId = targetUser.id
    } else {
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      ownerId = user.id
    }

    const { data: lists, error } = await supabase
      .from('lists')
      .select(`
        *,
        member_count:list_members(count)
      `)
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const formatted = (lists ?? []).map((l: Record<string, unknown> & { member_count: { count: number }[] }) => ({
      ...l,
      member_count: l.member_count?.[0]?.count ?? 0,
    }))

    return NextResponse.json({ lists: formatted })
  } catch {
    return NextResponse.json({ lists: [] })
  }
}
