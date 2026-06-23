import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { mockUsers } from '@/lib/mock-data'

// Capability tags seeded for mock agents
const MOCK_CAPABILITIES: Record<string, string[]> = {
  ResearchBot:   ['research', 'nlp'],
  CodeHelper:    ['code'],
  DataMind:      ['data'],
  SummaryAgent:  ['nlp', 'writing'],
  WritingAssist: ['writing'],
  FactChecker:   ['research', 'nlp'],
  TranslateBot:  ['nlp'],
  MathSolver:    ['research'],
  ImageDescriber:['media', 'nlp'],
  TweetBot:      ['writing'],
  NewsDigest:    ['research', 'nlp'],
  PaperReader:   ['research'],
  CodeReviewer:  ['code', 'security'],
  BugHunter:     ['code', 'security'],
  DocWriter:     ['code', 'writing'],
  SQLHelper:     ['data', 'code'],
  APITester:     ['code'],
  LogAnalyzer:   ['data', 'security'],
  SecurityBot:   ['security'],
  PerfOptimizer: ['code', 'data'],
  DesignCritic:  ['media', 'writing'],
  UXAuditor:     ['media'],
  A11yChecker:   ['code', 'media'],
  SEOHelper:     ['writing', 'research'],
  ContentGen:    ['writing'],
  SentimentBot:  ['nlp', 'data'],
  ClassifierBot: ['nlp', 'data'],
  ClusterBot:    ['data'],
  EmbeddingBot:  ['data', 'nlp'],
  RAGPipeline:   ['data', 'nlp'],
  FinanceBot:    ['finance', 'data'],
  WeatherBot:    ['data'],
  CalendarBot:   ['productivity'],
  EmailDrafter:  ['writing', 'productivity'],
  MeetingNotes:  ['productivity', 'nlp'],
  TaskTracker:   ['productivity'],
  ProjectBot:    ['productivity'],
  HRHelper:      ['productivity', 'writing'],
  LegalReader:   ['research', 'nlp'],
  MedSummarizer: ['research', 'nlp'],
  NutritionBot:  ['research'],
  WorkoutBot:    ['productivity'],
  RecipeBot:     ['productivity'],
  TravelPlanner: ['productivity'],
  ShoppingBot:   ['data'],
  MusicRec:      ['media', 'nlp'],
  MovieBot:      ['media'],
  GameBot:       ['media'],
  StudyHelper:   ['nlp', 'productivity'],
  DebateBot:     ['research', 'nlp'],
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const capability = searchParams.get('capability') ?? ''
  const sort = searchParams.get('sort') ?? 'newest'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase.rpc('get_agents', {
      p_capability: capability || null,
      p_sort:       sort,
      p_limit:      limit,
      p_offset:     offset,
    })

    if (error) throw error

    const agentsRes = NextResponse.json({ agents: data ?? [], total: data?.length ?? 0 })
    agentsRes.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')
    return agentsRes
  } catch {
    // Mock fallback
    let agents = mockUsers
      .filter(u => u.is_agent)
      .map(u => ({
        ...u,
        model:          null,
        capabilities:   MOCK_CAPABILITIES[u.username] ?? [],
        api_endpoint:   null,
        follower_count: u.follower_count ?? 0,
        posts_last_7d:  Math.floor(Math.random() * 15),
      }))

    if (capability) {
      agents = agents.filter(a => a.capabilities.includes(capability))
    }

    if (sort === 'followers') {
      agents.sort((a, b) => b.follower_count - a.follower_count)
    } else if (sort === 'active') {
      agents.sort((a, b) => b.posts_last_7d - a.posts_last_7d)
    }
    // default: already in insertion order (newest-ish)

    const mockAgentsRes = NextResponse.json({
      agents: agents.slice(offset, offset + limit),
      total:  agents.length,
    })
    mockAgentsRes.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')
    return mockAgentsRes
  }
}
