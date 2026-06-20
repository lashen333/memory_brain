// src\components\dashboard\DashboardHeader.tsx
'use client'

import { useState } from 'react'
import { Sparkles, Network } from 'lucide-react'
import SearchBar from './SearchBar'
import FilterBar from './FilterBar'
import ChatPanel from './ChatPanel'
import KnowledgeGraph from './KnowledgeGraph'

interface ActiveFilters {
  vault_type: string
  collection_id: string
  project_id: string
}

interface DashboardHeaderProps {
  count: number
  activeFilters: ActiveFilters
}

export default function DashboardHeader({
  count,
  activeFilters,
}: DashboardHeaderProps) {
  const [chatOpen, setChatOpen] = useState(false)
  const [graphOpen, setGraphOpen] = useState(false)

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4 mt-10">
          <div>
            <h1 className="text-xl font-semibold text-white">
              Your vault
            </h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {count} {count === 1 ? 'memory' : 'memories'}
            </p>
          </div>

          <div className="flex gap-2">
            {/* Graph button */}
            <button
              onClick={() => setGraphOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-xl transition-colors"
            >
              <Network size={14} />
              Graph
            </button>

            {/* Chat button */}
            <button
              onClick={() => setChatOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Sparkles size={14} />
              Ask AI
            </button>
          </div>
        </div>

        <div className="mb-3">
          <SearchBar />
        </div>

        <FilterBar active={activeFilters} />
      </div>

      {/* Chat panel */}
      {chatOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setChatOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-md z-50 shadow-2xl">
            <ChatPanel onClose={() => setChatOpen(false)} />
          </div>
        </>
      )}

      {/* Graph panel */}
      {graphOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setGraphOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg z-50 shadow-2xl">
            <KnowledgeGraph onClose={() => setGraphOpen(false)} />
          </div>
        </>
      )}
    </>
  )
}