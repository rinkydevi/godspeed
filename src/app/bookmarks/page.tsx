'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
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

  const seen = new Set<string>()
  const allPosts = (data?.pages.flatMap((page) => page.posts) ?? []).filter((post) => {
    if (seen.has(post.id)) return false
    seen.add(post.id)
    return true
  })

  return (
    <div>
      <div className="sticky top-0 z-30 bg-[#101010]/95 backdrop-blur px-4 py-4 flex items-center justify-center">
        <h1 className="font-semibold text-[#f1f1f1] text-[15px]">Saved</h1>
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
        <div className="px-4 py-24 text-center text-[14px] text-[#777]">
          Posts that you save will appear here.
        </div>
      )}

      {!isLoading && !isError && allPosts.length > 0 && (
        <div>
          {allPosts.map((post: Post) => (
            <PostCard key={post.id} post={post} />
          ))}

          <div ref={sentinelRef} className="py-6 flex justify-center">
            {isFetchingNextPage && (
              <div className="w-5 h-5 rounded-full border-2 border-zinc-700 border-t-violet-500 animate-spin" />
            )}
            {!hasNextPage && allPosts.length > 0 && (
              <p className="text-xs text-zinc-600">you&apos;re all caught up</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
