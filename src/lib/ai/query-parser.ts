// src\lib\ai\query-parser.ts
//this file parser the query as the well
// Detects if a question needs date-filtering vs pure semantic search
export interface ParsedQuery {
  timeRange: { since: string; label: string } | null
  isTemporalQuery: boolean
}

const TIME_PATTERNS: Record<string, () => Date> = {
  'yesterday': () => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    d.setHours(0, 0, 0, 0)
    return d
  },
  'today': () => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  },
  'this week': () => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d
  },
  'last week': () => {
    const d = new Date()
    d.setDate(d.getDate() - 14)
    return d
  },
  'this month': () => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d
  },
  'last month': () => {
    const d = new Date()
    d.setDate(d.getDate() - 60)
    return d
  },
  'this morning': () => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  },
}

export function parseQuery(query: string): ParsedQuery {
  const lower = query.toLowerCase()

  for (const [phrase, getDate] of Object.entries(TIME_PATTERNS)) {
    if (lower.includes(phrase)) {
      return {
        timeRange: {
          since: getDate().toISOString(),
          label: phrase,
        },
        isTemporalQuery: true,
      }
    }
  }

  return { timeRange: null, isTemporalQuery: false }
}

// Human-readable "today" string for system prompt
export function getTodayContext(): string {
  const now = new Date()
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}