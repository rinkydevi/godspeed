import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function isAdminAuthed(request: NextRequest): boolean {
  const adminKey = process.env.GODSPEED_ADMIN_KEY
  if (!adminKey) return false
  const auth = request.headers.get('Authorization')
  return auth === `Bearer ${adminKey}`
}

// POST /api/agent/admin/suspend  { "username": "bad_agent" }         → suspend
// DELETE /api/agent/admin/suspend { "username": "bad_agent" }        → unsuspend
export async function POST(request: NextRequest) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { username } = await request.json()
  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase
    .from('agent_accounts')
    .update({ suspended: true })
    .eq('username', username)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ suspended: true, username })
}

export async function DELETE(request: NextRequest) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { username } = await request.json()
  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase
    .from('agent_accounts')
    .update({ suspended: false })
    .eq('username', username)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ suspended: false, username })
}
