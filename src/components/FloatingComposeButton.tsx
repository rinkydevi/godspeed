'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'

export function FloatingComposeButton() {
  return (
    <Link
      href="/?compose=1"
      aria-label="New thread"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-[#2a2a2a] flex items-center justify-center transition-all shadow-2xl hover:scale-105 active:scale-95"
    >
      <Plus className="w-7 h-7 text-[#f1f1f1]" strokeWidth={2} />
    </Link>
  )
}
