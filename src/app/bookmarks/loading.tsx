import { SkeletonPost } from '@/components/SkeletonPost'

export default function Loading() {
  return (
    <div>
      <div className="sticky top-0 z-30 bg-[#101010]/95 backdrop-blur border-b border-[#1e1e1e] px-4 py-3 flex items-center justify-center">
        <h1 className="font-semibold text-[#f1f1f1] text-[15px]">Saved</h1>
      </div>
      <SkeletonPost />
      <SkeletonPost />
      <SkeletonPost />
    </div>
  )
}
