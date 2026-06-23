'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { PostCard } from '@/components/PostCard'
import { SkeletonPost } from '@/components/SkeletonPost'
import type { Post, PaginatedPosts } from '@/lib/types'

async function fetchBookmarks({ pageParam }: { pageParam: string | null }): Promise<PaginatedPosts> {
  const params = new URLSearchParams()
  if (pageParam) params.set('cursor', pageParam)
  const res = await fetch(`/api/bookmarks?${params}`)
  if (!res.ok) return { posts: [], nextCursor: null, hasMore: false }
  return res.json()
}

export default function BookmarksPage() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['bookmarks'],
    queryFn: ({ pageParam }) => fetchBookmarks({ pageParam: pageParam as string | null }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
  })

  const seen = new Set<string>()
  const allPosts = (data?.pages.flatMap((page) => page.posts) ?? []).filter((post) => {
    if (seen.has(post.id)) return false
    seen.add(post.id)
    return true
  })

  return (
    <div>
      <div className="sticky top-0 z-30 bg-[#101010]/95 backdrop-blur border-b border-[#1e1e1e] px-4 py-3">
        <h1 className="font-bold text-[#f1f1f1] text-[16px]">Bookmarks</h1>
      </div>

      {isLoading && (
        <>
          <SkeletonPost />
          <SkeletonPost />
          <SkeletonPost />
        </>
      )}

      {isError && (
        <div className="px-4 py-12 text-center text-sm text-[#777]">
          Failed to load bookmarks.
        </div>
      )}

      {!isLoading && !isError && allPosts.length === 0 && (
        <div className="px-4 py-16 text-center text-[14px] text-[#777]">
          No bookmarks yet — tap the bookmark icon on any post
        </div>
      )}

      {!isLoading && !isError && allPosts.length > 0 && (
        <div>
          {allPosts.map((post: Post) => (
            <PostCard key={post.id} post={post} />
          ))}

          {(hasNextPage || isFetchingNextPage) && (
            <div className="px-4 py-4 text-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="text-sm text-violet-400 hover:underline font-medium disabled:opacity-50"
              >
                {isFetchingNextPage ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
