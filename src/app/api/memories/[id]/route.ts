// src\app\api\memories\[id]\route.ts
//Edit + Delete API
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateEmbedding } from '@/lib/ai/embeddings'
import type { ApiResponse, Memory } from '@/types'

const updateMemorySchema = z.object({
  content: z.string().min(1).max(10000),
})

// PATCH — edit memory content
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = updateMemorySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: parsed.error.issues[0]?.message },
        { status: 400 }
      )
    }

    // Re-generate embedding for updated content
    const embedding = await generateEmbedding(parsed.data.content)

    const { data: memory, error } = await supabase
      .from('memories')
      .update({
        content: parsed.data.content,
        embedding,
      })
      .eq('id', id)
      .eq('user_id', user.id) // owner only
      .select()
      .single()

    if (error || !memory) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: 'Failed to update memory' },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<Memory>>(
      { data: memory, error: null }
    )

  } catch {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE — remove memory
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: 'Failed to delete' },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: null }
    )

  } catch {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}