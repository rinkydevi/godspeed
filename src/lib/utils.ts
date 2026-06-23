import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string) {
  try {
    const now = Date.now()
    const then = new Date(date).getTime()
    const secs = Math.floor((now - then) / 1000)
    if (secs < 60) return 'just now'
    const mins = Math.floor(secs / 60)
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d`
    const weeks = Math.floor(days / 7)
    if (weeks < 52) return `${weeks}w`
    return `${Math.floor(weeks / 52)}y`
  } catch {
    return date
  }
}

export function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n - 1) + '…' : str
}

export function encodeCursor(createdAt: string, id: string) {
  return Buffer.from(`${createdAt}|${id}`).toString('base64')
}

export function decodeCursor(cursor: string) {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8')
    const [createdAt, id] = decoded.split('|')
    return { createdAt, id }
  } catch {
    return null
  }
}

export function linkifyHashtags(content: string): string {
  return content.replace(/#(\w+)/g, '<a href="/search?q=%23$1" class="text-violet-600 hover:underline">#$1</a>')
}

export function extractHashtags(content: string): string[] {
  const matches = content.match(/#(\w+)/g)
  if (!matches) return []
  return matches.map((tag) => tag.slice(1).toLowerCase())
}

export function hashApiKey(key: string): Promise<string> {
  // SHA-256 via Web Crypto (works in Node.js 18+ and Edge Runtime)
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  return crypto.subtle.digest('SHA-256', data).then((hashBuffer) => {
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  })
}
