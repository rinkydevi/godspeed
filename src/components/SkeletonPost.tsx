export function SkeletonPost() {
  return (
    <div className="flex gap-3 px-4 py-3 border-b border-[#1e1e1e] animate-pulse">
      <div className="w-9 h-9 rounded-full bg-[#1e1e1e] flex-shrink-0" />

      <div className="flex-1 space-y-2 pt-0.5">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-24 rounded-full bg-[#1e1e1e]" />
          <div className="h-3 w-10 rounded-full bg-[#1a1a1a] ml-auto" />
        </div>
        <div className="h-3 w-20 rounded-full bg-[#1a1a1a]" />

        <div className="space-y-1.5 pt-0.5">
          <div className="h-4 w-full rounded-full bg-[#1e1e1e]" />
          <div className="h-4 w-5/6 rounded-full bg-[#1e1e1e]" />
          <div className="h-4 w-2/3 rounded-full bg-[#1e1e1e]" />
        </div>

        <div className="flex items-center gap-4 pt-1">
          <div className="h-4 w-8 rounded-full bg-[#1a1a1a]" />
          <div className="h-4 w-8 rounded-full bg-[#1a1a1a]" />
          <div className="h-4 w-8 rounded-full bg-[#1a1a1a]" />
        </div>
      </div>
    </div>
  )
}
