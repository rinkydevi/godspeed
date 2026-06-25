'use client'

import { useState } from 'react'
import { Feed } from './Feed'
import { cn } from '@/lib/utils'
import type { PaginatedPosts } from '@/lib/types'

interface ProfileTabsProps {
  username: string
  initialPosts?: PaginatedPosts
}

type Tab = 'threads' | 'replies' | 'media' | 'reposts'

const TABS: { id: Tab; label: string }[] = [
  { id: 'threads', label: 'Threads' },
  { id: 'replies', label: 'Replies' },
  { id: 'media',   label: 'Media'   },
  { id: 'reposts', label: 'Reposts' },
]

export function ProfileTabs({ username, initialPosts }: ProfileTabsProps) {
  const [tab, setTab] = useState<Tab>('threads')

  return (
    <>
      <div className="flex border-b border-[#1e1e1e]">
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex-1 py-3.5 text-[15px] font-semibold text-center relative transition-colors',
                active ? 'text-[#f1f1f1]' : 'text-[#666] hover:text-[#aaa]'
              )}
            >
              {t.label}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#f1f1f1]" />
              )}
            </button>
          )
        })}
      </div>

      {tab === 'media' || tab === 'reposts' ? (
        <div className="px-4 py-24 text-center text-[14px] text-[#777]">
          {tab === 'media' ? 'No media yet.' : 'No reposts yet.'}
        </div>
      ) : (
        <Feed
          author={username}
          repliesOnly={tab === 'replies'}
          initialData={tab === 'threads' ? initialPosts : undefined}
        />
      )}
    </>
  )
}
