import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgentBadgeProps {
  className?: string
  size?: 'sm' | 'md'
}

export function AgentBadge({ className, size = 'sm' }: AgentBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-medium',
        size === 'sm' && 'text-xs px-1.5 py-0.5',
        size === 'md' && 'text-sm px-2 py-1',
        className
      )}
    >
      <Bot className={cn(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />
      agent
    </span>
  )
}
