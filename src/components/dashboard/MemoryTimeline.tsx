'use client'

import { useState, useCallback } from 'react'
import MemoryCard from './MemoryCard'
import MemorySkeleton from './MemorySkeleton'
import type { Memory } from '@/types'

interface ActiveFilters {
  vault_type: string
  collection_id: string
  project_id: string
}

interface MemoryTimelineProps {
  initialMemories: Memory[]
  initialTotalPages: number
  activeFilters: ActiveFilters
}

export default function MemoryTimeline({
  initialMemories,
  initialTotalPages,
  activeFilters,
}: MemoryTimelineProps) {

  // Extra pages only — NOT a copy of initialMemories
  // initialMemories = server renders, always fresh
  const [extraMemories, setExtraMemories] = useState<Memory[]>([])
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [updatedMap, setUpdatedMap] = useState<Map<string, Memory>>(new Map())
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  // Merge: server data + extra pages, apply edits + deletes
  const memories = [
    ...initialMemories,
    ...extraMemories.filter(
      (m) => !initialMemories.find((im) => im.id === m.id)
    ),
  ]
    .filter((m) => !deletedIds.has(m.id))
    .map((m) => updatedMap.get(m.id) ?? m)

  // ── Event handlers ────────────────────────────

  const handleDeleted = useCallback((id: string) => {
    setDeletedIds((prev) => new Set([...prev, id]))
  }, [])

  const handleUpdated = useCallback((updated: Memory) => {
    setUpdatedMap((prev) => new Map([...prev, [updated.id, updated]]))
  }, [])

  const loadMore = useCallback(async () => {
    if (loading || page >= initialTotalPages) return
    setLoading(true)

    const params = new URLSearchParams({ page: String(page + 1) })
    if (activeFilters.vault_type)
      params.set('vault_type', activeFilters.vault_type)
    if (activeFilters.collection_id)
      params.set('collection_id', activeFilters.collection_id)
    if (activeFilters.project_id)
      params.set('project_id', activeFilters.project_id)

    const res = await fetch(`/api/memories?${params}`)
    const json = await res.json()

    // setState inside async callback = correct ✓
    setExtraMemories((prev) => [...prev, ...(json.data ?? [])])
    setPage((p) => p + 1)
    setLoading(false)
  }, [loading, page, initialTotalPages, activeFilters])

  // ── Render ────────────────────────────────────

  if (memories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-3xl">🧠</span>
        </div>
        <h3 className="text-white font-medium mb-2">No memories here</h3>
        <p className="text-zinc-500 text-sm max-w-xs">
          {activeFilters.vault_type ||
          activeFilters.collection_id ||
          activeFilters.project_id
            ? 'No memories match this filter.'
            : 'Click + to add your first memory.'}
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="grid gap-3">
        {memories.map((memory) => (
          <MemoryCard
            key={memory.id}
            memory={memory}
            onDeleted={handleDeleted}
            onUpdated={handleUpdated}
          />
        ))}
      </div>

      {page < initialTotalPages && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}

      {loading && (
        <div className="grid gap-3 mt-3">
          {[...Array(3)].map((_, i) => (
            <MemorySkeleton key={i} />
          ))}
        </div>
      )}
    </div>
  )
}