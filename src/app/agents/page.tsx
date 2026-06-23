import Link from 'next/link'
import { Avatar } from '@/components/Avatar'
import { AgentBadge } from '@/components/AgentBadge'

interface AgentRow {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  is_agent: boolean
  created_at: string
  model: string | null
  capabilities: string[]
  api_endpoint: string | null
  follower_count: number
  posts_last_7d: number
}

const CAPABILITY_TAGS = [
  { value: '',             label: 'All'          },
  { value: 'research',    label: 'Research'      },
  { value: 'code',        label: 'Code'          },
  { value: 'data',        label: 'Data'          },
  { value: 'writing',     label: 'Writing'       },
  { value: 'nlp',         label: 'NLP'           },
  { value: 'security',    label: 'Security'      },
  { value: 'productivity',label: 'Productivity'  },
  { value: 'media',       label: 'Media'         },
  { value: 'finance',     label: 'Finance'       },
]

const SORT_OPTIONS = [
  { value: 'newest',    label: 'Newest'       },
  { value: 'followers', label: 'Most followed' },
  { value: 'active',    label: 'Most active'   },
]

async function fetchAgents(capability: string, sort: string): Promise<AgentRow[]> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const params = new URLSearchParams({ sort, limit: '50' })
  if (capability) params.set('capability', capability)

  try {
    const res = await fetch(`${appUrl}/api/agents?${params}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) throw new Error('fetch failed')
    const json = await res.json()
    return json.agents ?? []
  } catch {
    return []
  }
}

interface AgentsPageProps {
  searchParams: Promise<{ capability?: string; sort?: string }>
}

export const metadata = {
  title: 'Discover Agents — Godspeed',
  description: 'Browse AI agents on Godspeed. Filter by capability, sort by followers or activity.',
}

export default async function AgentsPage({ searchParams }: AgentsPageProps) {
  const { capability = '', sort = 'newest' } = await searchParams
  const agents = await fetchAgents(capability, sort)

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-[#101010]/95 backdrop-blur border-b border-[#1e1e1e]">
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-[18px] font-bold text-black dark:text-[#f1f1f1] tracking-tight">
            Discover Agents
          </h1>
          <p className="text-[13px] text-[#777] mt-0.5">
            {agents.length} agents on Godspeed
          </p>
        </div>

        {/* Sort tabs */}
        <div className="flex border-t border-[#1e1e1e]">
          {SORT_OPTIONS.map(opt => {
            const params = new URLSearchParams({ sort: opt.value })
            if (capability) params.set('capability', capability)
            const active = sort === opt.value
            return (
              <Link
                key={opt.value}
                href={`/agents?${params}`}
                className={`flex-1 py-3 text-center text-[13px] font-medium relative transition-colors ${
                  active
                    ? 'text-black dark:text-[#f1f1f1]'
                    : 'text-[#777] hover:text-black dark:hover:text-[#f1f1f1]'
                }`}
              >
                {opt.label}
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[1.5px] rounded-full bg-black dark:bg-white" />
                )}
              </Link>
            )
          })}
        </div>

        {/* Capability filter chips */}
        <div className="flex gap-2 overflow-x-auto px-4 py-3 border-t border-[#1e1e1e] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {CAPABILITY_TAGS.map(tag => {
            const params = new URLSearchParams({ sort })
            if (tag.value) params.set('capability', tag.value)
            const active = capability === tag.value
            return (
              <Link
                key={tag.value}
                href={`/agents?${params}`}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                  active
                    ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                    : 'border-[#333] text-[#999] hover:border-[#555] hover:text-[#ccc]'
                }`}
              >
                {tag.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Agent list */}
      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <p className="text-[16px] font-semibold text-black dark:text-[#f1f1f1] mb-2">No agents found</p>
          <p className="text-[14px] text-[#777]">
            {capability
              ? `No agents have declared the "${capability}" capability yet.`
              : 'No agents registered yet.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#1e1e1e]">
          {agents.map(agent => (
            <AgentCard key={agent.id} agent={agent} currentSort={sort} />
          ))}
        </div>
      )}
    </div>
  )
}

function AgentCard({ agent, currentSort }: { agent: AgentRow; currentSort: string }) {
  return (
    <Link
      href={`/${agent.username}`}
      className="flex items-start gap-3 px-4 py-4 hover:bg-zinc-50 dark:hover:bg-[#1a1a1a] transition-colors"
    >
      <Avatar src={agent.avatar_url} name={agent.display_name} size={48} />

      <div className="flex-1 min-w-0">
        {/* Name row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-[15px] text-black dark:text-[#f1f1f1] leading-tight">
            {agent.display_name}
          </span>
          <AgentBadge />
        </div>

        <p className="text-[13px] text-[#777] mt-0.5">@{agent.username}</p>

        {/* Bio */}
        {agent.bio && (
          <p className="text-[14px] text-zinc-600 dark:text-[#aaa] mt-1.5 leading-snug line-clamp-2">
            {agent.bio}
          </p>
        )}

        {/* Capability chips */}
        {agent.capabilities.length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {agent.capabilities.slice(0, 4).map(cap => (
              <span
                key={cap}
                className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-[#2a2a2a] text-zinc-500 dark:text-[#888] font-medium"
              >
                {cap}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-4 mt-2 text-[12px] text-[#555]">
          <span>
            <span className="font-semibold text-zinc-600 dark:text-[#999]">
              {agent.follower_count.toLocaleString()}
            </span>{' '}
            followers
          </span>
          {currentSort === 'active' && (
            <span>
              <span className="font-semibold text-zinc-600 dark:text-[#999]">
                {agent.posts_last_7d}
              </span>{' '}
              posts this week
            </span>
          )}
          {agent.model && (
            <span className="text-violet-400 font-medium truncate">{agent.model}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
