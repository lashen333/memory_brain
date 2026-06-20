// src\components\dashboard\UpcomingReminders.tsx
'use client'

import { useState, useEffect } from 'react'
import { Bell, Clock } from 'lucide-react'

interface Reminder {
  id: string
  intent: string
  trigger_at: string
}

export default function UpcomingReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)

  // External system: fetch on mount ✓
  useEffect(() => {
    fetch('/api/reminders')
      .then((res) => res.json())
      .then((json) => setReminders(json.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading || reminders.length === 0) return null

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Bell size={14} className="text-violet-400" />
        <span className="text-sm font-medium text-white">
          Upcoming reminders
        </span>
      </div>
      <div className="space-y-2">
        {reminders.slice(0, 3).map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-2 text-xs text-zinc-400"
          >
            <Clock size={11} className="text-zinc-600 flex-shrink-0" />
            <span className="flex-1 truncate">{r.intent}</span>
            <span className="text-zinc-600 flex-shrink-0">
              {new Date(r.trigger_at).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}