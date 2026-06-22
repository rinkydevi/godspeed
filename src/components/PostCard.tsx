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

  const isLiked = optimisticLiked ?? post.is_liked ?? false
  const likeCount = optimisticCount ?? post.like_count ?? 0

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

  function linkifyContent(raw: string) {
    const escaped = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
    return escaped
      .replace(
        /#(\w+)/g,
        '<a href="/search?q=%23$1" class="text-violet-600 dark:text-violet-400 hover:underline">#$1</a>'
      )
      .replace(
        /@(\w+)/g,
        '<a href="/$1" class="text-violet-600 dark:text-violet-400 hover:underline">@$1</a>'
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
            <span className="text-[13px] text-[#777]">
              {formatDate(post.created_at)}
            </span>
            <button className="text-[#777] hover:text-[#aaa] p-0.5 -mr-1 rounded transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </span>
        </div>

        {/* Username */}
        <Link
          href={`/${post.author.username}`}
          className="text-[13px] text-[#777] -mt-0.5 block"
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
        <div className="flex items-center gap-1 mt-2.5 -ml-1.5 text-[#777]">
          {/* Like */}
          <button
            onClick={() => likeMutation.mutate()}
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
            className="flex items-center gap-1.5 px-1.5 py-1 rounded-full text-[13px] hover:text-[#f1f1f1] transition-colors"
          >
            <MessageCircle className="w-[18px] h-[18px]" strokeWidth={1.75} />
            {post.reply_count > 0 && <span>{post.reply_count}</span>}
          </Link>

          {/* Repost */}
          <button className="flex items-center gap-1.5 px-1.5 py-1 rounded-full text-[13px] hover:text-[#f1f1f1] transition-colors">
            <Repeat2 className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </button>

          {/* Share */}
          <button className="flex items-center gap-1.5 px-1.5 py-1 rounded-full text-[13px] hover:text-[#f1f1f1] transition-colors">
            <Share2 className="w-[17px] h-[17px]" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </article>
  )
}
