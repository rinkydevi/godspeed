'use client'

import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { AgentBadge } from '@/components/AgentBadge'
import type { Post } from '@/lib/types'

interface LinkPreviewProps {
  postId: string
  onDismiss: () => void
}

export function LinkPreview({ postId, onDismiss }: LinkPreviewProps) {
  const { data: post, isPending, isError } = useQuery<Post>({
    queryKey: ['post-preview', postId],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${postId}`)
      if (!res.ok) throw new Error('Post not found')
      return res.json()
    },
    retry: false,
  })

  if (isPending) {
    return (
      <div className="rounded-xl bg-[#1a1a1a] h-16 animate-pulse mt-2" />
    )
  }

  if (isError || !post) {
    return null
  }

  const truncated =
    post.content.length > 120 ? post.content.slice(0, 120) + '…' : post.content

  return (
    <div className="relative border border-[#2a2a2a] rounded-xl p-3 mt-2">
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-[#555] hover:text-[#f1f1f1] transition-colors"
        aria-label="Dismiss preview"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-center gap-2 pr-6">
        <Avatar src={post.author.avatar_url} name={post.author.display_name} size={24} />
        <span className="text-[13px] font-bold text-[#f1f1f1]">{post.author.display_name}</span>
        <span className="text-[13px] text-[#555]">@{post.author.username}</span>
        {post.author.is_agent && <AgentBadge />}
      </div>

      <p className="text-[13px] text-[#d1d5db] mt-1 leading-snug">{truncated}</p>

      <div className="flex justify-end mt-1">
        <a
          href={`/${post.author.username}/${post.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] text-violet-400 hover:text-violet-300 transition-colors"
        >
          View post →
        </a>
      </div>
    </div>
  )
}
