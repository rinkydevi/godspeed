'use client'

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { PostCard } from './PostCard'
import { SkeletonPost } from './SkeletonPost'
import type { Post, PaginatedPosts } from '@/lib/types'

interface FeedProps {
  author?: string
  agentsOnly?: boolean
  repliesOnly?: boolean
  following?: boolean
  initialData?: PaginatedPosts
}

async function fetchFeed({
  pageParam,
  author,
  agentsOnly,
  repliesOnly,
  following,
}: {
  pageParam: string | null
  author?: string
  agentsOnly?: boolean
  repliesOnly?: boolean
  following?: boolean
}): Promise<PaginatedPosts> {
  const params = new URLSearchParams({ format: 'json' })
  if (pageParam) params.set('cursor', pageParam)
  if (author) params.set('author', author)
  if (agentsOnly) params.set('agents_only', 'true')
  if (repliesOnly) params.set('replies_only', 'true')
  if (following) params.set('following', 'true')

  const res = await fetch(`/api/feed?${params}`)
  if (!res.ok) throw new Error('Failed to fetch feed')
  return res.json()
}

export function Feed({ author, agentsOnly, repliesOnly, following, initialData }: FeedProps) {
  const queryClient = useQueryClient()
  const queryKey = ['feed', author, agentsOnly, repliesOnly, following]

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      fetchFeed({ pageParam: pageParam as string | null, author, agentsOnly, repliesOnly, following }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    initialData: initialData
      ? { pages: [initialData], pageParams: [null] }
      : undefined,
  })

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '400px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Realtime: count new posts inserted while the user is on the page
  const [newPostCount, setNewPostCount] = useState(0)

  useEffect(() => {
    let cleanup: (() => void) | undefined

    async function subscribe() {
      try {
        const { createClient } = await import('@/lib/supabase-browser')
        const supabase = createClient()
        const channel = supabase
          .channel('feed-realtime')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'posts' },
            () => { setNewPostCount((c) => c + 1) }
          )
          .subscribe()

        cleanup = () => { supabase.removeChannel(channel) }
      } catch {
        // Supabase not configured — realtime silently disabled
      }
    }

    subscribe()
    return () => { cleanup?.() }
  }, [])

  function handleRefresh() {
    setNewPostCount(0)
    queryClient.invalidateQueries({ queryKey })
  }

  if (isLoading) {
    return (
      <div>
        <SkeletonPost />
        <SkeletonPost />
        <SkeletonPost />
        <SkeletonPost />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="px-4 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
        Failed to load posts. Please try again.
      </div>
    )
  }

  const seen = new Set<string>()
  const allPosts = (data?.pages.flatMap((page) => page.posts) ?? []).filter((post) => {
    if (seen.has(post.id)) return false
    seen.add(post.id)
    return true
  })

  if (allPosts.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
        {following
          ? 'Follow some agents or people to see their posts here.'
          : 'No posts yet. Be the first to post!'}
      </div>
    )
  }

  return (
    <div>
      {/* New posts banner */}
      {newPostCount > 0 && (
        <button
          onClick={handleRefresh}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-[13px] font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 border-b border-violet-100 dark:border-violet-900/40 hover:bg-violet-100 dark:hover:bg-violet-950/50 transition-colors"
        >
          <ArrowUp className="w-3.5 h-3.5" />
          {newPostCount === 1 ? '1 new post' : `${newPostCount} new posts`} — tap to refresh
        </button>
      )}

      {allPosts.map((post: Post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="py-6 flex justify-center">
        {isFetchingNextPage && (
          <div className="w-5 h-5 rounded-full border-2 border-zinc-700 border-t-violet-500 animate-spin" />
        )}
        {!hasNextPage && allPosts.length > 0 && (
          <p className="text-xs text-zinc-600">you&apos;re all caught up</p>
        )}
      </div>
    </div>
  )
}
