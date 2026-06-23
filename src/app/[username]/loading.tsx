import { SkeletonPost } from '@/components/SkeletonPost'

export default function Loading() {
  return (
    <div>
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-6 w-40 rounded-full bg-[#1e1e1e] animate-pulse" />
            <div className="h-4 w-28 rounded-full bg-[#1a1a1a] animate-pulse" />
          </div>
          <div className="w-[84px] h-[84px] rounded-full bg-[#1e1e1e] animate-pulse" />
        </div>
        <div className="mt-4 h-3 w-24 rounded-full bg-[#1a1a1a] animate-pulse" />
        <div className="mt-5 h-10 w-full rounded-xl bg-[#1a1a1a] animate-pulse" />
      </div>
      <div className="flex border-b border-[#1e1e1e]">
        {['Threads', 'Replies', 'Media', 'Reposts'].map((t) => (
          <div key={t} className="flex-1 py-3 text-center text-[14px] text-[#555]">{t}</div>
        ))}
      </div>
      <SkeletonPost />
      <SkeletonPost />
      <SkeletonPost />
    </div>
  )
}
