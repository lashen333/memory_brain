// src\components\dashboard\InviteMemberModal.tsx
'use client'

import { useState } from 'react'
import { X, UserPlus, Check } from 'lucide-react'

interface Props {
  projectId: string
  projectName: string
  onClose: () => void
}

export default function InviteMemberModal({ projectId, projectName, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleInvite() {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    setSuccess('')

    const res = await fetch(`/api/projects/${projectId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })

    const json = await res.json()

    if (json.error) {
      setError(json.error)
      setLoading(false)
      return
    }

    setSuccess(`${json.data.email} added to ${projectName}!`)
    setEmail('')
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm mx-4">

        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white font-medium">Invite member</h2>
            <p className="text-zinc-500 text-xs mt-0.5">{projectName}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {success && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mb-4">
            <Check size={14} className="text-emerald-400" />
            <p className="text-emerald-400 text-xs">{success}</p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              placeholder="teammate@email.com"
              autoFocus
              className="w-full bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-blue-500 placeholder-zinc-600"
            />
            <p className="text-zinc-600 text-xs mt-1">
              They must have a Memory Vault account first.
            </p>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            onClick={handleInvite}
            disabled={loading || !email.trim()}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <UserPlus size={14} />
            {loading ? 'Adding...' : 'Send invite'}
          </button>
        </div>

      </div>
    </div>
  )
}