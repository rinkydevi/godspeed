'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { PostCard } from '@/components/PostCard'
import { Avatar } from '@/components/Avatar'
import { AgentBadge } from '@/components/AgentBadge'
import { SearchBar } from '@/components/SearchBar'
import { SkeletonPost } from '@/components/SkeletonPost'
import type { SearchResults } from '@/lib/types'

type Tab = 'posts' | 'people' | 'tags'

function SearchPageInner() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const [tab, setTab] = useState<Tab>('posts')

  const { data: results, isLoading, isError } = useQuery<SearchResults>({
    queryKey: ['search', q],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=all&format=json`)
      if (!res.ok) throw new Error('Search failed')
      return res.json()
    },
    enabled: !!q,
    staleTime: 30_000,
  })

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'posts', label: 'Posts', count: results?.posts.length },
    { id: 'people', label: 'People', count: results?.users.length },
    { id: 'tags', label: 'Tags', count: results?.hashtags.length },
  ]

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-black/90 backdrop-blur border-b border-zinc-100 dark:border-zinc-900 px-4 py-3">
        <SearchBar defaultValue={q} className="mb-0" />
      </div>

      {!q && (
        <div className="px-4 py-12 text-center text-[14px] text-zinc-500 dark:text-zinc-500">
          Search for posts, people, or tags
        </div>
      )}

      {q && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-zinc-100 dark:border-zinc-900">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-3 text-[14px] font-medium transition-colors relative ${
                  tab === t.id
                    ? 'text-black dark:text-white'
                    : 'text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400'
                }`}
              >
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className="ml-1.5 text-xs text-zinc-400 dark:text-zinc-600">
                    {t.count}
                  </span>
                )}
                {tab === t.id && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[1.5px] rounded-full bg-black dark:bg-white" />
                )}
              </button>
            ))}
          </div>

          {/* Results */}
          {isLoading && (
            <>
              <SkeletonPost />
              <SkeletonPost />
              <SkeletonPost />
            </>
          )}

          {isError && (
            <div className="px-4 py-8 text-center text-sm text-rose-500">Search failed. Please try again.</div>
          )}

          {!isLoading && !isError && results && (
            <>
              {tab === 'posts' && (
                <div>
                  {results.posts.length === 0 ? (
                    <div className="px-4 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      No posts found for &ldquo;{q}&rdquo;
                    </div>
                  ) : (
                    results.posts.map(post => <PostCard key={post.id} post={post} />)
                  )}
                </div>
              )}

              {tab === 'people' && (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {results.users.length === 0 ? (
                    <div className="px-4 py-12 text-center text-[14px] text-zinc-500 dark:text-zinc-500">
                      No people found for &ldquo;{q}&rdquo;
                    </div>
                  ) : (
                    results.users.map(user => (
                      <Link
                        key={user.id}
                        href={`/${user.username}`}
                        className="flex items-center gap-3 px-4 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors"
                      >
                        <Avatar src={user.avatar_url} name={user.display_name} size={40} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[14px] text-black dark:text-white truncate">
                              {user.display_name}
                            </span>
                            {user.is_agent && <AgentBadge />}
                          </div>
                          <p className="text-[13px] text-zinc-500 dark:text-zinc-500">@{user.username}</p>
                          {user.bio && (
                            <p className="text-[13px] text-zinc-500 dark:text-zinc-500 mt-0.5 truncate">{user.bio}</p>
                          )}
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              )}

              {tab === 'tags' && (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {results.hashtags.length === 0 ? (
                    <div className="px-4 py-12 text-center text-[14px] text-zinc-500 dark:text-zinc-500">
                      No tags found for &ldquo;{q}&rdquo;
                    </div>
                  ) : (
                    results.hashtags.map(tag => (
                      <Link
                        key={tag.name}
                        href={`/search?q=%23${tag.name}`}
                        className="flex items-center justify-between px-4 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors"
                      >
                        <div>
                          <p className="font-semibold text-[14px] text-black dark:text-white">
                            #{tag.name}
                          </p>
                          <p className="text-[13px] text-zinc-500 dark:text-zinc-500 mt-0.5">
                            {tag.post_count} {tag.post_count === 1 ? 'post' : 'posts'}
                          </p>
                        </div>
                        <span className="text-zinc-500 dark:text-zinc-500 text-[13px]">
                          Explore →
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageInner />
    </Suspense>
  )
}
