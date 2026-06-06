'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import MemoryCard from './MemoryCard'
import MemorySkeleton from './MemorySkeleton'
import type { Memory } from '@/types'

// ── Debounce hook (setState නැහැ — value only) ──────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value)
    }, delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Memory[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [searchType, setSearchType] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const debouncedQuery = useDebounce(query, 350)

  // ── Search effect — async function pattern ──────────────
  useEffect(() => {
    // Empty query — reset via async wrapper (not direct setState)
    if (!debouncedQuery) {
      const reset = async () => {
        setResults([])
        setOpen(false)
        setSearchType('')
      }
      reset()
      return
    }

    // Cancel previous in-flight request
    if (abortRef.current) {
      abortRef.current.abort()
    }
    abortRef.current = new AbortController()

    const search = async () => {
      setLoading(true)
      setOpen(true)

      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(debouncedQuery)}`,
          { signal: abortRef.current?.signal }
        )

        if (!res.ok) throw new Error('Search failed')

        const json = await res.json()
        setResults(json.data ?? [])
        setSearchType(json.type ?? '')
      } catch (err: unknown) {
        // Ignore abort errors — user typed again
        if (err instanceof Error && err.name === 'AbortError') return
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    search()

    return () => {
      abortRef.current?.abort()
    }
  }, [debouncedQuery])

  // ── Outside click close ─────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Keyboard shortcuts ──────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setQuery('')
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleClear() {
    setQuery('')
    setResults([])
    setOpen(false)
    inputRef.current?.focus()
  }

  // ── Render ──────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative w-full max-w-xl">

      {/* Input */}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setOpen(true)}
          placeholder="Search your memories..."
          className="w-full bg-zinc-800 text-zinc-100 text-sm rounded-xl pl-9 pr-20 py-2.5 border border-zinc-700 focus:outline-none focus:border-violet-500 placeholder-zinc-600 transition-colors"
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {loading && (
            <Loader2 size={13} className="text-zinc-500 animate-spin" />
          )}
          {query && !loading && (
            <button
              onClick={handleClear}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <X size={13} />
            </button>
          )}
          {!query && (
            <kbd className="text-xs text-zinc-600 bg-zinc-700/50 px-1.5 py-0.5 rounded">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-2 w-full bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 max-h-[70vh] overflow-y-auto">

          {/* Search type label */}
          {searchType && !loading && (
            <div className="px-4 pt-3 pb-1">
              <span className="text-xs text-zinc-600">
                {searchType === 'hybrid' && '🔮 Semantic + keyword search'}
                {searchType === 'fulltext' && '🔤 Keyword search'}
                {searchType === 'recent' && '🕐 Recent memories'}
              </span>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="p-3 space-y-3">
              {[...Array(3)].map((_, i) => (
                <MemorySkeleton key={i} />
              ))}
            </div>
          )}

          {/* No results */}
          {!loading && results.length === 0 && debouncedQuery && (
            <div className="py-10 text-center">
              <p className="text-zinc-500 text-sm">
                No memories found for &quot;{debouncedQuery}&quot;
              </p>
              <p className="text-zinc-600 text-xs mt-1">
                Try different keywords
              </p>
            </div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <div className="p-3 space-y-2">
              {results.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onDeleted={(id) =>
                    setResults((prev) => prev.filter((m) => m.id !== id))
                  }
                  onUpdated={(updated) =>
                    setResults((prev) =>
                      prev.map((m) => (m.id === updated.id ? updated : m))
                    )
                  }
                />
              ))}
            </div>
          )}

        </div>
      )}

    </div>
  )
}