// src\lib\ai\rag.ts
import { generateEmbedding } from './embeddings'
import { createClient } from '@/lib/supabase/server'
import type { Memory } from '@/types'

export interface RetrievedContext {
  memories: Memory[]
  contextText: string
}

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
    limit = 8,
  } = options

  // 1. Embed the query
  const embedding = await generateEmbedding(query)

  // 2. Vector similarity search
  const { data: vectorResults, error } = await supabase.rpc(
    'search_memories_by_embedding',
    {
      query_embedding: embedding,
      match_count: limit,
      filter_user_id: userId,
      filter_vault_type: vaultType,
      filter_collection_id: collectionId,
      filter_project_id: projectId,
      filter_since: null,
    }
  )

  if (error) {
    console.error('RAG retrieval error:', error)
    return { memories: [], contextText: '' }
  }

  const memories = (vectorResults ?? []) as Memory[]

  if (memories.length === 0) {
    return { memories: [], contextText: '' }
  }

  // 3. Build context string for GPT
  const contextText = memories
    .map((m, i) => {
      const date = new Date(m.created_at).toLocaleDateString()
      const source = m.source_title ?? m.url ?? 'Manual note'
      return `[Memory ${i + 1}] (${date} — ${source})\n${m.content}`
    })
    .join('\n\n---\n\n')

  return { memories, contextText }
}

export function buildSystemPrompt(contextText: string): string {
  return `You are Memory Vault AI — a personal knowledge assistant.
You answer questions ONLY using the user's saved memories below.
Never use outside knowledge. If the answer is not in the memories, say so clearly.
Be concise, clear, and reference specific memories when relevant.

USER'S RELEVANT MEMORIES:
${contextText}

RULES:
- Answer only from the memories above
- If unsure: "I couldn't find this in your vault"
- Keep answers focused and actionable
- Reference memory dates and sources when helpful`
}