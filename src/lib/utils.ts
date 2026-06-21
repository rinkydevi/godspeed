import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string) {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
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
