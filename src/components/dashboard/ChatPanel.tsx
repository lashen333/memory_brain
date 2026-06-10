// src\components\dashboard\ChatPanel.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Send, X, Sparkles,
  ExternalLink, ChevronDown,
} from 'lucide-react'
import type { ChatMessage, MemorySource } from '@/types'

interface ChatPanelProps {
  onClose: () => void
}

export default function ChatPanel({ onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [vaultScope, setVaultScope] = useState<'personal' | 'work' | ''>('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // External system: DOM scroll ✓
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || loading) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
    }

    const assistantId = crypto.randomUUID()
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      loading: true,
    }

    setMessages((prev) => [...prev, userMessage, assistantMessage])
    setInput('')
    setLoading(true)

    const history = messages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }))

    try {
      abortRef.current = new AbortController()

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          vault_type: vaultScope,
          history,
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error('Chat failed')

      const contentType = res.headers.get('content-type') ?? ''

      if (contentType.includes('text/event-stream')) {
        // ── SSE stream handling ──
        const reader = res.body?.getReader()
        const decoder = new TextDecoder()
        let fullText = ''
        let sources: MemorySource[] = []

        if (!reader) throw new Error('No reader')

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n\n')

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue

            try {
              const data = JSON.parse(line.slice(6))

              if (data.done) {
                sources = data.sources ?? []
              } else if (data.text) {
                fullText += data.text
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: fullText, loading: false }
                      : m
                  )
                )
              }
            } catch {
              // ignore parse errors
            }
          }
        }

        // Final update with sources
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: fullText, sources, loading: false }
              : m
          )
        )

      } else {
        // ── JSON fallback (no memories case) ──
        const json = await res.json()
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: json.answer,
                  sources: [],
                  loading: false,
                }
              : m
          )
        )
      }

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: 'Something went wrong. Please try again.',
                loading: false,
              }
            : m
        )
      )
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-violet-600 rounded-md flex items-center justify-center">
            <Sparkles size={12} className="text-white" />
          </div>
          <span className="text-sm font-medium text-white">
            Chat with vault
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={vaultScope}
            onChange={(e) =>
              setVaultScope(
                e.target.value as 'personal' | 'work' | ''
              )
            }
            className="bg-zinc-800 text-zinc-400 text-xs rounded-lg px-2 py-1.5 border border-zinc-700 focus:outline-none"
          >
            <option value="">All vault</option>
            <option value="personal">Personal only</option>
            <option value="work">Work only</option>
          </select>

          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-12 h-12 bg-violet-600/10 rounded-2xl flex items-center justify-center mb-4">
              <Sparkles size={20} className="text-violet-400" />
            </div>
            <h3 className="text-white font-medium mb-2">
              Ask your vault anything
            </h3>
            <p className="text-zinc-500 text-sm max-w-xs mb-6">
              AI answers from your saved memories only
            </p>

            {/* Starter questions */}
            <div className="space-y-2 w-full max-w-xs">
              {[
                'What did I learn this week?',
                'Summarize my research notes',
                'What are my key insights?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="w-full text-left px-3 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs text-zinc-400 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id}>
            {message.role === 'user' ? (
              <div className="flex justify-end">
                <div className="max-w-[80%] bg-violet-600 text-white text-sm rounded-2xl rounded-tr-sm px-4 py-2.5">
                  {message.content}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="max-w-[92%] bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-2xl rounded-tl-sm px-4 py-3">
                  {message.loading ? (
                    <div className="flex gap-1 items-center h-5">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"
                          style={{
                            animationDelay: `${i * 0.15}s`,
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                  )}
                </div>

                {message.sources && message.sources.length > 0 && (
                  <SourceCards sources={message.sources} />
                )}
              </div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-800 flex-shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your memories..."
            rows={2}
            className="flex-1 bg-zinc-900 text-zinc-100 text-sm rounded-xl px-3 py-2.5 border border-zinc-700 focus:outline-none focus:border-violet-500 resize-none placeholder-zinc-600"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="p-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex-shrink-0"
          >
            <Send size={15} className="text-white" />
          </button>
        </div>
        <p className="text-zinc-700 text-xs mt-1.5">
          Ctrl+Enter to send
        </p>
      </div>

    </div>
  )
}

// Source cards
function SourceCards({ sources }: { sources: MemorySource[] }) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? sources : sources.slice(0, 2)

  return (
    <div className="max-w-[92%]">
      <p className="text-xs text-zinc-600 mb-1.5">
        Sources ({sources.length})
      </p>
      <div className="space-y-1.5">
        {shown.map((source) => (
          <div
            key={source.id}
            className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-zinc-400 line-clamp-2 flex-1">
                {source.content}
              </p>
              {source.url && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-600 hover:text-zinc-400 flex-shrink-0"
                >
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
            <p className="text-xs text-zinc-700 mt-1">
              {source.source_title ?? 'Manual note'} ·{' '}
              {new Date(source.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}

        {sources.length > 2 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <ChevronDown
              size={12}
              className={`transition-transform ${
                expanded ? 'rotate-180' : ''
              }`}
            />
            {expanded
              ? 'Show less'
              : `${sources.length - 2} more sources`}
          </button>
        )}
      </div>
    </div>
  )
}