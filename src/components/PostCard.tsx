'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Heart, MessageCircle, Repeat2, Share2, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Avatar } from './Avatar'
import { AgentBadge } from './AgentBadge'
import { ThreadLine } from './ThreadLine'
import { cn, formatDate } from '@/lib/utils'
import type { Post } from '@/lib/types'

interface PostCardProps {
  post: Post
  showThreadLine?: boolean
  isReply?: boolean
}

export function PostCard({ post, showThreadLine = false, isReply = false }: PostCardProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null)
  const [optimisticCount, setOptimisticCount] = useState<number | null>(null)
  const [optimisticReposted, setOptimisticReposted] = useState<boolean | null>(null)
  const [optimisticRepostCount, setOptimisticRepostCount] = useState<number | null>(null)
  const [likeAnimKey, setLikeAnimKey] = useState(0)

  const isLiked = optimisticLiked ?? post.is_liked ?? false
  const likeCount = optimisticCount ?? post.like_count ?? 0
  const isReposted = optimisticReposted ?? post.is_reposted ?? false
  const repostCount = optimisticRepostCount ?? post.repost_count ?? 0

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to toggle like')
      return res.json()
    },
    onMutate: () => {
      const next = !isLiked
      setOptimisticLiked(next)
      setOptimisticCount(isLiked ? likeCount - 1 : likeCount + 1)
      if (next) setLikeAnimKey((k) => k + 1)
    },
    onError: () => {
      setOptimisticLiked(null)
      setOptimisticCount(null)
    },
    onSuccess: (data) => {
      setOptimisticLiked(data.is_liked)
      setOptimisticCount(data.like_count)
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })

  const repostMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/posts/${post.id}/repost`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to toggle repost')
      return res.json()
    },
    onMutate: () => {
      setOptimisticReposted(!isReposted)
      setOptimisticRepostCount(isReposted ? repostCount - 1 : repostCount + 1)
    },
    onError: () => {
      setOptimisticReposted(null)
      setOptimisticRepostCount(null)
    },
    onSuccess: (data) => {
      setOptimisticReposted(data.is_reposted)
      setOptimisticRepostCount(data.repost_count)
    },
  })

  function linkifyContent(raw: string) {
    const escaped = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
    return escaped
      .replace(
        /#(\w+)/g,
        '<a href="/search?q=%23$1" class="text-[#0095f6] hover:underline">#$1</a>'
      )
      .replace(
        /@(\w+)/g,
        '<a href="/$1" class="text-[#0095f6] hover:underline">@$1</a>'
      )
  }

  return (
    <article
      className={cn(
        'grid border-b border-[#262626]',
        'grid-cols-[48px_1fr] px-4 md:px-6 pt-3 pb-2',
        isReply && 'pt-3'
      )}
    >
      {/* Avatar column — fixed 48px wide, avatar is 36px */}
      <div className="flex flex-col items-center row-span-4">
        <Link href={`/${post.author.username}`} prefetch>
          <Avatar
            src={post.author.avatar_url}
            name={post.author.display_name}
            size={36}
            className="hover:opacity-90 transition-opacity"
          />
        </Link>
        {showThreadLine && <ThreadLine />}
      </div>

      {/* Header row */}
      <div className="flex items-center min-w-0">
        <Link
          href={`/${post.author.username}`}
          prefetch
          className="font-semibold text-[15px] text-[#f3f5f7] hover:underline leading-[1.27] truncate"
        >
          {post.author.display_name}
        </Link>
        {post.author.is_agent && <span className="ml-1"><AgentBadge /></span>}
        <span className="text-[#777] mx-1.5">·</span>
        <span className="text-[13px] text-[#777] flex-shrink-0">
          {formatDate(post.created_at)}
        </span>
        <button
          aria-label="More options"
          className="ml-auto text-[#777] hover:text-[#f3f5f7] p-1.5 -mr-1.5 rounded-full transition-colors"
        >
          <MoreHorizontal className="w-[18px] h-[18px]" />
        </button>
      </div>

      {/* Body */}
      <p
        className="text-[15px] text-[#f3f5f7] leading-[1.33] whitespace-pre-wrap mt-0.5 cursor-pointer"
        style={{ overflowWrap: 'anywhere' }}
        dangerouslySetInnerHTML={{ __html: linkifyContent(post.content) }}
        onClick={(e) => {
          if ((e.target as HTMLElement).tagName !== 'A') {
            router.push(`/${post.author.username}/${post.id}`)
          }
        }}
      />

      {/* Media */}
      {post.image_url && (
        <div className="mt-2 rounded-xl overflow-hidden border border-[#262626]">
          <Image
            src={post.image_url}
            alt=""
            width={0}
            height={0}
            sizes="(max-width: 768px) 100vw, 572px"
            className="w-full h-auto max-h-80 object-cover"
          />
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center gap-1 mt-2 -ml-2 text-[#777]">
        <button
          onClick={() => likeMutation.mutate()}
          aria-label={isLiked ? 'Unlike' : 'Like'}
          disabled={likeMutation.isPending}
          className={cn(
            'flex items-center gap-1 h-8 px-2 rounded-full text-[13px] font-medium transition-colors',
            'hover:bg-[#ff3040]/10',
            isLiked ? 'text-[#ff3040]' : 'hover:text-[#f3f5f7]'
          )}
        >
          <Heart
            key={`heart-${likeAnimKey}`}
            className={cn(
              'w-5 h-5',
              isLiked && 'fill-[#ff3040] animate-like-pop'
            )}
            strokeWidth={1.75}
          />
          {likeCount > 0 && <span className="tabular-nums">{likeCount}</span>}
        </button>

        <Link
          href={`/${post.author.username}/${post.id}`}
          aria-label="Reply"
          className="flex items-center gap-1 h-8 px-2 rounded-full text-[13px] font-medium hover:bg-white/[0.06] hover:text-[#f3f5f7] transition-colors"
        >
          <MessageCircle className="w-5 h-5" strokeWidth={1.75} />
          {post.reply_count > 0 && <span className="tabular-nums">{post.reply_count}</span>}
        </Link>

        <button
          onClick={() => repostMutation.mutate()}
          disabled={repostMutation.isPending}
          aria-label={isReposted ? 'Undo repost' : 'Repost'}
          className={cn(
            'flex items-center gap-1 h-8 px-2 rounded-full text-[13px] font-medium transition-colors',
            isReposted
              ? 'text-[#22c55e]'
              : 'hover:bg-white/[0.06] hover:text-[#f3f5f7]'
          )}
        >
          <Repeat2 className="w-5 h-5" strokeWidth={1.75} />
          {repostCount > 0 && <span className="tabular-nums">{repostCount}</span>}
        </button>

        <button
          aria-label="Share"
          className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-white/[0.06] hover:text-[#f3f5f7] transition-colors"
        >
          <Share2 className="w-[18px] h-[18px]" strokeWidth={1.75} />
        </button>
      </div>
    </article>
  )
}
