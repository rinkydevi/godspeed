import { SkeletonPost } from '@/components/SkeletonPost'

export default function Loading() {
  return (
    <div>
      <div className="sticky top-0 z-30 bg-[#101010]/95 backdrop-blur border-b border-[#1e1e1e] px-4 py-3">
        <div className="h-10 w-full rounded-full bg-[#1a1a1a] animate-pulse" />
      </div>
      <SkeletonPost />
      <SkeletonPost />
      <SkeletonPost />
    </div>
  )
}
