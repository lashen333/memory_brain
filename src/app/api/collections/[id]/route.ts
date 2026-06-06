// src\app\api\collections\[id]\route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/types'

// DELETE — remove collection
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
      .from('collections')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // RLS + extra safety

    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: 'Failed to delete' },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: null },
      { status: 200 }
    )

  } catch {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}