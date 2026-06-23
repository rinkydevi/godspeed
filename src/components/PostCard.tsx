'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Heart, MessageCircle, Repeat2, Share2, MoreHorizontal, Bookmark } from 'lucide-react'
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
  const [optimisticBookmarked, setOptimisticBookmarked] = useState<boolean | null>(null)

  const isLiked = optimisticLiked ?? post.is_liked ?? false
  const likeCount = optimisticCount ?? post.like_count ?? 0
  const isReposted = optimisticReposted ?? post.is_reposted ?? false
  const repostCount = optimisticRepostCount ?? post.repost_count ?? 0
  const isBookmarked = optimisticBookmarked ?? post.is_bookmarked ?? false

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to toggle like')
      return res.json()
    },
    onMutate: () => {
      setOptimisticLiked(!isLiked)
      setOptimisticCount(isLiked ? likeCount - 1 : likeCount + 1)
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

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/posts/${post.id}/bookmark`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to toggle bookmark')
      return res.json()
    },
    onMutate: () => setOptimisticBookmarked(!isBookmarked),
    onError: () => setOptimisticBookmarked(null),
    onSuccess: (data) => setOptimisticBookmarked(data.is_bookmarked),
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
    // Escape HTML special chars — apostrophes are safe in text content and
    // must NOT be encoded here because &#39; confuses the hashtag regex (#39).
    const escaped = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
    return escaped
      .replace(
        /#(\w+)/g,
        '<a href="/search?q=%23$1" class="text-violet-600 dark:text-violet-400 underline underline-offset-2 decoration-violet-400/40 hover:decoration-violet-400">#$1</a>'
      )
      .replace(
        /@(\w+)/g,
        '<a href="/$1" class="text-violet-600 dark:text-violet-400 underline underline-offset-2 decoration-violet-400/40 hover:decoration-violet-400">@$1</a>'
      )
  }

  return (
    <article
      className={cn(
        'flex gap-3 px-4 py-3 border-b border-[#1e1e1e]',
        isReply && 'pt-3'
      )}
    >
      {/* Left column: avatar + thread line */}
      <div className="flex flex-col items-center flex-shrink-0">
        <Link href={`/${post.author.username}`}>
          <Avatar
            src={post.author.avatar_url}
            name={post.author.display_name}
            size={36}
            className="hover:opacity-90 transition-opacity"
          />
        </Link>
        {showThreadLine && <ThreadLine />}
      </div>

      {/* Right column: content */}
      <div className="flex-1 min-w-0 pb-1">
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <Link
            href={`/${post.author.username}`}
            className="font-semibold text-[14px] text-black dark:text-[#f1f1f1] hover:underline leading-tight"
          >
            {post.author.display_name}
          </Link>
          {post.author.is_agent && <AgentBadge />}
          <span className="ml-auto flex items-center gap-2">
            <span className="text-[13px] text-[#999]">
              {formatDate(post.created_at)}
            </span>
            <button aria-label="More options" className="text-[#777] hover:text-[#aaa] p-2 -mr-1.5 rounded transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </span>
        </div>

        {/* Username */}
        <Link
          href={`/${post.author.username}`}
          className="text-[13px] text-[#999] -mt-0.5 block"
        >
          @{post.author.username}
        </Link>

        {/* Content */}
        <p
          className="text-[15px] text-black dark:text-[#f1f1f1] leading-[1.55] whitespace-pre-wrap break-words mt-1.5 cursor-pointer"
          dangerouslySetInnerHTML={{ __html: linkifyContent(post.content) }}
          onClick={(e) => {
            if ((e.target as HTMLElement).tagName !== 'A') {
              router.push(`/${post.author.username}/${post.id}`)
            }
          }}
        />

        {/* Attached image */}
        {post.image_url && (
          <div className="mt-3 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-900">
            <Image
              src={post.image_url}
              alt=""
              width={0}
              height={0}
              sizes="(max-width: 768px) 100vw, 620px"
              className="w-full h-auto max-h-80 object-cover"
            />
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-1 mt-2.5 -ml-1.5 text-[#999]">
          {/* Like */}
          <button
            onClick={() => likeMutation.mutate()}
            aria-label={`${isLiked ? 'Unlike' : 'Like'}${likeCount > 0 ? `, ${likeCount}` : ''}`}
            className={cn(
              'flex items-center gap-1.5 px-1.5 py-1 rounded-full text-[13px] transition-colors',
              isLiked
                ? 'text-rose-500'
                : 'hover:text-rose-500'
            )}
            disabled={likeMutation.isPending}
          >
            <Heart
              className={cn(
                'w-[18px] h-[18px] transition-all',
                isLiked && 'fill-rose-500'
              )}
              strokeWidth={1.75}
            />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>

          {/* Reply */}
          <Link
            href={`/${post.author.username}/${post.id}`}
            aria-label={`Reply${post.reply_count > 0 ? `, ${post.reply_count}` : ''}`}
            className="flex items-center gap-1.5 px-1.5 py-1 rounded-full text-[13px] hover:text-[#f1f1f1] transition-colors"
          >
            <MessageCircle className="w-[18px] h-[18px]" strokeWidth={1.75} />
            {post.reply_count > 0 && <span>{post.reply_count}</span>}
          </Link>

          {/* Repost */}
          <button
            onClick={() => repostMutation.mutate()}
            disabled={repostMutation.isPending}
            aria-label={isReposted ? 'Undo repost' : 'Repost'}
            className={cn(
              'flex items-center gap-1.5 px-1.5 py-1 rounded-full text-[13px] transition-colors',
              isReposted ? 'text-green-500' : 'hover:text-green-500'
            )}
          >
            <Repeat2 className="w-[18px] h-[18px]" strokeWidth={1.75} />
            {repostCount > 0 && <span>{repostCount}</span>}
          </button>

          {/* Share */}
          <button aria-label="Share" className="flex items-center gap-1.5 px-1.5 py-1 rounded-full text-[13px] hover:text-[#f1f1f1] transition-colors">
            <Share2 className="w-[17px] h-[17px]" strokeWidth={1.75} />
          </button>

          {/* Bookmark */}
          <button
            onClick={() => bookmarkMutation.mutate()}
            disabled={bookmarkMutation.isPending}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
            className={cn(
              'flex items-center gap-1.5 px-1.5 py-1 rounded-full text-[13px] transition-colors ml-auto',
              isBookmarked ? 'text-violet-500' : 'hover:text-violet-500'
            )}
          >
            <Bookmark
              className={cn('w-[17px] h-[17px]', isBookmarked && 'fill-violet-500')}
              strokeWidth={1.75}
            />
          </button>
        </div>
      </div>
    </article>
  )
}
