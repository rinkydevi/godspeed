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

function inferCapabilities(username: string, bio: string | null): string[] {
  const text = `${username} ${bio ?? ''}`.toLowerCase()
  const rules: [string, string][] = [
    ['research', 'research'], ['paper', 'research'], ['arxiv', 'research'], ['literature', 'research'],
    ['code', 'code'], ['review', 'code'], ['debug', 'code'], ['pr', 'code'], ['bug', 'code'], ['sql', 'code'],
    ['data', 'data'], ['pipeline', 'data'], ['embed', 'data'], ['vector', 'data'], ['cluster', 'data'],
    ['write', 'writing'], ['content', 'writing'], ['draft', 'writing'], ['summar', 'writing'], ['doc', 'writing'],
    ['nlp', 'nlp'], ['sentiment', 'nlp'], ['classif', 'nlp'], ['translat', 'nlp'], ['language', 'nlp'],
    ['secur', 'security'], ['cve', 'security'], ['vulner', 'security'], ['threat', 'security'],
    ['task', 'productivity'], ['calendar', 'productivity'], ['meeting', 'productivity'], ['schedule', 'productivity'], ['email', 'productivity'],
    ['music', 'media'], ['movie', 'media'], ['image', 'media'], ['game', 'media'],
    ['financ', 'finance'], ['market', 'finance'], ['portfolio', 'finance'],
    ['rag', 'data'], ['retriev', 'data'],
  ]
  const caps = new Set<string>()
  for (const [keyword, cap] of rules) {
    if (text.includes(keyword)) caps.add(cap)
  }
  return caps.size > 0 ? [...caps] : ['general']
}

function inferModel(username: string): string {
  const modelMap: Record<string, string> = {
    ResearchBot: 'gpt-4o', PaperReader: 'gpt-4o', FactChecker: 'gpt-4o',
    CodeHelper: 'claude-sonnet-4-5', CodeReviewer: 'claude-sonnet-4-5', BugHunter: 'claude-sonnet-4-5',
    SecurityBot: 'claude-sonnet-4-5', DocWriter: 'claude-sonnet-4-5',
    DataMind: 'gpt-4o', SQLHelper: 'gpt-4o', EmbeddingBot: 'text-embedding-3-large',
    RAGPipeline: 'gpt-4o', ClusterBot: 'gpt-4o',
    SentimentBot: 'claude-haiku-4-5', ClassifierBot: 'claude-haiku-4-5', TranslateBot: 'claude-haiku-4-5',
    LogAnalyzer: 'gpt-4o-mini', PerfOptimizer: 'gpt-4o-mini',
    NewsDigest: 'gpt-4o-mini', SummaryAgent: 'gpt-4o-mini', TweetBot: 'gpt-4o-mini',
    DebateBot: 'claude-opus-4-5', WritingAssist: 'claude-sonnet-4-5',
  }
  return modelMap[username] ?? 'gpt-4o-mini'
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
    model: agentAccount?.model ?? (user.is_agent ? inferModel(user.username) : null),
    capabilities: agentAccount?.capabilities?.length
      ? agentAccount.capabilities
      : (user.is_agent ? inferCapabilities(user.username, user.bio ?? null) : []),
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
