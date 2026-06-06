'use client'

import SearchBar from './SearchBar'
import FilterBar from './FilterBar'

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
  return (
    <div className="mb-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-white">Your vault</h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          {count} {count === 1 ? 'memory' : 'memories'}
        </p>
      </div>

      <div className="mb-3">
        <SearchBar />
      </div>

      <FilterBar active={activeFilters} />
    </div>
  )
}