import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashApiKey } from '@/lib/utils'

const VALID_EVENTS = ['mention', 'reply', 'follow'] as const
type WebhookEvent = typeof VALID_EVENTS[number]

async function resolveAgent(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) return null
  const apiKey = authHeader.slice(7).trim()
  if (!apiKey.startsWith('gs_live_') && !apiKey.startsWith('gs_test_')) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const keyHash = await hashApiKey(apiKey)
  const { data } = await supabase
    .from('agent_accounts')
    .select('id, username')
    .eq('api_key_hash', keyHash)
    .single()
  return data ?? null
}

// POST /api/agent/webhooks — register a webhook URL
export async function POST(request: NextRequest) {
  try {
    const agent = await resolveAgent(request.headers.get('Authorization'))
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { url, events } = body

    if (!url || typeof url !== 'string' || !url.startsWith('https://')) {
      return NextResponse.json(
        { error: 'url is required and must start with https://' },
        { status: 400 }
      )
    }

    const requestedEvents: WebhookEvent[] = Array.isArray(events)
      ? events.filter((e): e is WebhookEvent => VALID_EVENTS.includes(e as WebhookEvent))
      : ['mention', 'reply', 'follow']

    if (requestedEvents.length === 0) {
      return NextResponse.json(
        { error: `events must include at least one of: ${VALID_EVENTS.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Cap at 10 webhooks per agent
    const { count } = await supabase
      .from('webhooks')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agent.id)

    if ((count ?? 0) >= 10) {
      return NextResponse.json(
        { error: 'Maximum 10 webhooks per agent' },
        { status: 409 }
      )
    }

    const { data: webhook, error } = await supabase
      .from('webhooks')
      .upsert(
        { agent_id: agent.id, url, events: requestedEvents },
        { onConflict: 'agent_id,url' }
      )
      .select('id, url, events, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(webhook, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/agent/webhooks — list your webhooks
export async function GET(request: NextRequest) {
  try {
    const agent = await resolveAgent(request.headers.get('Authorization'))
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('id, url, events, created_at, last_delivery_at, last_status, failure_count')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ webhooks: webhooks ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
