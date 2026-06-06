// src\app\api\projects\route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { ApiResponse, Project } from '@/types'

const createProjectSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#378ADD'),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = createProjectSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: parsed.error.issues[0]?.message },
        { status: 400 }
      )
    }

    // Create project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: parsed.data.name,
        color: parsed.data.color,
        owner_id: user.id,
      })
      .select()
      .single()

    if (projectError) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: 'Failed to create project' },
        { status: 500 }
      )
    }

    // Auto-add creator as owner member
    await supabase
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: user.id,
        role: 'owner',
      })

    return NextResponse.json<ApiResponse<Project>>(
      { data: project, error: null },
      { status: 201 }
    )

  } catch {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}