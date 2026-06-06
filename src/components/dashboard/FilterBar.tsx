// src\components\dashboard\FilterBar.tsx
'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { useVaultStore } from '@/lib/store/useVaultStore'

interface ActiveFilters {
  vault_type: string
  collection_id: string
  project_id: string
}

interface FilterBarProps {
  active: ActiveFilters
}

export default function FilterBar({ active }: FilterBarProps) {
  const { collections, projects } = useVaultStore()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function pushFilter(updates: Partial<ActiveFilters>) {
    const next = { ...active, ...updates }
    const params = new URLSearchParams()

    if (next.vault_type) params.set('vault_type', next.vault_type)
    if (next.collection_id) params.set('collection_id', next.collection_id)
    if (next.project_id) params.set('project_id', next.project_id)

    const url = params.toString()
      ? `${pathname}?${params}`
      : pathname

    startTransition(() => {
      router.push(url)
    })
  }

  function handleVaultChange(vault_type: string) {
    pushFilter({ vault_type, collection_id: '', project_id: '' })
  }

  function handleCollectionToggle(collection_id: string) {
    const next = active.collection_id === collection_id ? '' : collection_id
    pushFilter({ collection_id: next, project_id: '' })
  }

  function handleProjectToggle(project_id: string) {
    const next = active.project_id === project_id ? '' : project_id
    pushFilter({ project_id: next, collection_id: '' })
  }

  return (
    <div className={`
      flex items-center gap-2 flex-wrap mb-5 transition-opacity duration-150
      ${isPending ? 'opacity-60' : 'opacity-100'}
    `}>

      {/* All / Personal / Work */}
      {[
        { value: '', label: 'All' },
        { value: 'personal', label: 'Personal' },
        { value: 'work', label: 'Work' },
      ].map(({ value, label }) => (
        <button
          key={value}
          onClick={() => handleVaultChange(value)}
          className={`
            text-xs px-3 py-1.5 rounded-lg transition-colors font-medium
            ${active?.vault_type === value
              ? 'bg-violet-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }
          `}
        >
          {label}
        </button>
      ))}

      {(collections.length > 0 || projects.length > 0) && (
        <span className="text-zinc-700 select-none">|</span>
      )}

      {/* Collections */}
      {(active?.vault_type === '' || active?.vault_type === 'personal') &&
        collections.map((col) => (
          <button
            key={col.id}
            onClick={() => handleCollectionToggle(col.id)}
            className={`
              flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
              transition-colors
              ${active.collection_id === col.id
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }
            `}
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: col.color }}
            />
            {col.name}
          </button>
        ))
      }

      {/* Projects */}
      {(active?.vault_type === '' || active?.vault_type === 'work') &&
        projects.map((proj) => (
          <button
            key={proj.id}
            onClick={() => handleProjectToggle(proj.id)}
            className={`
              flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
              transition-colors
              ${active?.project_id === proj.id
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }
            `}
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: proj.color }}
            />
            {proj.name}
          </button>
        ))
      }

    </div>
  )
}