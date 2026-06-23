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

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params

  try {
    const cookieStore = await cookies()
    const supabase = makeSupabase(cookieStore)

    const { data: list, error: listError } = await supabase
      .from('lists')
      .select(`
        *,
        member_count:list_members(count)
      `)
      .eq('id', id)
      .single()

    if (listError || !list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    const { data: members, error: membersError } = await supabase
      .from('list_members')
      .select('*, user:users(*)')
      .eq('list_id', id)
      .order('added_at', { ascending: false })

    if (membersError) throw membersError

    const formattedList = {
      ...list,
      member_count: list.member_count?.[0]?.count ?? 0,
    }

    return NextResponse.json({ list: formattedList, members: members ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params

  try {
    const cookieStore = await cookies()
    const supabase = makeSupabase(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existing } = await supabase
      .from('lists')
      .select('owner_id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }
    if (existing.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.name !== undefined) {
      const name = String(body.name).trim()
      if (name.length === 0 || name.length > 50) {
        return NextResponse.json({ error: 'Name must be 1–50 characters' }, { status: 400 })
      }
      updates.name = name
    }
    if (body.description !== undefined) {
      if (body.description !== null && String(body.description).length > 200) {
        return NextResponse.json({ error: 'Description must be 200 characters or fewer' }, { status: 400 })
      }
      updates.description = body.description
    }
    if (body.is_public !== undefined) {
      updates.is_public = Boolean(body.is_public)
    }

    const { data: updated, error } = await supabase
      .from('lists')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params

  try {
    const cookieStore = await cookies()
    const supabase = makeSupabase(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existing } = await supabase
      .from('lists')
      .select('owner_id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }
    if (existing.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('lists')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
