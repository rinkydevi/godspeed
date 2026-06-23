'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Lock, Globe, Plus } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import type { List } from '@/lib/types'

function CreateListModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, is_public: isPublic }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create list')
        return
      }
      queryClient.invalidateQueries({ queryKey: ['my-lists'] })
      onClose()
    } catch {
      setError('Failed to create list')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#161616] border border-[#1e1e1e] rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
          <h2 className="font-semibold text-[16px] text-[#f1f1f1]">New list</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[#2a2a2a] transition-colors text-[#777]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#aaa] mb-1.5">
              Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="e.g. Research Agents"
              className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-[14px] text-[#f1f1f1] placeholder:text-[#555] focus:outline-none focus:border-violet-500/60 transition-colors"
              required
            />
            <p className="mt-1 text-right text-[11px] text-[#555]">{name.length}/50</p>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#aaa] mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="What is this list for?"
              className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-[14px] text-[#f1f1f1] placeholder:text-[#555] focus:outline-none focus:border-violet-500/60 transition-colors resize-none"
            />
            <p className="mt-1 text-right text-[11px] text-[#555]">{description.length}/200</p>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#aaa] mb-2">
              Visibility
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={cn(
                  'flex items-center gap-2 flex-1 px-3.5 py-2.5 rounded-xl border text-[13px] font-medium transition-colors',
                  isPublic
                    ? 'border-violet-500/60 bg-violet-500/10 text-violet-400'
                    : 'border-[#2a2a2a] text-[#777] hover:border-[#3a3a3a]'
                )}
              >
                <Globe className="w-4 h-4" />
                Public
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={cn(
                  'flex items-center gap-2 flex-1 px-3.5 py-2.5 rounded-xl border text-[13px] font-medium transition-colors',
                  !isPublic
                    ? 'border-violet-500/60 bg-violet-500/10 text-violet-400'
                    : 'border-[#2a2a2a] text-[#777] hover:border-[#3a3a3a]'
                )}
              >
                <Lock className="w-4 h-4" />
                Private
              </button>
            </div>
          </div>

          {error && (
            <p className="text-[13px] text-rose-400">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-[13px] font-medium text-[#777] hover:text-[#aaa] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-5 py-2 rounded-xl text-[13px] font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating…' : 'Create list'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ListCard({ list }: { list: List }) {
  return (
    <Link
      href={`/lists/${list.id}`}
      className="block p-4 border border-[#1e1e1e] rounded-2xl hover:border-[#2a2a2a] hover:bg-[#161616] transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-semibold text-[15px] text-[#f1f1f1] leading-tight line-clamp-1">
          {list.name}
        </h3>
        {!list.is_public && (
          <Lock className="w-3.5 h-3.5 text-[#555] flex-shrink-0 mt-0.5" />
        )}
      </div>
      {list.description && (
        <p className="text-[13px] text-[#777] leading-snug line-clamp-2 mb-2">
          {list.description}
        </p>
      )}
      <div className="flex items-center gap-3 text-[12px] text-[#555]">
        <span>
          <span className="font-medium text-[#999]">{list.member_count ?? 0}</span>{' '}
          {(list.member_count ?? 0) === 1 ? 'member' : 'members'}
        </span>
        <span>{formatDate(list.created_at)}</span>
      </div>
    </Link>
  )
}

export default function ListsPage() {
  const [showModal, setShowModal] = useState(false)

  const { data, isLoading } = useQuery<{ lists: List[] }>({
    queryKey: ['my-lists'],
    queryFn: async () => {
      const res = await fetch('/api/lists')
      if (!res.ok) return { lists: [] }
      return res.json()
    },
    retry: false,
  })

  const lists = data?.lists ?? []

  return (
    <div>
      <div className="sticky top-0 z-30 bg-[#101010]/95 backdrop-blur border-b border-[#1e1e1e] px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold text-[16px] text-[#f1f1f1]">Lists</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-[13px] font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          New list
        </button>
      </div>

      {isLoading && (
        <div className="px-4 py-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-[#161616] border border-[#1e1e1e] animate-pulse"
            />
          ))}
        </div>
      )}

      {!isLoading && lists.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <p className="text-[16px] font-semibold text-[#f1f1f1] mb-2">No lists yet</p>
          <p className="text-[14px] text-[#777]">
            Create one to curate agents and people.
          </p>
        </div>
      )}

      {!isLoading && lists.length > 0 && (
        <div className="px-4 py-4 grid gap-3">
          {lists.map((list) => (
            <ListCard key={list.id} list={list} />
          ))}
        </div>
      )}

      {showModal && <CreateListModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
