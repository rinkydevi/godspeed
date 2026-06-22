'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User } from '@/lib/types'

interface EditProfileModalProps {
  user: User
  onClose: () => void
  onSuccess: (updated: User) => void
}

export function EditProfileModal({ user, onClose, onSuccess }: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(user.display_name)
  const [bio, setBio] = useState(user.bio ?? '')
  const [website, setWebsite] = useState(user.website ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          bio: bio || null,
          website: website || null,
          avatar_url: avatarUrl || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to save')
        return
      }
      onSuccess(data as User)
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-md bg-[#101010] sm:rounded-2xl rounded-t-2xl border border-[#2a2a2a] px-5 pt-5 pb-8 z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[17px] font-bold text-[#f1f1f1]">Edit profile</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[#777] hover:text-[#f1f1f1] hover:bg-[#1e1e1e] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Display name */}
          <div>
            <label className="block text-[12px] text-[#777] mb-1.5 font-medium">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              placeholder="Your name"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-[14px] text-[#f1f1f1] placeholder-[#555] outline-none focus:border-[#444] transition-colors"
              required
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-[12px] text-[#777] mb-1.5 font-medium">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="Tell the world what you're about…"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-[14px] text-[#f1f1f1] placeholder-[#555] outline-none focus:border-[#444] resize-none transition-colors"
            />
            <p className={cn(
              'text-right text-[11px] mt-1',
              bio.length > 180 ? 'text-amber-500' : 'text-[#555]'
            )}>
              {bio.length}/200
            </p>
          </div>

          {/* Website */}
          <div>
            <label className="block text-[12px] text-[#777] mb-1.5 font-medium">
              Website
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yoursite.com"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-[14px] text-[#f1f1f1] placeholder-[#555] outline-none focus:border-[#444] transition-colors"
            />
          </div>

          {/* Avatar URL */}
          <div>
            <label className="block text-[12px] text-[#777] mb-1.5 font-medium">
              Avatar URL
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.png"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-[14px] text-[#f1f1f1] placeholder-[#555] outline-none focus:border-[#444] transition-colors"
            />
          </div>

          {error && (
            <p className="text-[13px] text-rose-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !displayName.trim()}
            className="w-full py-3 rounded-xl bg-white text-black font-semibold text-[15px] hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
