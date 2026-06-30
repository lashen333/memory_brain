// src\app\api\memories\route.ts
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/ai/embeddings'
import { createMemorySchema, enrichClipMetadata } from '@/lib/validations/memory'
import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse, Memory } from '@/types'


const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS })
}

// POST /api/memories — save new memory
export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: 'Unauthorized' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    // 2. Parse + validate
    const body = await request.json()
    const parsed = createMemorySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: parsed.error.issues[0]?.message },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const {
      content,
      vault_type,
      collection_id,
      project_id,
    } = parsed.data

    const { url, source_title } = enrichClipMetadata(
      parsed.data.url,
      parsed.data.source_title
    )

    // 3. Work vault — verify project membership
    if (vault_type === 'work') {
      if (!project_id) {
        return NextResponse.json<ApiResponse<null>>(
          { data: null, error: 'Project ID required for work vault' },
          { status: 400, headers: CORS_HEADERS }
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
          { status: 403, headers: CORS_HEADERS }
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
        { status: 500, headers: CORS_HEADERS }
      )
    }

    // 5. Background: embed + detect connections (Fire-and-forget)
    // Vercel serverless: waitUntil not available,
    // so we fire-and-forget with .catch() for error logging
    // Runs entirely asynchronously so the user gets a fast 201 response.
    generateEmbedding(content)
      .then(async (embedding) => {
        // 5a. Save the newly created vector embedding
        const { error: updateError } = await supabase
          .from('memories')
          .update({ embedding })
          .eq('id', memory.id)

        if (updateError) {
          throw new Error(`Failed to save embedding: ${updateError.message}`)
        }

        // 5b. Dynamic import avoids loading graph logic into memory unless needed
        const { detectAndSaveConnections } = await import('@/lib/ai/graph')

        // 5c. Run the similarity matching SQL function & write to knowledge graph
        await detectAndSaveConnections(memory.id)
      })
      .catch((err) => {
        // Keeps errors localized to logs so your API endpoint never crashes for the user
        console.error('Background processing failed for memory:', memory.id, err)
      })

    // Separate background job — reminder detection (parallel, not chained)
    const { createReminderIfNeeded } = await import('@/lib/ai/reminders')
    createReminderIfNeeded(memory.id, user.id, content).catch((err) =>
      console.error('Reminder detection failed:', memory.id, err)
    )

    // 6. Return immediately — fast response to user
    return NextResponse.json<ApiResponse<Memory>>(
      { data: memory as Memory, error: null },
      { status: 201, headers: CORS_HEADERS }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
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
        { status: 401, headers: CORS_HEADERS }
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
        { status: 500, headers: CORS_HEADERS }
      )
    }

    return NextResponse.json({
      data: memories,
      count,
      page,
      totalPages: Math.ceil((count ?? 0) / limit),
      error: null,
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}