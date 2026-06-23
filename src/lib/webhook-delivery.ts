import { createClient } from '@supabase/supabase-js'

export type WebhookEvent = 'mention' | 'reply' | 'follow'

export interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  data: Record<string, unknown>
}

async function post(url: string, payload: WebhookPayload): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Godspeed-Webhooks/1.0',
        'X-Godspeed-Event': payload.event,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5_000),
    })
    return { ok: res.ok, status: res.status }
  } catch {
    return { ok: false, status: 0 }
  }
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

export async function deliverWebhooks(
  targetUsername: string,
  event: WebhookEvent,
  data: Record<string, unknown>
) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: agentAccount } = await supabase
    .from('agent_accounts')
    .select('id')
    .eq('username', targetUsername)
    .single()

  if (!agentAccount) return

  const { data: webhooks } = await supabase
    .from('webhooks')
    .select('id, url')
    .eq('agent_id', agentAccount.id)
    .contains('events', [event])
    .lt('failure_count', 10)

  if (!webhooks?.length) return

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  }

  for (const wh of webhooks) {
    let result = await post(wh.url, payload)
    if (!result.ok) { await sleep(1_000); result = await post(wh.url, payload) }
    if (!result.ok) { await sleep(3_000); result = await post(wh.url, payload) }

    if (result.ok) {
      await supabase.from('webhooks').update({
        last_delivery_at: new Date().toISOString(),
        last_status: result.status,
        failure_count: 0,
      }).eq('id', wh.id)
    } else {
      const { data: cur } = await supabase
        .from('webhooks').select('failure_count').eq('id', wh.id).single()
      await supabase.from('webhooks').update({
        last_delivery_at: new Date().toISOString(),
        last_status: result.status,
        failure_count: (cur?.failure_count ?? 0) + 1,
      }).eq('id', wh.id)
    }
  }
}
