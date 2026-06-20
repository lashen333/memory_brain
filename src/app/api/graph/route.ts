// src\app\api\graph\route.ts
//knowledge graph API
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch memories with connections
    const [memoriesResult, connectionsResult] = await Promise.all([
      supabase
        .from('memories')
        .select(
          'id, content, source_title, vault_type, collection_id, project_id, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(100), // latest 100 only

      supabase
        .from('connections')
        .select('from_id, to_id, strength')
        .gte('strength', 0.65)
        .order('strength', { ascending: false })
        .limit(200),
    ])

    const memories = memoriesResult.data ?? []
    const connections = connectionsResult.data ?? []

    // Only include memories that have connections
    const connectedIds = new Set([
      ...connections.map((c) => c.from_id),
      ...connections.map((c) => c.to_id),
    ])

    const nodes = memories
      .filter((m) => connectedIds.has(m.id))
      .map((m) => ({
        id: m.id,
        label:
          m.content.slice(0, 40) +
          (m.content.length > 40 ? '...' : ''),
        vault_type: m.vault_type,
        source_title: m.source_title,
        created_at: m.created_at,
      }))

    return NextResponse.json({
      nodes,
      edges: connections,
      error: null,
    })

  } catch (error) {
    console.error('Graph error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}