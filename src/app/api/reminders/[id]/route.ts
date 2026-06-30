// src\app\api\reminders\[id]\route.ts
//delete a reminder
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id) // ← own reminders only

  if (error) {
    return NextResponse.json(
      { error: 'Delete failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({ error: null })
}