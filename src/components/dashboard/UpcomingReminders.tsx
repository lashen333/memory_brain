// src\components\dashboard\UpcomingReminders.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, X, Clock, Check, Trash2, Calendar } from 'lucide-react'

interface Reminder {
  id: string
  intent: string
  trigger_at: string
  sent: boolean
  memories?: { content: string }
}

function formatTriggerTime(isoString: string): {
  label: string
  isPast: boolean
  isToday: boolean
} {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffMins = Math.round(diffMs / 60000)
  const isPast = diffMs < 0
  const isToday =
    date.toDateString() === now.toDateString()

  let label = ''
  if (isPast) {
    const absMins = Math.abs(diffMins)
    if (absMins < 60) label = `${absMins}m ago`
    else if (absMins < 1440) label = `${Math.floor(absMins / 60)}h ago`
    else label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } else if (diffMins < 60) {
    label = `in ${diffMins}m`
  } else if (isToday) {
    label = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  } else {
    label = date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return { label, isPast, isToday }
}

export default function UpcomingReminders() {
  const [open, setOpen] = useState(false)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchReminders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reminders?include_sent=true')
      const json = await res.json()
      setReminders(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  

  // External system: keyboard close ✓
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  async function handleDelete(id: string) {
    setDeletingId(id)
    await fetch(`/api/reminders/${id}`, { method: 'DELETE' })
    setReminders((prev) => prev.filter((r) => r.id !== id))
    setDeletingId(null)
  }

  const pending = reminders.filter((r) => !r.sent)
  const sent = reminders.filter((r) => r.sent)

  return (
    <>
      {/* Bell icon button */}
      <button
        onClick={() => {
          setOpen(true)
          fetchReminders()}}
        className="relative text-zinc-400 hover:text-white transition-colors"
        title="Reminders"
      >
        <Bell size={18} />
        {pending.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-violet-600 rounded-full flex items-center justify-center text-white text-[10px] font-medium">
            {pending.length > 9 ? '9+' : pending.length}
          </span>
        )}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sliding panel */}
      <div className={`
        fixed top-0 right-0 h-full w-full max-w-sm z-50
        bg-zinc-950 border-l border-zinc-800
        transform transition-transform duration-300 ease-in-out
        flex flex-col
        ${open ? 'translate-x-0' : 'translate-x-full'}
      `}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-violet-600 rounded-md flex items-center justify-center">
              <Bell size={12} className="text-white" />
            </div>
            <span className="text-sm font-medium text-white">
              Reminders
            </span>
            {pending.length > 0 && (
              <span className="text-xs bg-violet-600/20 text-violet-400 px-2 py-0.5 rounded-full">
                {pending.length} upcoming
              </span>
            )}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {loading ? (
            <div className="flex flex-col gap-3 p-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse">
                  <div className="h-3 bg-zinc-800 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-zinc-800 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : reminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
              <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4">
                <Bell size={20} className="text-zinc-700" />
              </div>
              <p className="text-zinc-400 font-medium mb-1">
                No reminders yet
              </p>
              <p className="text-zinc-600 text-sm">
                Save a note with a date or time — AI creates reminders automatically
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-6">

              {/* Pending reminders */}
              {pending.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                    Upcoming
                  </p>
                  <div className="space-y-2">
                    {pending
                      .sort((a, b) =>
                        new Date(a.trigger_at).getTime() -
                        new Date(b.trigger_at).getTime()
                      )
                      .map((reminder) => {
                        const { label, isPast, isToday } =
                          formatTriggerTime(reminder.trigger_at)
                        return (
                          <ReminderCard
                            key={reminder.id}
                            reminder={reminder}
                            timeLabel={label}
                            isPast={isPast}
                            isToday={isToday}
                            isSent={false}
                            onDelete={handleDelete}
                            deleting={deletingId === reminder.id}
                          />
                        )
                      })}
                  </div>
                </div>
              )}

              {/* Sent reminders */}
              {sent.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                    Sent
                  </p>
                  <div className="space-y-2">
                    {sent
                      .sort((a, b) =>
                        new Date(b.trigger_at).getTime() -
                        new Date(a.trigger_at).getTime()
                      )
                      .slice(0, 5)
                      .map((reminder) => {
                        const { label } = formatTriggerTime(
                          reminder.trigger_at
                        )
                        return (
                          <ReminderCard
                            key={reminder.id}
                            reminder={reminder}
                            timeLabel={label}
                            isPast={true}
                            isToday={false}
                            isSent={true}
                            onDelete={handleDelete}
                            deleting={deletingId === reminder.id}
                          />
                        )
                      })}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-zinc-800 flex-shrink-0">
          <p className="text-xs text-zinc-600 text-center">
            AI detects reminders from your saved notes automatically
          </p>
        </div>

      </div>
    </>
  )
}

// ── Reminder Card ────────────────────────────────
interface ReminderCardProps {
  reminder: Reminder
  timeLabel: string
  isPast: boolean
  isToday: boolean
  isSent: boolean
  onDelete: (id: string) => void
  deleting: boolean
}

function ReminderCard({
  reminder,
  timeLabel,
  isPast,
  isToday,
  isSent,
  onDelete,
  deleting,
}: ReminderCardProps) {
  return (
    <div className={`
      group relative bg-zinc-900 border rounded-xl p-4
      transition-all duration-150
      ${isSent
        ? 'border-zinc-800 opacity-60'
        : isToday
          ? 'border-violet-500/30 bg-violet-950/20'
          : 'border-zinc-800 hover:border-zinc-700'
      }
      ${deleting ? 'opacity-30 pointer-events-none' : ''}
    `}>

      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {isSent ? (
            <Check size={13} className="text-emerald-500 flex-shrink-0" />
          ) : (
            <Clock
              size={13}
              className={`flex-shrink-0 ${
                isToday ? 'text-violet-400' : 'text-zinc-500'
              }`}
            />
          )}
          <span
            className={`text-xs font-medium flex-shrink-0 ${
              isSent
                ? 'text-emerald-600'
                : isToday
                  ? 'text-violet-400'
                  : 'text-zinc-400'
            }`}
          >
            {timeLabel}
          </span>
        </div>

        <button
          onClick={() => onDelete(reminder.id)}
          className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-400 transition-all flex-shrink-0"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Intent text */}
      <p className="text-sm text-zinc-100 leading-snug mb-1">
        {reminder.intent}
      </p>

      {/* Date detail */}
      <div className="flex items-center gap-1 mt-2">
        <Calendar size={11} className="text-zinc-700" />
        <span className="text-xs text-zinc-600">
          {new Date(reminder.trigger_at).toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </span>
      </div>

    </div>
  )
}