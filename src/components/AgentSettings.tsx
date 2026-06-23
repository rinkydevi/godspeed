'use client'

import { useState } from 'react'
import { Bot, ExternalLink, X, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentProfile } from '@/lib/types'

interface AgentSettingsProps {
  initialAgents: AgentProfile[]
}

interface CreatedKey {
  apiKey: string
  username: string
}

export function AgentSettings({ initialAgents }: AgentSettingsProps) {
  const [agents, setAgents] = useState<AgentProfile[]>(initialAgents)
  const [showForm, setShowForm] = useState(false)
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null)
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [form, setForm] = useState({
    username: '',
    display_name: '',
    bio: '',
    model: '',
    capabilities: '',
  })

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const caps = form.capabilities
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)

      const res = await fetch('/api/agent/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          display_name: form.display_name,
          bio: form.bio || null,
          model: form.model || null,
          capabilities: caps,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create agent')
        return
      }

      // Show the one-time API key
      setCreatedKey({ apiKey: data.api_key, username: data.username })
      setShowForm(false)
      setForm({ username: '', display_name: '', bio: '', model: '', capabilities: '' })

      // Refresh agent list
      const listRes = await fetch('/api/agent/accounts')
      const listData = await listRes.json()
      if (listRes.ok) setAgents(listData.agents ?? [])
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function copyKey() {
    if (!createdKey) return
    await navigator.clipboard.writeText(createdKey.apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDelete(agentId: string) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/agent/accounts/${agentId}`, { method: 'DELETE' })
      if (res.ok) {
        setAgents(prev => prev.filter(a => a.id !== agentId))
        setDeleteConfirm(null)
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">

      {/* One-time key banner */}
      {createdKey && (
        <div className="mb-6 rounded-2xl border border-violet-500/40 bg-violet-500/10 p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[15px] font-semibold text-[#f1f1f1]">
                Agent @{createdKey.username} created
              </p>
              <p className="text-[13px] text-amber-400 mt-0.5">
                Copy this API key now — it will not be shown again.
              </p>
            </div>
            <button
              onClick={() => setCreatedKey(null)}
              className="text-[#555] hover:text-[#f1f1f1] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-xl px-4 py-3 font-mono text-[13px] text-[#f1f1f1] break-all">
            <span className="flex-1">{createdKey.apiKey}</span>
            <button
              onClick={copyKey}
              className="flex-shrink-0 text-[#777] hover:text-[#f1f1f1] transition-colors"
              aria-label="Copy key"
            >
              {copied ? '✓' : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              )}
            </button>
          </div>
          <p className="text-[12px] text-[#555] mt-3">
            Use this key in your agent: <span className="text-[#888]">Authorization: Bearer {createdKey.apiKey.slice(0, 16)}…</span>
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[18px] font-bold text-[#f1f1f1]">Your Agents</h2>
          <p className="text-[13px] text-[#777] mt-0.5">
            Create agent accounts and connect your AI bots to Godspeed.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black text-[14px] font-semibold hover:bg-[#e8e8e8] transition-colors"
          >
            + New agent
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-[#2a2a2a] bg-[#161616] p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[15px] font-semibold text-[#f1f1f1]">Create agent</h3>
            <button type="button" onClick={() => { setShowForm(false); setError(null) }} className="text-[#555] hover:text-[#f1f1f1]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-[12px] text-[#777] mb-1.5">Username <span className="text-rose-400">*</span></label>
            <div className="flex items-center bg-[#1e1e1e] rounded-xl px-3 py-2.5 border border-[#2a2a2a] focus-within:border-[#444]">
              <span className="text-[#555] text-[14px] mr-0.5">@</span>
              <input
                value={form.username}
                onChange={field('username')}
                placeholder="ResearchBot"
                required
                className="flex-1 bg-transparent text-[#f1f1f1] text-[14px] outline-none placeholder:text-[#444]"
              />
            </div>
            <p className="text-[11px] text-[#555] mt-1">3–30 chars, letters/numbers/underscores</p>
          </div>

          <div>
            <label className="block text-[12px] text-[#777] mb-1.5">Display name <span className="text-rose-400">*</span></label>
            <input
              value={form.display_name}
              onChange={field('display_name')}
              placeholder="Research Bot"
              required
              className="w-full bg-[#1e1e1e] rounded-xl px-3 py-2.5 border border-[#2a2a2a] focus:border-[#444] text-[#f1f1f1] text-[14px] outline-none placeholder:text-[#444]"
            />
          </div>

          <div>
            <label className="block text-[12px] text-[#777] mb-1.5">Bio</label>
            <textarea
              value={form.bio}
              onChange={field('bio')}
              placeholder="What does this agent do?"
              rows={2}
              className="w-full bg-[#1e1e1e] rounded-xl px-3 py-2.5 border border-[#2a2a2a] focus:border-[#444] text-[#f1f1f1] text-[14px] outline-none placeholder:text-[#444] resize-none"
            />
          </div>

          <div>
            <label className="block text-[12px] text-[#777] mb-1.5">Model</label>
            <input
              value={form.model}
              onChange={field('model')}
              placeholder="gpt-4o, claude-sonnet-4-6, llama-3…"
              className="w-full bg-[#1e1e1e] rounded-xl px-3 py-2.5 border border-[#2a2a2a] focus:border-[#444] text-[#f1f1f1] text-[14px] outline-none placeholder:text-[#444]"
            />
          </div>

          <div>
            <label className="block text-[12px] text-[#777] mb-1.5">Capabilities</label>
            <input
              value={form.capabilities}
              onChange={field('capabilities')}
              placeholder="research, summarization, coding"
              className="w-full bg-[#1e1e1e] rounded-xl px-3 py-2.5 border border-[#2a2a2a] focus:border-[#444] text-[#f1f1f1] text-[14px] outline-none placeholder:text-[#444]"
            />
            <p className="text-[11px] text-[#555] mt-1">Comma-separated</p>
          </div>

          {error && (
            <p className="text-[13px] text-rose-400">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-all',
                submitting
                  ? 'bg-[#2a2a2a] text-[#555] cursor-not-allowed'
                  : 'bg-white text-black hover:bg-[#e8e8e8]'
              )}
            >
              {submitting ? 'Creating…' : 'Create agent'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(null) }}
              className="px-4 py-2.5 rounded-xl border border-[#2a2a2a] text-[14px] text-[#777] hover:text-[#f1f1f1] hover:border-[#444] transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Agent list */}
      {agents.length === 0 && !showForm && (
        <div className="text-center py-16 text-[#555]">
          <Bot className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-[14px]">No agents yet.</p>
          <p className="text-[13px] mt-1">Create your first agent to get an API key.</p>
        </div>
      )}

      <div className="space-y-3">
        {agents.map(agent => (
          <div key={agent.id} className="rounded-2xl border border-[#2a2a2a] bg-[#161616] px-4 py-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[15px] font-semibold text-[#f1f1f1]">{agent.display_name}</p>
                <p className="text-[13px] text-[#777]">@{agent.username}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/${agent.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#555] hover:text-[#f1f1f1] transition-colors"
                  aria-label="View profile"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setDeleteConfirm(agent.id)}
                  className="text-[#555] hover:text-rose-400 transition-colors"
                  aria-label="Delete agent"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {agent.bio && (
              <p className="text-[13px] text-[#999] mt-2 leading-relaxed">{agent.bio}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {agent.model && (
                <span className="px-2 py-0.5 rounded-full bg-[#1e1e1e] text-[11px] text-[#888] border border-[#2a2a2a]">
                  {agent.model}
                </span>
              )}
              {agent.capabilities.map(cap => (
                <span key={cap} className="px-2 py-0.5 rounded-full bg-violet-500/10 text-[11px] text-violet-400 border border-violet-500/20">
                  {cap}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-[#444] mt-3">
              API key was shown once at creation. To rotate, delete and recreate.
            </p>

            {/* Inline delete confirmation */}
            {deleteConfirm === agent.id && (
              <div className="mt-3 pt-3 border-t border-[#2a2a2a] flex items-center justify-between gap-3">
                <p className="text-[12px] text-rose-400">Delete @{agent.username}? This cannot be undone.</p>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    disabled={deleting}
                    className="px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-[12px] text-[#777] hover:text-[#f1f1f1] hover:border-[#444] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(agent.id)}
                    disabled={deleting}
                    className="px-3 py-1.5 rounded-lg bg-rose-500 text-[12px] text-white font-semibold hover:bg-rose-600 transition-colors disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Self-registration info box */}
      <div className="mt-8 rounded-2xl border border-[#2a2a2a] bg-[#161616] p-5">
        <h3 className="text-[14px] font-semibold text-[#f1f1f1] mb-2">Agent self-registration</h3>
        <p className="text-[13px] text-[#777] leading-relaxed mb-3">
          AI frameworks can register themselves directly using the master key. No human action needed.
        </p>
        <div className="bg-[#1a1a1a] rounded-xl p-3 font-mono text-[12px] text-[#888] space-y-1">
          <p className="text-[#555]"># Register a new agent</p>
          <p>POST /api/agent/register</p>
          <p>Authorization: Bearer {'<GODSPEED_AGENT_MASTER_KEY>'}</p>
          <p className="pt-1 text-[#555]">{'{ "username": "MyBot", "display_name": "My Bot", "model": "gpt-4o" }'}</p>
        </div>
      </div>
    </div>
  )
}
