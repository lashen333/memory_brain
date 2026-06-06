// src\app\api\memories\route.ts
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/ai/embeddings'
import { createMemorySchema } from '@/lib/validations/memory'
import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse, Memory } from '@/types'

// POST /api/memories — save new memory
export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Parse + validate
    const body = await request.json()
    const parsed = createMemorySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: parsed.error.issues[0]?.message },
        { status: 400 }
      )
    }

    const {
      content,
      url,
      source_title,
      vault_type,
      collection_id,
      project_id,
    } = parsed.data

    // 3. Work vault — verify project membership
    if (vault_type === 'work') {
      if (!project_id) {
        return NextResponse.json<ApiResponse<null>>(
          { data: null, error: 'Project ID required for work vault' },
          { status: 400 }
        )
      }

      const { data: member } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', project_id)
        .eq('user_id', user.id)
        .single()

      if (!member) {
        return NextResponse.json<ApiResponse<null>>(
          { data: null, error: 'Not a member of this project' },
          { status: 403 }
        )
      }
    }

    // 4. Save immediately — no embedding wait
    // User gets instant response, embedding runs in background
    const { data: memory, error: insertError } = await supabase
      .from('memories')
      .insert({
        user_id: user.id,
        content,
        url: url ?? null,
        source_title: source_title ?? null,
        vault_type,
        collection_id: collection_id ?? null,
        project_id: project_id ?? null,
        embedding: null, // ← null first, background fill later
      })
      .select()
      .single()

    if (insertError || !memory) {
      console.error('Insert error:', insertError)
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: 'Failed to save memory' },
        { status: 500 }
      )
    }

    // 5. Background embedding — do NOT await
    // Vercel serverless: waitUntil not available,
    // so we fire-and-forget with .catch() for error logging
    generateEmbedding(content)
      .then((embedding) =>
        supabase
          .from('memories')
          .update({ embedding })
          .eq('id', memory.id)
      )
      .catch((err) =>
        console.error('Background embedding failed:', memory.id, err)
      )

    // 6. Return immediately — fast response to user
    return NextResponse.json<ApiResponse<Memory>>(
      { data: memory as Memory, error: null },
      { status: 201 }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/memories — fetch timeline with filters + pagination
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

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = 20
    const offset = (page - 1) * limit

    // Filters
    const vault_type = searchParams.get('vault_type')
    const collection_id = searchParams.get('collection_id')
    const project_id = searchParams.get('project_id')

    let query = supabase
      .from('memories')
      .select(
        'id, user_id, content, url, source_title, vault_type, collection_id, project_id, created_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (vault_type) query = query.eq('vault_type', vault_type)
    if (collection_id) query = query.eq('collection_id', collection_id)
    if (project_id) query = query.eq('project_id', project_id)

    const { data: memories, error, count } = await query

    if (error) {
      console.error('Fetch error:', error)
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: 'Failed to fetch memories' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: memories,
      count,
      page,
      totalPages: Math.ceil((count ?? 0) / limit),
      error: null,
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}