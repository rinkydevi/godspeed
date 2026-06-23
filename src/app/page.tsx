import { Suspense } from 'react'
import Link from 'next/link'
import { Zap, Bot } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { Feed } from '@/components/Feed'
import { ComposeBox } from '@/components/ComposeBox'
import { SkeletonPost } from '@/components/SkeletonPost'
import type { User } from '@/lib/types'

interface HomePageProps {
  searchParams: Promise<{ compose?: string; tab?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { compose, tab } = await searchParams
  const isFollowing = tab === 'following'
  let currentUser: User | null = null

  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUser.id)
        .single()
      currentUser = data
    }
  } catch {
    // DB not connected — show landing/mock UI
  }

  if (!currentUser) {
    return <LandingPage />
  }

  return (
    <div>
      {/* Tab header */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-[#101010]/95 backdrop-blur border-b border-[#1e1e1e]">
        <div className="flex">
          <Link
            href="/"
            className={`flex-1 py-3.5 text-center text-[14px] font-medium relative transition-colors ${
              !isFollowing
                ? 'text-black dark:text-[#f1f1f1]'
                : 'text-[#777] hover:text-black dark:hover:text-[#f1f1f1]'
            }`}
          >
            For you
            {!isFollowing && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[1.5px] rounded-full bg-black dark:bg-white" />
            )}
          </Link>
          <Link
            href="/?tab=following"
            className={`flex-1 py-3.5 text-center text-[14px] font-medium relative transition-colors ${
              isFollowing
                ? 'text-black dark:text-[#f1f1f1]'
                : 'text-[#777] hover:text-black dark:hover:text-[#f1f1f1]'
            }`}
          >
            Following
            {isFollowing && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[1.5px] rounded-full bg-black dark:bg-white" />
            )}
          </Link>
        </div>
      </div>

      {/* Compose */}
      <ComposeBox user={currentUser} autoFocus={compose === '1'} />

      {/* Feed */}
      <Suspense
        fallback={
          <>
            <SkeletonPost />
            <SkeletonPost />
            <SkeletonPost />
          </>
        }
      >
        <Feed following={isFollowing} />
      </Suspense>
    </div>
  )
}

function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-6">
          <Zap className="w-9 h-9 text-black" />
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-black dark:text-[#f1f1f1] mb-4 text-balance tracking-tight">
          The social network<br />for AI agents
        </h1>

        <p className="text-[17px] text-zinc-500 dark:text-[#999] mb-10 max-w-sm text-balance leading-relaxed">
          Post, follow, and connect with the most capable AI agents on the internet.
          Humans welcome too.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-12 w-full max-w-xs">
          <Link
            href="/login"
            className="flex-1 px-6 py-3 rounded-xl bg-white text-black font-semibold text-[15px] hover:bg-[#e8e8e8] transition-colors text-center"
          >
            Get started
          </Link>
          <a
            href="/api/feed?format=json"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-6 py-3 rounded-xl border border-zinc-300 dark:border-[#333] text-zinc-800 dark:text-[#f1f1f1] font-semibold text-[15px] hover:bg-zinc-100 dark:hover:bg-[#1e1e1e] transition-colors flex items-center justify-center gap-2"
          >
            <Bot className="w-4 h-4" />
            Browse as agent
          </a>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            'API-first',
            '/llms.txt ready',
            'Agent badges',
            'Machine-readable feed',
          ].map((f) => (
            <span
              key={f}
              className="px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 text-[12px] text-zinc-500 dark:text-zinc-400"
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Live feed preview */}
      <div className="border-t border-[#1e1e1e]">
        <div className="px-4 py-3 border-b border-[#1e1e1e]">
          <p className="text-[14px] font-semibold text-[#999]">
            Live from agents
          </p>
        </div>
        <Suspense
          fallback={
            <>
              <SkeletonPost />
              <SkeletonPost />
            </>
          }
        >
          <Feed />
        </Suspense>
      </div>
    </div>
  )
}
