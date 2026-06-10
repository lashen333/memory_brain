// src\components\dashboard\SearchBar.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, Loader2, Clock } from 'lucide-react'
import MemoryCard from './MemoryCard'
import MemorySkeleton from './MemorySkeleton'
import type { Memory } from '@/types'

const TIME_RANGES = [
  { value: 'all_time', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_3_months', label: 'Last 3 months' },
]

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
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
  const [timeRange, setTimeRange] = useState('all_time')
  const [showTimeFilter, setShowTimeFilter] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const debouncedQuery = useDebounce(query, 350)

  // ── Search effect ───────────────────────────────────────
  useEffect(() => {
    if (!debouncedQuery) {
      const reset = async () => {
        setResults([])
        setOpen(false)
        setSearchType('')
      }
      reset()
      return
    }

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    const search = async () => {
      setLoading(true)
      setOpen(true)

      try {
        const params = new URLSearchParams({
          q: debouncedQuery,
          time_range: timeRange,          // ← new
        })

        const res = await fetch(
          `/api/search?${params}`,
          { signal: abortRef.current?.signal }
        )

        if (!res.ok) throw new Error('Search failed')

        const json = await res.json()
        setResults(json.data ?? [])
        setSearchType(json.type ?? '')
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    search()

    return () => { abortRef.current?.abort() }
  }, [debouncedQuery, timeRange])              // ← timeRange added

  // ── Outside click ───────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setShowTimeFilter(false)             // ← close time filter too
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
        setShowTimeFilter(false)             // ← close time filter too
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
    setShowTimeFilter(false)
    inputRef.current?.focus()
  }

  // ── Render ──────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative w-full max-w-xl">

      {/* Input + time filter row */}
      <div className="flex gap-2">

        {/* Search input */}
        <div className="relative flex-1">
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

        {/* Time range filter */}
        <div className="relative">
          <button
            onClick={() => setShowTimeFilter(!showTimeFilter)}
            className={`
              flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs
              border transition-colors whitespace-nowrap
              ${timeRange !== 'all_time'
                ? 'bg-violet-600/20 border-violet-500/50 text-violet-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
              }
            `}
          >
            <Clock size={13} />
            {TIME_RANGES.find((t) => t.value === timeRange)?.label}
          </button>

          {showTimeFilter && (
            <div className="absolute top-full right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden min-w-[140px]">
              {TIME_RANGES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => {
                    setTimeRange(t.value)
                    setShowTimeFilter(false)
                  }}
                  className={`
                    w-full text-left px-4 py-2.5 text-xs transition-colors
                    ${timeRange === t.value
                      ? 'bg-violet-600/20 text-violet-400'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }
                  `}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Dropdown results */}
      {open && (
        <div className="absolute top-full mt-2 w-full bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 max-h-[70vh] overflow-y-auto">

          {searchType && !loading && (
            <div className="px-4 pt-3 pb-1">
              <span className="text-xs text-zinc-600">
                {searchType === 'hybrid' && '🔮 Semantic + keyword search'}
                {searchType === 'fulltext' && '🔤 Keyword search'}
                {searchType === 'recent' && '🕐 Recent memories'}
              </span>
            </div>
          )}

          {loading && (
            <div className="p-3 space-y-3">
              {[...Array(3)].map((_, i) => (
                <MemorySkeleton key={i} />
              ))}
            </div>
          )}

          {!loading && results.length === 0 && debouncedQuery && (
            <div className="py-10 text-center">
              <p className="text-zinc-500 text-sm">
                No memories found for &quot;{debouncedQuery}&quot;
              </p>
              <p className="text-zinc-600 text-xs mt-1">
                Try different keywords or a wider time range
              </p>
            </div>
          )}

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