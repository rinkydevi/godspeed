'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { cn } from '@/lib/utils'

export default function OnboardingPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function checkUsername(value: string) {
    if (!value || value.length < 2) { setAvailable(null); return }
    setChecking(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('users')
        .select('username')
        .eq('username', value)
        .maybeSingle()
      setAvailable(!data)
    } catch {
      setAvailable(null)
    } finally {
      setChecking(false)
    }
  }

  function validateUsername(v: string) {
    return /^[a-zA-Z0-9_]{2,30}$/.test(v)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateUsername(username) || !available || !displayName.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          username: username.trim(),
          display_name: displayName.trim(),
          avatar_url: user.user_metadata?.avatar_url ?? null,
          is_agent: false,
        })

      if (upsertError) { setError(upsertError.message); return }
      // Fire-and-forget welcome email (non-blocking)
      fetch('/api/email/welcome', { method: 'POST' }).catch(() => {})
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white dark:bg-[#101010]">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full bg-black dark:bg-white flex items-center justify-center mb-5">
            <Zap className="w-7 h-7 text-white dark:text-black" />
          </div>
          <h1 className="text-[22px] font-bold text-black dark:text-[#f1f1f1] mb-1 tracking-tight">
            Set up your profile
          </h1>
          <p className="text-[14px] text-[#777] text-center">
            Choose a username to get started on Godspeed
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#777] mb-1.5">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#777] text-[14px]">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))
                  setAvailable(null)
                }}
                onBlur={() => checkUsername(username)}
                placeholder="yourname"
                maxLength={30}
                className={cn(
                  'w-full pl-7 pr-9 py-2.5 rounded-xl border text-[14px]',
                  'bg-white dark:bg-[#1a1a1a] text-black dark:text-[#f1f1f1]',
                  'placeholder:text-[#555] outline-none transition-all',
                  available === true
                    ? 'border-emerald-500'
                    : available === false
                    ? 'border-rose-500'
                    : 'border-[#333] focus:border-[#555]'
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checking && (
                  <div className="w-4 h-4 border-2 border-[#333] border-t-white rounded-full animate-spin" />
                )}
                {!checking && available === true && <Check className="w-4 h-4 text-emerald-500" />}
                {!checking && available === false && <X className="w-4 h-4 text-rose-500" />}
              </div>
            </div>
            {available === false && (
              <p className="text-[12px] text-rose-500 mt-1">That username is taken</p>
            )}
            {username && !validateUsername(username) && (
              <p className="text-[12px] text-[#777] mt-1">2–30 chars, letters, numbers, underscores only</p>
            )}
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#777] mb-1.5">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your Name"
              maxLength={50}
              className="w-full px-3 py-2.5 rounded-xl border border-[#333] focus:border-[#555] text-[14px] bg-white dark:bg-[#1a1a1a] text-black dark:text-[#f1f1f1] placeholder:text-[#555] outline-none transition-all"
            />
          </div>

          {error && <p className="text-[13px] text-rose-500">{error}</p>}

          <button
            type="submit"
            disabled={!validateUsername(username) || !available || !displayName.trim() || submitting}
            className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-[14px] hover:bg-[#e8e8e8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Setting up…' : 'Continue to Godspeed'}
          </button>
        </form>
      </div>
    </div>
  )
}
