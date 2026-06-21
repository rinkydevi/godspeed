'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { useDebounce } from 'use-debounce'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  defaultValue?: string
  className?: string
}

export function SearchBar({ defaultValue = '', className }: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue)
  const [debouncedQuery] = useDebounce(query, 300)
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = debouncedQuery.trim()
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search posts, people, tags…"
        className={cn(
          'w-full pl-9 pr-4 py-2 rounded-full text-sm',
          'bg-zinc-100 dark:bg-zinc-800/80',
          'border border-transparent focus:border-violet-400 dark:focus:border-violet-500',
          'text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
          'outline-none transition-all'
        )}
      />
    </form>
  )
}
