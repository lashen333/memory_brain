// src\components\dashboard\DashboardClient.tsx
'use client'

import { useRouter } from 'next/navigation'
import MemoryTimeline from './MemoryTimeline'
import DashboardHeader from './DashboardHeader'
import AddNoteForm from './AddNoteForm'
import { useVaultStore } from '@/lib/store/useVaultStore'
import type { Memory, Collection, Project } from '@/types'

interface ActiveFilters {
  vault_type: string
  collection_id: string
  project_id: string
}

interface DashboardClientProps {
  initialMemories: Memory[]
  initialTotalPages: number
  initialCount: number
  collections: Collection[]
  projects: Project[]
  activeFilters: ActiveFilters
}

export default function DashboardClient({
  initialMemories,
  initialTotalPages,
  initialCount,
  collections,
  projects,
  activeFilters,
}: DashboardClientProps) {

  const router = useRouter()

   

  return (
    <div className="pt-14 md:pt-0 p-4 md:p-6 max-w-3xl mx-auto">

      <DashboardHeader
        count={initialCount}
        activeFilters={activeFilters}
      />

      <MemoryTimeline
        key={`${activeFilters.vault_type}-${activeFilters.collection_id}-${activeFilters.project_id}`}
        initialMemories={initialMemories}
        initialTotalPages={initialTotalPages}
        activeFilters={activeFilters}
      />

      <AddNoteForm
              
        onSaved={() => {
          // Router refresh — server re-fetches
          router.refresh()
        }}
      />

    </div>
  )
}