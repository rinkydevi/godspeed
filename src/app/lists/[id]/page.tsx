'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { ChevronLeft, Lock, Globe, Users, Trash2 } from 'lucide-react'
import { PostCard } from '@/components/PostCard'
import { SkeletonPost } from '@/components/SkeletonPost'
import { Avatar } from '@/components/Avatar'
import { AgentBadge } from '@/components/AgentBadge'
import { cn } from '@/lib/utils'
import type { List, ListMember, PaginatedPosts } from '@/lib/types'

type Tab = 'feed' | 'members'

export default function ListDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('feed')
  const [deleting, setDeleting] = useState(false)

  const { data: listData, isLoading: listLoading, isError: listError } = useQuery<{
    list: List
    members: ListMember[]
  }>({
    queryKey: ['list', id],
    queryFn: async () => {
      const res = await fetch(`/api/lists/${id}`)
      if (!res.ok) throw new Error('List not found')
      return res.json()
    },
  })

  const {
    data: feedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: feedLoading,
  } = useInfiniteQuery({
    queryKey: ['list-feed', id],
    queryFn: async ({ pageParam }): Promise<PaginatedPosts> => {
      const params = new URLSearchParams()
      if (pageParam) params.set('cursor', pageParam as string)
      const res = await fetch(`/api/lists/${id}/feed?${params}`)
      if (!res.ok) return { posts: [], nextCursor: null, hasMore: false }
      return res.json()
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.hasMore ? last.nextCursor : undefined,
    enabled: tab === 'feed',
  })

  const allPosts = feedData?.pages.flatMap((p) => p.posts) ?? []
  const list = listData?.list
  const members = listData?.members ?? []

  async function handleDelete() {
    if (!confirm('Delete this list? This cannot be undone.')) return
    setDeleting(true)
    try {
      await fetch(`/api/lists/${id}`, { method: 'DELETE' })
      router.push('/lists')
    } catch {
      setDeleting(false)
    }
  }

  if (listLoading) {
    return (
      <div>
        <div className="sticky top-0 z-30 bg-[#101010]/95 backdrop-blur border-b border-[#1e1e1e] px-4 py-3 flex items-center gap-3">
          <Link href="/lists" className="text-[#777] hover:text-[#f1f1f1] transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="w-32 h-5 bg-[#1e1e1e] rounded animate-pulse" />
        </div>
        <SkeletonPost />
        <SkeletonPost />
      </div>
    )
  }

  if (listError || !list) {
    return (
      <div className="px-4 py-16 text-center text-[14px] text-[#777]">
        List not found.{' '}
        <Link href="/lists" className="text-violet-400 hover:underline">Back to Lists</Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#101010]/95 backdrop-blur border-b border-[#1e1e1e]">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/lists" className="text-[#777] hover:text-[#f1f1f1] transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-[#f1f1f1] text-[16px] truncate">{list.name}</h1>
              {list.is_public
                ? <Globe className="w-3.5 h-3.5 text-[#555] flex-shrink-0" />
                : <Lock className="w-3.5 h-3.5 text-[#555] flex-shrink-0" />
              }
            </div>
            {list.description && (
              <p className="text-[12px] text-[#777] truncate">{list.description}</p>
            )}
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-[#555] hover:text-rose-500 transition-colors disabled:opacity-40 p-1"
            aria-label="Delete list"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-[#1e1e1e]">
          {(['feed', 'members'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-3 text-[14px] font-medium capitalize transition-colors',
                tab === t ? 'text-[#f1f1f1] border-b-2 border-[#f1f1f1]' : 'text-[#777] hover:text-[#aaa]'
              )}
            >
              {t === 'members' ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Users className="w-4 h-4" />
                  Members ({list.member_count ?? members.length})
                </span>
              ) : 'Feed'}
            </button>
          ))}
        </div>
      </div>

      {/* Feed tab */}
      {tab === 'feed' && (
        <div>
          {feedLoading && (
            <>
              <SkeletonPost />
              <SkeletonPost />
              <SkeletonPost />
            </>
          )}
          {!feedLoading && allPosts.length === 0 && (
            <div className="px-4 py-16 text-center text-[14px] text-[#777]">
              No posts yet — add some members to this list.
            </div>
          )}
          {allPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          {(hasNextPage || isFetchingNextPage) && (
            <div className="px-4 py-4 text-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="text-sm text-violet-400 hover:underline font-medium disabled:opacity-50"
              >
                {isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Members tab */}
      {tab === 'members' && (
        <div>
          {members.length === 0 && (
            <div className="px-4 py-16 text-center text-[14px] text-[#777]">
              No members yet. Add agents or users to this list.
            </div>
          )}
          {members.map((member) => {
            const u = member.user
            if (!u) return null
            return (
              <Link
                key={member.user_id}
                href={`/${u.username}`}
                className="flex items-center gap-3 px-4 py-3 border-b border-[#1e1e1e] hover:bg-[#141414] transition-colors"
              >
                <Avatar src={u.avatar_url} name={u.display_name} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[14px] text-[#f1f1f1] truncate">
                      {u.display_name}
                    </span>
                    {u.is_agent && <AgentBadge />}
                  </div>
                  <span className="text-[13px] text-[#777]">@{u.username}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
