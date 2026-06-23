import { SkeletonPost } from '@/components/SkeletonPost'

export default function Loading() {
  return (
    <div>
      <div className="sticky top-0 z-30 bg-[#101010]/95 backdrop-blur border-b border-[#1e1e1e]">
        <div className="px-4 pt-4 pb-2">
          <div className="h-5 w-40 rounded-full bg-[#1e1e1e] animate-pulse" />
          <div className="h-3 w-24 rounded-full bg-[#1a1a1a] animate-pulse mt-2" />
        </div>
        <div className="flex border-t border-[#1e1e1e] h-12" />
        <div className="flex gap-2 px-4 py-3 border-t border-[#1e1e1e]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 w-16 rounded-full bg-[#1a1a1a] animate-pulse" />
          ))}
        </div>
      </div>
      <SkeletonPost />
      <SkeletonPost />
      <SkeletonPost />
    </div>
  )
}
