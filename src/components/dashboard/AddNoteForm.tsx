'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { useToastStore } from '@/lib/store/useToastStore'
import { useVaultStore } from '@/lib/store/useVaultStore'  // ← store direct

// onSaved only — no collections/projects props needed
interface AddNoteFormProps {
  onSaved: () => void
}

export default function AddNoteForm({ onSaved }: AddNoteFormProps) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [vaultType, setVaultType] = useState<'personal' | 'work'>('personal')
  const [collectionId, setCollectionId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(false)

  const addToast = useToastStore((s) => s.addToast)
  const router = useRouter()

  // ← Read from store — always up to date
  const collections = useVaultStore((s) => s.collections)
  const projects = useVaultStore((s) => s.projects)

  function handleClose() {
    setOpen(false)
    setContent('')
    setCollectionId('')
    setProjectId('')
    setVaultType('personal')
  }

  async function handleSubmit() {
    if (!content.trim()) return
    setLoading(true)

    const res = await fetch('/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: content.trim(),
        vault_type: vaultType,
        collection_id: collectionId || null,
        project_id: projectId || null,
      }),
    })

    const json = await res.json()

    if (json.error) {
      addToast(json.error, 'error')
      setLoading(false)
      return
    }

    handleClose()
    setLoading(false)
    addToast('Memory saved to vault!', 'success')
    router.refresh()
    onSaved()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-violet-600 hover:bg-violet-500 rounded-full flex items-center justify-center shadow-lg transition-colors z-30"
      >
        <Plus size={20} className="text-white" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-4 z-30">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white">Add to vault</h3>
        <button
          onClick={handleClose}
          className="text-zinc-500 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Vault type toggle */}
      <div className="flex gap-2 mb-3">
        {(['personal', 'work'] as const).map((type) => (
          <button
            key={type}
            onClick={() => {
              setVaultType(type)
              setCollectionId('')
              setProjectId('')
            }}
            className={`
              flex-1 py-1.5 text-xs rounded-lg transition-colors capitalize
              ${vaultType === type
                ? type === 'personal'
                  ? 'bg-violet-600 text-white'
                  : 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }
            `}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Collection selector — personal */}
      {vaultType === 'personal' && collections.length > 0 && (
        <select
          value={collectionId}
          onChange={(e) => setCollectionId(e.target.value)}
          className="w-full bg-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-2 mb-3 border border-zinc-700 focus:outline-none"
        >
          <option value="">No collection</option>
          {collections.map((col) => (
            <option key={col.id} value={col.id}>
              {col.name}
            </option>
          ))}
        </select>
      )}

      {/* Project selector — work */}
      {vaultType === 'work' && (
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full bg-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-2 mb-3 border border-zinc-700 focus:outline-none"
        >
          <option value="">Select project</option>
          {projects.map((proj) => (
            <option key={proj.id} value={proj.id}>
              {proj.name}
            </option>
          ))}
        </select>
      )}

      {/* Work vault — no projects yet */}
      {vaultType === 'work' && projects.length === 0 && (
        <p className="text-zinc-600 text-xs mb-3">
          No projects yet. Create one from the sidebar.
        </p>
      )}

      {/* Content */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            handleSubmit()
          }
        }}
        placeholder="What did you learn or want to remember?"
        rows={4}
        autoFocus
        className="w-full bg-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 mb-2 border border-zinc-700 focus:outline-none focus:border-violet-500 resize-none placeholder-zinc-600"
      />

      <p className="text-zinc-600 text-xs mb-3">
        Press Ctrl+Enter to save
      </p>

      {/* Save button */}
      <button
        onClick={handleSubmit}
        disabled={loading || !content.trim()}
        className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
      >
        {loading ? 'Saving...' : 'Save to vault'}
      </button>

    </div>
  )
}