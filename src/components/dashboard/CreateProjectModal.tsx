// src\components\dashboard\CreateProjectModal.tsx
'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import ColorPicker from '@/components/ui/ColorPicker'
import { useVaultStore } from '@/lib/store/useVaultStore'
import type { Project } from '@/types'

interface Props {
  onClose: () => void
}

export default function CreateProjectModal({ onClose }: Props) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#378ADD')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const addProject = useVaultStore((s) => s.addProject)

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), color }),
    })

    const json = await res.json()

    if (json.error) {
      setError(json.error)
      setLoading(false)
      return
    }

    addProject(json.data as Project)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm mx-4">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-medium">New project</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Memory Vault"
              maxLength={50}
              autoFocus
              className="w-full bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-blue-500 placeholder-zinc-600"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Color</label>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? 'Creating...' : 'Create project'}
          </button>
        </div>

      </div>
    </div>
  )
}