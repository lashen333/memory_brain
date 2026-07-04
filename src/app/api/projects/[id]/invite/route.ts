import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { ApiResponse } from '@/types'

const inviteSchema = z.object({
  email: z.string().email(),
})

// Service role client — bypasses RLS
// Safe here ONLY because we manually verify ownership below first
function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params

    // 1. Auth check — normal RLS-bound client (own session)
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Verify caller owns this project — still via normal client (RLS allows this, it's their own project)
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

    // 3. Validate email
    const body = await request.json()
    const parsed = inviteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: 'Invalid email' },
        { status: 400 }
      )
    }

    // 4. Look up invitee — MUST use service client, RLS blocks cross-user select
    const serviceClient = getServiceClient()

    const { data: invitee, error: lookupError } = await serviceClient
      .from('users')
      .select('id, email')
      .eq('email', parsed.data.email.toLowerCase().trim())
      .single()

    if (lookupError || !invitee) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: 'User not found. They must sign up first.' },
        { status: 404 }
      )
    }

    // 5. Check if already a member — service client (consistent with above)
    const { data: existing } = await serviceClient
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

    // 6. Insert membership — service client (bypasses RLS, safe: ownership already verified in step 2)
    const { error: memberError } = await serviceClient
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: invitee.id,
        role: 'member',
      })

    if (memberError) {
      console.error('Member insert error:', memberError)
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: 'Failed to add member' },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<{ email: string }>>(
      { data: { email: invitee.email }, error: null },
      { status: 201 }
    )

  } catch (error) {
    console.error('Invite error:', error)
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}