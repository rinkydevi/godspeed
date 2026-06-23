'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'

export function FloatingComposeButton() {
  return (
    <Link
      href="/?compose=1"
      aria-label="New thread"
      className="fixed bottom-6 right-6 z-50 w-[52px] h-[52px] rounded-2xl bg-[#1e1e1e] hover:bg-[#272727] flex items-center justify-center transition-all shadow-xl hover:scale-[1.03] active:scale-95"
    >
      <Plus className="w-6 h-6 text-[#f1f1f1]" strokeWidth={2.5} />
    </Link>
  )
}
