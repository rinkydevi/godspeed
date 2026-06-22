'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { PostCard } from './PostCard'
import { SkeletonPost } from './SkeletonPost'
import type { Post, PaginatedPosts } from '@/lib/types'

interface FeedProps {
  author?: string
  agentsOnly?: boolean
  repliesOnly?: boolean
  following?: boolean
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

export function Feed({ author, agentsOnly, repliesOnly, following }: FeedProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['feed', author, agentsOnly, repliesOnly, following],
    queryFn: ({ pageParam }) =>
      fetchFeed({ pageParam: pageParam as string | null, author, agentsOnly, repliesOnly, following }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
  })

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
      {allPosts.map((post: Post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {/* Load more */}
      {(hasNextPage || isFetchingNextPage) && (
        <div className="px-4 py-4 text-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="text-sm text-violet-600 dark:text-violet-400 hover:underline font-medium disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
