import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/ai/embeddings'
import { NextRequest, NextResponse } from 'next/server'
import type { Memory } from '@/types'

// Time range → PostgreSQL timestamp
function getTimestampFromRange(range: string): string | null {
  const now = new Date()
  const map: Record<string, Date> = {
    today: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    this_week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    this_month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    last_3_months: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
  }
  return map[range]?.toISOString() ?? null
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { data: null, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim() ?? ''
    const vault_type = searchParams.get('vault_type') ?? ''
    const collection_id = searchParams.get('collection_id') || null
    const project_id = searchParams.get('project_id') || null
    const time_range = searchParams.get('time_range') ?? 'all_time'
    const limit = Math.min(
      parseInt(searchParams.get('limit') ?? '20'),
      50
    )

    const since = getTimestampFromRange(time_range)

    // ── No query — return recent with filters ──
    if (!query) {
      let dbQuery = supabase
        .from('memories')
        .select(
          'id, user_id, content, url, source_title, vault_type, collection_id, project_id, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(limit)

      if (vault_type) dbQuery = dbQuery.eq('vault_type', vault_type)
      if (collection_id) dbQuery = dbQuery.eq('collection_id', collection_id)
      if (project_id) dbQuery = dbQuery.eq('project_id', project_id)
      if (since) dbQuery = dbQuery.gte('created_at', since)

      const { data, error } = await dbQuery

      if (error) {
        return NextResponse.json(
          { data: null, error: 'Failed to fetch' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        data: data ?? [],
        error: null,
        type: 'recent',
        query: '',
      })
    }

    // ── Hybrid search: semantic + full-text ──
    const [embedding, fulltextResult] = await Promise.all([
      generateEmbedding(query),
      supabase
        .from('memories')
        .select(
          'id, user_id, content, url, source_title, vault_type, collection_id, project_id, created_at'
        )
        .textSearch('search_vector', query, {
          type: 'websearch',
          config: 'english',
        })
        .eq(vault_type ? 'vault_type' : 'user_id', vault_type || user.id)
        .limit(10),
    ])

    // Vector similarity search
    const { data: vectorResults, error: vectorError } = await supabase.rpc(
      'search_memories_by_embedding',
      {
        query_embedding: embedding,
        match_count: 15,
        filter_user_id: user.id,
        filter_vault_type: vault_type,
        filter_collection_id: collection_id,
        filter_project_id: project_id,
        filter_since: since,
      }
    )

    if (vectorError) {
      console.error('Vector search error:', vectorError)
    }

    // Merge + deduplicate
    // Vector results = semantic relevance order
    // Full-text results = exact keyword matches
    const vectorIds = new Set(
      (vectorResults ?? []).map((m: Memory) => m.id)
    )

    const fulltextOnly = (fulltextResult.data ?? []).filter(
      (m) => !vectorIds.has(m.id)
    )

    // Combined: vector first (semantic), then fulltext-only
    const combined = [
      ...(vectorResults ?? []),
      ...fulltextOnly,
    ] as Memory[]

    // Apply time filter to fulltext results
    // (vector function already filters by time)
    const filtered = since
      ? combined.filter(
          (m) => new Date(m.created_at) >= new Date(since)
        )
      : combined

    return NextResponse.json({
      data: filtered.slice(0, limit),
      error: null,
      type: 'hybrid',
      query,
      count: filtered.length,
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}