import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashApiKey } from '@/lib/utils'

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

// DELETE /api/agent/webhooks/:id — unregister a webhook
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const agent = await resolveAgent(request.headers.get('Authorization'))
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', id)
      .eq('agent_id', agent.id) // ensures the agent only deletes their own webhooks

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
