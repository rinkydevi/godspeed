'use client'

import { useState, useRef } from 'react'
import { X, Upload, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from './Avatar'
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
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      const presignRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size, bucket: 'avatars' }),
      })
      const presignData = await presignRes.json().catch(() => ({}))
      if (!presignRes.ok) { setUploadError(presignData.error ?? 'Upload failed'); return }
      const uploadRes = await fetch(presignData.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      if (!uploadRes.ok) { setUploadError('Upload failed — please try again'); return }
      setAvatarUrl(presignData.publicUrl)
    } catch {
      setUploadError('Upload failed — please try again')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

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

      {/* Sheet — bottom-docked on mobile, centered on desktop */}
      <div className="relative w-full sm:max-w-[560px] bg-[#181818] sm:rounded-2xl rounded-t-2xl border border-[#262626] px-5 pt-3 pb-8 z-10 max-h-[85vh] overflow-y-auto">
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden w-9 h-1 rounded-full bg-[#3c3c3c] mx-auto mb-3" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5 sm:pt-2">
          <button
            onClick={onClose}
            className="text-[15px] font-medium text-[#f3f5f7] hover:text-[#777] transition-colors sm:hidden"
          >
            Cancel
          </button>
          <h2 className="text-[16px] font-bold text-[#f3f5f7] sm:mx-0 mx-auto">Edit profile</h2>
          <button
            onClick={onClose}
            className="hidden sm:flex w-8 h-8 items-center justify-center rounded-full text-[#777] hover:text-[#f3f5f7] hover:bg-[#1e1e1e] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="sm:hidden w-[60px]" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar src={avatarUrl || null} name={displayName || user.display_name} size={56} />
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#333] text-[13px] text-[#f3f5f7] hover:bg-[#1e1e1e] transition-colors disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                Change photo
              </button>
              {uploadError && <p className="text-[11px] text-rose-500 mt-1">{uploadError}</p>}
            </div>
            <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleAvatarChange} />
          </div>

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
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-3.5 py-2.5 text-[14px] text-[#f3f5f7] placeholder-[#555] outline-none focus:border-[#444] transition-colors"
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
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-3.5 py-2.5 text-[14px] text-[#f3f5f7] placeholder-[#555] outline-none focus:border-[#444] resize-none transition-colors"
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
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-3.5 py-2.5 text-[14px] text-[#f3f5f7] placeholder-[#555] outline-none focus:border-[#444] transition-colors"
            />
          </div>

          {error && (
            <p className="text-[13px] text-rose-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !displayName.trim()}
            className="w-full h-11 rounded-xl bg-[#f3f5f7] text-black font-semibold text-[15px] hover:bg-[#d8d8d8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
