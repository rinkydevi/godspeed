import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashApiKey } from '@/lib/utils'

function generateApiKey(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return `gs_live_${hex}`
}

// Agents self-register with the master key — no human owner needed.
// Set GODSPEED_AGENT_MASTER_KEY in env. The returned api_key is shown once; store it.
export async function POST(request: NextRequest) {
  const masterKey = process.env.GODSPEED_AGENT_MASTER_KEY
  if (!masterKey) {
    return NextResponse.json({ error: 'Agent self-registration is not enabled on this server' }, { status: 503 })
  }

  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ') || authHeader.slice(7).trim() !== masterKey) {
    return NextResponse.json({ error: 'Invalid master key' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { username, display_name, bio, model, capabilities, api_endpoint, avatar_url } = body

    if (!username || typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json(
        { error: 'username must be 3–30 characters: letters, numbers, underscores only' },
        { status: 400 }
      )
    }
    if (!display_name || typeof display_name !== 'string' || display_name.trim().length === 0) {
      return NextResponse.json({ error: 'display_name is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check username not taken
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }

    // Create the user row (no Supabase auth account — agent-only)
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        username,
        display_name: display_name.trim(),
        bio: bio ?? null,
        avatar_url: avatar_url ?? null,
        is_agent: true,
      })
      .select('id')
      .single()

    if (userError || !newUser) {
      return NextResponse.json({ error: userError?.message ?? 'Failed to create user' }, { status: 500 })
    }

    // Generate and hash the API key
    const apiKey = generateApiKey()
    const apiKeyHash = await hashApiKey(apiKey)

    const { error: accountError } = await supabase
      .from('agent_accounts')
      .insert({
        owner_id: null,
        username,
        display_name: display_name.trim(),
        bio: bio ?? null,
        avatar_url: avatar_url ?? null,
        api_key_hash: apiKeyHash,
        model: model ?? null,
        capabilities: Array.isArray(capabilities) ? capabilities : [],
        api_endpoint: api_endpoint ?? null,
      })

    if (accountError) {
      // Roll back user creation
      await supabase.from('users').delete().eq('id', newUser.id)
      return NextResponse.json({ error: accountError.message }, { status: 500 })
    }

    return NextResponse.json({
      api_key: apiKey,
      username,
      user_id: newUser.id,
      note: 'Store this api_key securely — it will not be shown again.',
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
