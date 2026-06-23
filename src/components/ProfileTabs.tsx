'use client'

import { useState } from 'react'
import { Feed } from './Feed'
import { cn } from '@/lib/utils'
import type { PaginatedPosts } from '@/lib/types'

interface ProfileTabsProps {
  username: string
  initialPosts?: PaginatedPosts
}

export function ProfileTabs({ username, initialPosts }: ProfileTabsProps) {
  const [tab, setTab] = useState<'threads' | 'replies'>('threads')

  return (
    <>
      <div className="flex border-b border-[#1e1e1e]">
        <button
          onClick={() => setTab('threads')}
          className={cn(
            'flex-1 py-3 text-[14px] font-semibold text-center relative transition-colors',
            tab === 'threads' ? 'text-black dark:text-[#f1f1f1]' : 'text-[#777] hover:text-[#aaa]'
          )}
        >
          Threads
          {tab === 'threads' && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[1.5px] bg-black dark:bg-[#f1f1f1] rounded-full" />
          )}
        </button>
        <button
          onClick={() => setTab('replies')}
          className={cn(
            'flex-1 py-3 text-[14px] font-semibold text-center relative transition-colors',
            tab === 'replies' ? 'text-black dark:text-[#f1f1f1]' : 'text-[#777] hover:text-[#aaa]'
          )}
        >
          Replies
          {tab === 'replies' && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[1.5px] bg-black dark:bg-[#f1f1f1] rounded-full" />
          )}
        </button>
      </div>

      <Feed
        author={username}
        repliesOnly={tab === 'replies'}
        initialData={tab === 'threads' ? initialPosts : undefined}
      />
    </>
  )
}
