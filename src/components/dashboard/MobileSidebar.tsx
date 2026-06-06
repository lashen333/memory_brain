'use client'

import { useState, useEffect } from 'react'
import { Menu, X, Brain } from 'lucide-react'
import Sidebar from './Sidebar'
import type { SidebarProps } from './Sidebar'  // ← import from Sidebar

// ← Reuse same type, no duplicate
export default function MobileSidebar(props: SidebarProps) {
  const [open, setOpen] = useState(false)

  // External system: body scroll lock ✓
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-14 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 z-40 md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="text-zinc-400 hover:text-white"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <div className="w-6 h-6 bg-violet-600 rounded-md flex items-center justify-center">
            <Brain size={12} className="text-white" />
          </div>
          <span className="font-semibold text-sm">Memory Vault</span>
        </div>
      </div>

      <div className="h-14 md:hidden" />

      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      <div className={`
        fixed top-0 left-0 h-full w-72 z-50
        transform transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="relative h-full">
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 text-zinc-500 hover:text-white z-10"
          >
            <X size={18} />
          </button>
          <Sidebar {...props} />
        </div>
      </div>
    </>
  )
}