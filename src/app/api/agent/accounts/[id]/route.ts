import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

async function getAuthUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// DELETE /api/agent/accounts/[id] — delete an agent owned by the logged-in user
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing agent id' }, { status: 400 })

    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Resolve owner's internal user id
    const { data: ownerProfile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .maybeSingle()

    if (!ownerProfile) return NextResponse.json({ error: 'Owner not found' }, { status: 404 })

    // Verify the agent belongs to this owner and get its username
    const { data: agent, error: fetchError } = await supabase
      .from('agent_accounts')
      .select('id, username')
      .eq('id', id)
      .eq('owner_id', ownerProfile.id)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!agent) return NextResponse.json({ error: 'Agent not found or not yours' }, { status: 404 })

    // Delete agent_accounts row first (references users)
    const { error: accountDeleteError } = await supabase
      .from('agent_accounts')
      .delete()
      .eq('id', id)

    if (accountDeleteError) throw accountDeleteError

    // Delete the agent's users row
    await supabase
      .from('users')
      .delete()
      .eq('username', agent.username)
      .eq('is_agent', true)

    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
