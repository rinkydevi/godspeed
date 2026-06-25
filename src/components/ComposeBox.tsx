'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import { Avatar } from './Avatar'
import { LinkPreview } from './LinkPreview'
import { cn } from '@/lib/utils'
import type { User } from '@/lib/types'

interface ComposeBoxProps {
  user: User | null
  replyToId?: string
  placeholder?: string
  onSuccess?: () => void
  autoFocus?: boolean
}

const GODSPEED_URL_RE =
  /(https?:\/\/[^/\s]+)?\/([a-zA-Z0-9_]+)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/

export function ComposeBox({
  user,
  replyToId,
  placeholder = "What's new?",
  onSuccess,
  autoFocus = false,
}: ComposeBoxProps) {
  const [content, setContent] = useState('')
  const [focused, setFocused] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [previewPostId, setPreviewPostId] = useState<string | null>(null)
  const [dismissedPreviewId, setDismissedPreviewId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const MAX_CHARS = 500

  useEffect(() => {
    const match = GODSPEED_URL_RE.exec(content)
    const found = match ? match[3] : null
    setPreviewPostId(found)
  }, [content])

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          reply_to_id: replyToId ?? null,
          image_url: imageUrl ?? null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to post')
      }
      return res.json()
    },
    onSuccess: () => {
      setContent('')
      setImageUrl(null)
      setPreviewPostId(null)
      setDismissedPreviewId(null)
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['post'] })
      onSuccess?.()
    },
  })

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError(null)
    setUploading(true)

    try {
      const presignRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
      })
      const presignData = await presignRes.json().catch(() => ({}))
      if (!presignRes.ok) {
        setUploadError(presignData.error ?? 'Upload failed')
        return
      }

      const uploadRes = await fetch(presignData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!uploadRes.ok) {
        setUploadError('Upload failed — please try again')
        return
      }

      setImageUrl(presignData.publicUrl)
    } catch {
      setUploadError('Upload failed — please try again')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  if (!user) {
    return (
      <div className="px-4 py-4 border-b border-[#262626] text-center text-[14px] text-[#777]">
        <Link href="/login" className="font-semibold text-[#f3f5f7] hover:underline">Sign in</Link> to post
      </div>
    )
  }

  const remaining = MAX_CHARS - content.length
  const isOverLimit = remaining < 0
  const isNearLimit = remaining <= 50 && remaining >= 0
  const canSubmit = content.trim().length > 0 && !isOverLimit && !mutation.isPending && !uploading

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSubmit) {
      e.preventDefault()
      mutation.mutate()
    }
  }

  const showPreview = !!previewPostId && previewPostId !== dismissedPreviewId

  return (
    <div className="border-b border-[#262626] px-4 md:px-6 py-3">
      <div className="flex gap-3 items-start">
        <Avatar src={user.avatar_url} name={user.display_name} size={36} />

        <div className="flex-1 min-w-0 pt-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="text-[14px] font-semibold text-[#f3f5f7] leading-tight">
            {user.username}
          </div>

          <div className="flex items-start gap-2 mt-0.5">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => !content && !imageUrl && setFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              autoFocus={autoFocus}
              rows={focused || content ? 3 : 1}
              className={cn(
                'flex-1 resize-none bg-transparent text-[#f3f5f7] placeholder:text-[#777]',
                'text-[15px] leading-[1.47] outline-none border-0 p-0'
              )}
            />

            {!focused && !content && !imageUrl && (
              <button
                disabled
                className="h-9 px-4 rounded-full text-[14px] font-semibold bg-[#f3f5f7]/95 text-[#777] cursor-not-allowed flex-shrink-0"
              >
                Post
              </button>
            )}
          </div>

          {showPreview && (
            <LinkPreview
              postId={previewPostId}
              onDismiss={() => setDismissedPreviewId(previewPostId)}
            />
          )}

          {imageUrl && (
            <div className="relative mt-3 rounded-xl overflow-hidden border border-[#262626] inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Attached image"
                className="max-h-48 max-w-full object-cover"
              />
              <button
                onClick={() => setImageUrl(null)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors"
                aria-label="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {(focused || content || imageUrl) && (
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-3">
                {!imageUrl && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    onMouseDown={(e) => e.preventDefault()}
                    disabled={uploading}
                    className="text-[#777] hover:text-[#f3f5f7] transition-colors disabled:opacity-50"
                    aria-label="Attach image"
                  >
                    {uploading
                      ? <Loader2 className="w-[22px] h-[22px] animate-spin" />
                      : <ImagePlus className="w-[22px] h-[22px]" strokeWidth={1.75} />
                    }
                  </button>
                )}

                {(isNearLimit || isOverLimit) && (
                  <span className={cn(
                    'text-xs font-medium tabular-nums',
                    isOverLimit ? 'text-[#ff3040]' : 'text-amber-500'
                  )}>
                    {remaining}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {uploadError && (
                  <span className="text-xs text-[#ff3040]">{uploadError}</span>
                )}
                {mutation.isError && (
                  <span className="text-xs text-[#ff3040]">
                    {mutation.error instanceof Error ? mutation.error.message : 'Failed to post'}
                  </span>
                )}
                <button
                  onClick={() => mutation.mutate()}
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={!canSubmit}
                  className={cn(
                    'h-9 px-4 rounded-full text-[14px] font-semibold transition-all',
                    canSubmit
                      ? 'bg-[#f3f5f7] text-black hover:bg-[#d8d8d8]'
                      : 'bg-[#f3f5f7]/95 text-[#777] cursor-not-allowed'
                  )}
                >
                  {mutation.isPending ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
