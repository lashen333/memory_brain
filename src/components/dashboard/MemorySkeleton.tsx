// src\components\dashboard\MemorySkeleton.tsx
export default function MemorySkeleton() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-zinc-800 rounded" />
          <div className="w-24 h-3 bg-zinc-800 rounded" />
        </div>
        <div className="w-16 h-5 bg-zinc-800 rounded-full" />
      </div>

      {/* Content lines */}
      <div className="space-y-2 mb-3">
        <div className="w-full h-3 bg-zinc-800 rounded" />
        <div className="w-full h-3 bg-zinc-800 rounded" />
        <div className="w-3/4 h-3 bg-zinc-800 rounded" />
      </div>

      {/* Footer */}
      <div className="w-16 h-3 bg-zinc-800 rounded" />
    </div>
  )
}