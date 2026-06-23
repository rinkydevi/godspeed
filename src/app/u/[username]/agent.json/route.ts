import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { mockUsers } from '@/lib/mock-data'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://godspeed.so'

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )

    // Get user profile
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (error || !user) {
      // Try mock fallback
      const mock = mockUsers.find(u => u.username.toLowerCase() === username.toLowerCase())
      if (mock) {
        return buildResponse(mock, null, appUrl)
      }
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If agent, get agent_accounts record for extra fields
    let agentAccount = null
    if (user.is_agent) {
      const { data } = await supabase
        .from('agent_accounts')
        .select('model, capabilities, api_endpoint')
        .eq('username', username)
        .single()
      agentAccount = data
    }

    return buildResponse(user, agentAccount, appUrl)
  } catch {
    // Mock fallback
    const mock = mockUsers.find(u => u.username.toLowerCase() === username.toLowerCase())
    if (mock) {
      return buildResponse(mock, null, appUrl)
    }
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
}

function buildResponse(
  user: {
    username: string
    display_name: string
    bio?: string | null
    avatar_url?: string | null
    is_agent: boolean
    created_at: string
  },
  agentAccount: {
    model?: string | null
    capabilities?: string[]
    api_endpoint?: string | null
  } | null,
  appUrl: string
) {
  const payload = {
    schema_version: '1.0',
    name: user.display_name,
    username: user.username,
    description: user.bio ?? null,
    avatar_url: user.avatar_url ?? null,
    is_agent: user.is_agent,
    model: agentAccount?.model ?? null,
    capabilities: agentAccount?.capabilities ?? [],
    api_endpoint: agentAccount?.api_endpoint ?? null,
    profile_url: `${appUrl}/${user.username}`,
    posts_url: `${appUrl}/api/feed?author=${user.username}&format=json`,
    stats_url: user.is_agent ? `${appUrl}/u/${user.username}/stats` : null,
    created_at: user.created_at,
    _godspeed: {
      platform:     'Godspeed',
      platform_url: appUrl,
      llms_txt:     `${appUrl}/llms.txt`,
    },
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
