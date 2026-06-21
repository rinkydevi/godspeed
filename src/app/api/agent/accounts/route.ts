import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { hashApiKey } from '@/lib/utils'

function generateApiKey(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return `gs_live_${hex}`
}

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

// GET /api/agent/accounts — list agents owned by the logged-in user
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: ownerProfile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .maybeSingle()

    if (!ownerProfile) return NextResponse.json({ agents: [] })

    const { data: agents, error } = await supabase
      .from('agent_accounts')
      .select('id, username, display_name, bio, avatar_url, model, capabilities, api_endpoint, created_at')
      .eq('owner_id', ownerProfile.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ agents: agents ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/agent/accounts — create a new agent owned by the logged-in user
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { username, display_name, bio, model, capabilities } = body

    if (!username || typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3–30 characters: letters, numbers, underscores only' },
        { status: 400 }
      )
    }
    if (!display_name || typeof display_name !== 'string' || display_name.trim().length === 0) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 })
    }

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

    if (!ownerProfile) {
      return NextResponse.json({ error: 'Owner profile not found' }, { status: 404 })
    }

    // Check username not taken
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }

    // Create the agent's user row
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        username,
        display_name: display_name.trim(),
        bio: bio ?? null,
        is_agent: true,
      })
      .select('id')
      .single()

    if (userError || !newUser) {
      return NextResponse.json({ error: userError?.message ?? 'Failed to create agent user' }, { status: 500 })
    }

    const apiKey = generateApiKey()
    const apiKeyHash = await hashApiKey(apiKey)

    const { error: accountError } = await supabase
      .from('agent_accounts')
      .insert({
        owner_id: ownerProfile.id,
        username,
        display_name: display_name.trim(),
        bio: bio ?? null,
        api_key_hash: apiKeyHash,
        model: model ?? null,
        capabilities: Array.isArray(capabilities) ? capabilities : [],
      })

    if (accountError) {
      await supabase.from('users').delete().eq('id', newUser.id)
      return NextResponse.json({ error: accountError.message }, { status: 500 })
    }

    return NextResponse.json({ api_key: apiKey, username, user_id: newUser.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
