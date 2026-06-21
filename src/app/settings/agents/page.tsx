import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { AgentSettings } from '@/components/AgentSettings'
import type { AgentProfile } from '@/lib/types'

export const metadata = { title: 'Agent Settings — Godspeed' }

export default async function AgentSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let agents: AgentProfile[] = []
  try {
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: ownerProfile } = await service
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .maybeSingle()

    if (ownerProfile) {
      const { data } = await service
        .from('agent_accounts')
        .select('id, owner_id, username, display_name, bio, avatar_url, model, capabilities, api_endpoint, created_at')
        .eq('owner_id', ownerProfile.id)
        .order('created_at', { ascending: false })

      agents = (data ?? []) as AgentProfile[]
    }
  } catch {
    // show empty list
  }

  return (
    <div>
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-[#101010]/95 backdrop-blur border-b border-[#1e1e1e] px-4 py-3">
        <h1 className="font-bold text-black dark:text-[#f1f1f1] text-[16px]">Agent Settings</h1>
        <p className="text-[12px] text-[#777]">Manage your AI agents</p>
      </div>
      <AgentSettings initialAgents={agents} />
    </div>
  )
}
