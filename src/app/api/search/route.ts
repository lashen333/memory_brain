// src\app\api\search\route.ts
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/ai/embeddings'
import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse, Memory } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()
    const vault_type = searchParams.get('vault_type')
    const collection_id = searchParams.get('collection_id')
    const project_id = searchParams.get('project_id')

    // No query — return recent memories (filtered)
    if (!query) {
      let dbQuery = supabase
        .from('memories')
        .select(
          'id, user_id, content, url, source_title, vault_type, collection_id, project_id, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(20)

      if (vault_type) dbQuery = dbQuery.eq('vault_type', vault_type)
      if (collection_id) dbQuery = dbQuery.eq('collection_id', collection_id)
      if (project_id) dbQuery = dbQuery.eq('project_id', project_id)

      const { data, error } = await dbQuery

      if (error) {
        return NextResponse.json<ApiResponse<null>>(
          { data: null, error: 'Search failed' },
          { status: 500 }
        )
      }

      return NextResponse.json({ data, error: null, type: 'recent' })
    }

    // Short query (< 3 chars) — full-text only
    if (query.length < 3) {
      const { data, error } = await supabase
        .from('memories')
        .select(
          'id, user_id, content, url, source_title, vault_type, collection_id, project_id, created_at'
        )
        .textSearch('search_vector', query)
        .limit(20)

      if (error) {
        return NextResponse.json<ApiResponse<null>>(
          { data: null, error: 'Search failed' },
          { status: 500 }
        )
      }

      return NextResponse.json({ data, error: null, type: 'fulltext' })
    }

    // Full query — hybrid: full-text + semantic
    const [fulltextResult, embedding] = await Promise.all([
      supabase
        .from('memories')
        .select(
          'id, user_id, content, url, source_title, vault_type, collection_id, project_id, created_at'
        )
        .textSearch('search_vector', query)
        .limit(10),
      generateEmbedding(query),
    ])

    // Vector similarity search via RPC
    const { data: vectorResults } = await supabase.rpc(
      'search_memories_by_embedding',
      {
        query_embedding: embedding,
        match_count: 10,
        filter_user_id: user.id,
      }
    )

    // Merge + deduplicate results
    const fulltextIds = new Set(
      (fulltextResult.data ?? []).map((m) => m.id)
    )

    const combined = [
      ...(fulltextResult.data ?? []),
      ...(vectorResults ?? []).filter((m: Memory) => !fulltextIds.has(m.id)),
    ]

    // Apply filters
    const filtered = combined.filter((m: Memory) => {
      if (vault_type && m.vault_type !== vault_type) return false
      if (collection_id && m.collection_id !== collection_id) return false
      if (project_id && m.project_id !== project_id) return false
      return true
    })

    return NextResponse.json({
      data: filtered.slice(0, 20),
      error: null,
      type: 'hybrid',
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}