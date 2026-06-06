// src\app\api\projects\[id]\invite\route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { ApiResponse } from '@/types'

const inviteSchema = z.object({
  email: z.string().email(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only owner can invite
    const { data: project } = await supabase
      .from('projects')
      .select('owner_id, name')
      .eq('id', projectId)
      .single()

    if (!project || project.owner_id !== user.id) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: 'Only project owner can invite members' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = inviteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: 'Invalid email' },
        { status: 400 }
      )
    }

    // Find user by email in public.users
    const { data: invitee } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', parsed.data.email)
      .single()

    if (!invitee) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: 'User not found. They must sign up first.' },
        { status: 404 }
      )
    }

    // Already a member?
    const { data: existing } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId)
      .eq('user_id', invitee.id)
      .single()

    if (existing) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: 'User is already a member' },
        { status: 409 }
      )
    }

    // Add member
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: invitee.id,
        role: 'member',
      })

    if (memberError) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: 'Failed to add member' },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<{ email: string }>>(
      { data: { email: invitee.email }, error: null },
      { status: 201 }
    )

  } catch {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}