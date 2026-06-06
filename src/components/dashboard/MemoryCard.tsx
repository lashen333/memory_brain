// src\components\dashboard\MemoryCard.tsx
'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Globe, FolderOpen, Briefcase,
  ExternalLink, Pencil, Trash2,
  Check, X,
} from 'lucide-react'
import { useToastStore } from '@/lib/store/useToastStore'
import type { Memory } from '@/types'

interface MemoryCardProps {
  memory: Memory
  onDeleted: (id: string) => void
  onUpdated: (updated: Memory) => void
}

export default function MemoryCard({
  memory,
  onDeleted,
  onUpdated,
}: MemoryCardProps) {
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(memory.content)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  const timeAgo = formatDistanceToNow(new Date(memory.created_at), {
    addSuffix: true,
  })

  const domain = memory.url
    ? (() => {
        try { return new URL(memory.url).hostname }
        catch { return null }
      })()
    : null

  // ── Edit ──────────────────────────────────────
  async function handleSaveEdit() {
    if (!editContent.trim() || editContent === memory.content) {
      setEditing(false)
      return
    }

    setSaving(true)

    const res = await fetch(`/api/memories/${memory.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent.trim() }),
    })

    const json = await res.json()
    setSaving(false)

    if (json.error) {
      addToast(json.error, 'error')
      return
    }

    onUpdated(json.data)
    setEditing(false)
    addToast('Memory updated', 'success')
  }

  function handleCancelEdit() {
    setEditContent(memory.content)
    setEditing(false)
  }

  // ── Delete ────────────────────────────────────
  async function handleDelete() {
    if (!confirm('Delete this memory? This cannot be undone.')) return

    setDeleting(true)

    const res = await fetch(`/api/memories/${memory.id}`, {
      method: 'DELETE',
    })

    const json = await res.json()

    if (json.error) {
      addToast(json.error, 'error')
      setDeleting(false)
      return
    }

    onDeleted(memory.id)
    addToast('Memory deleted', 'success')
  }

  // ── Render ────────────────────────────────────
  return (
    <div className={`
      group bg-zinc-900 border border-zinc-800 rounded-xl p-4
      hover:border-zinc-700 transition-all
      ${deleting ? 'opacity-50 pointer-events-none' : ''}
    `}>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {domain ? (
            <img
              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
              alt=""
              className="w-4 h-4 rounded flex-shrink-0"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          ) : (
            <div className="w-4 h-4 bg-zinc-700 rounded flex-shrink-0" />
          )}
          <span className="text-xs text-zinc-400 truncate">
            {memory.source_title ?? domain ?? 'Manual note'}
          </span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Vault badge */}
          <span className={`
            text-xs px-2 py-0.5 rounded-full flex items-center gap-1
            ${memory.vault_type === 'personal'
              ? 'bg-violet-500/10 text-violet-400'
              : 'bg-blue-500/10 text-blue-400'
            }
          `}>
            {memory.vault_type === 'personal'
              ? <FolderOpen size={10} />
              : <Briefcase size={10} />
            }
            {memory.vault_type}
          </span>

          {/* Action buttons — show on hover */}
          {!editing && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
              <button
                onClick={() => setEditing(true)}
                className="p-1 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                title="Edit"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={handleDelete}
                className="p-1 rounded-md text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content — edit mode or read mode */}
      {editing ? (
        <div className="mb-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
            autoFocus
            className="w-full bg-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 border border-violet-500 focus:outline-none resize-none"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
            >
              <Check size={12} />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors"
            >
              <X size={12} />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-zinc-100 leading-relaxed line-clamp-3 mb-3">
          {memory.content}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-600">{timeAgo}</span>
        {memory.url && !editing && (
          <a
            href={memory.url}
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-zinc-400"
          >
            <ExternalLink size={12} />
          </a>
        )}
      </div>

    </div>
  )
}