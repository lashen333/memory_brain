// src\components\ui\Toaster.tsx
'use client'

import { useToastStore } from '@/lib/store/useToastStore'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useEffect, useState } from 'react'

function ToastItem({ id, message, type }: {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}) {
  const [visible, setVisible] = useState(false)
  const removeToast = useToastStore((s) => s.removeToast)

  useEffect(() => {
    // Animate in
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  const styles = {
    success: 'bg-emerald-900/90 border-emerald-700 text-emerald-100',
    error: 'bg-red-900/90 border-red-700 text-red-100',
    info: 'bg-zinc-800/90 border-zinc-700 text-zinc-100',
  }

  const icons = {
    success: <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />,
    error: <AlertCircle size={15} className="text-red-400 flex-shrink-0" />,
    info: <Info size={15} className="text-zinc-400 flex-shrink-0" />,
  }

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border
        backdrop-blur-sm shadow-lg text-sm
        transition-all duration-300
        ${styles[type]}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      {icons[type]}
      <span className="flex-1">{message}</span>
      <button
        onClick={() => removeToast(id)}
        className="opacity-60 hover:opacity-100 transition-opacity"
      >
        <X size={13} />
      </button>
    </div>
  )
}

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} />
      ))}
    </div>
  )
}