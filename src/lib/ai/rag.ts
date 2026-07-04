import { generateEmbedding } from './embeddings'
import { createClient } from '@/lib/supabase/server'
import { parseQuery, getTodayContext } from './query-parser'
import type { Memory } from '@/types'

export interface RetrievedContext {
  memories: (Memory & { similarity?: number })[]
  contextText: string
  retrievalMode: 'temporal' | 'semantic'
}

const MIN_SIMILARITY = 0.55  // filter out weak matches

export async function retrieveContext(
  query: string,
  userId: string,
  options: {
    vaultType?: string
    projectId?: string | null
    collectionId?: string | null
    limit?: number
  } = {}
): Promise<RetrievedContext> {
  const supabase = await createClient()
  const {
    vaultType = '',
    projectId = null,
    collectionId = null,
    limit = 10,
  } = options

  const parsed = parseQuery(query)

  // ── Temporal query: chronological, not similarity-ranked ──
  if (parsed.isTemporalQuery && parsed.timeRange) {
    let dbQuery = supabase
      .from('memories')
      .select(
        'id, user_id, content, url, source_title, vault_type, collection_id, project_id, created_at'
      )
      .eq('user_id', userId)
      .gte('created_at', parsed.timeRange.since)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (vaultType) dbQuery = dbQuery.eq('vault_type', vaultType)
    if (collectionId) dbQuery = dbQuery.eq('collection_id', collectionId)
    if (projectId) dbQuery = dbQuery.eq('project_id', projectId)

    const { data, error } = await dbQuery

    if (error || !data?.length) {
      return { memories: [], contextText: '', retrievalMode: 'temporal' }
    }

    return {
      memories: data as Memory[],
      contextText: buildContextText(data as Memory[]),
      retrievalMode: 'temporal',
    }
  }

  // ── Semantic query: vector similarity search ──
  const embedding = await generateEmbedding(query)

  const { data: vectorResults, error } = await supabase.rpc(
    'search_memories_by_embedding',
    {
      query_embedding: embedding,
      match_count: limit * 2, // over-fetch, then filter by threshold
      filter_user_id: userId,
      filter_vault_type: vaultType,
      filter_collection_id: collectionId,
      filter_project_id: projectId,
      filter_since: null,
    }
  )

  if (error) {
    console.error('RAG retrieval error:', error)
    return { memories: [], contextText: '', retrievalMode: 'semantic' }
  }

  // Quality filter — drop weak matches, cap at limit
  const filtered = (vectorResults ?? [])
    .filter((m: Memory & { similarity: number }) => m.similarity >= MIN_SIMILARITY)
    .slice(0, limit)

  if (filtered.length === 0) {
    return { memories: [], contextText: '', retrievalMode: 'semantic' }
  }

  return {
    memories: filtered,
    contextText: buildContextText(filtered),
    retrievalMode: 'semantic',
  }
}

// ── Context builder — date-first, scannable format ──
function buildContextText(memories: Memory[]): string {
  return memories
    .map((m, i) => {
      const date = new Date(m.created_at).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
      const source = m.source_title ?? m.url ?? 'Manual note'

      return `MEMORY ${i + 1}
DATE: ${date}
SOURCE: ${source}
CONTENT: ${m.content}`
    })
    .join('\n\n---\n\n')
}

// ── System prompt — industry-level structure ──
export function buildSystemPrompt(
  contextText: string,
  retrievalMode: 'temporal' | 'semantic'
): string {
  const today = getTodayContext()

  return `You are Memory Vault AI, a personal knowledge assistant with access to the user's saved notes.

CURRENT DATE: ${today}

RETRIEVAL MODE: ${retrievalMode === 'temporal'
    ? 'Time-based — the memories below were filtered by date range, listed newest first.'
    : 'Semantic — the memories below were matched by topic relevance.'
  }

USER'S RELEVANT MEMORIES:
${contextText || '(No memories found matching this query)'}

RESPONSE RULES:
1. Answer using ONLY the memories provided above. Never use outside knowledge.
2. When the question references a relative time ("yesterday", "last week"), compare each memory's DATE field against CURRENT DATE above to determine if it qualifies — do not guess.
3. If no memories are provided, or none are relevant to the question, respond exactly: "I couldn't find this in your vault."
4. If memories are provided but only partially answer the question, answer what you can and note what's missing.
5. Reference specific dates or sources naturally when it helps ("On Jun 21, you noted...").
6. Be concise. Prefer short paragraphs or bullet points over long prose.
7. Never fabricate dates, sources, or content not present in the memories above.`
}