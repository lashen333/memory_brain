// src\app\api\reminders\route.ts
//reminder route to fetch the reminders for the user
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const includeSent = searchParams.get('include_sent') === 'true'

  let query = supabase
    .from('reminders')
    .select('id, intent, trigger_at, sent')
    .eq('user_id', user.id)
    .order('trigger_at', { ascending: true })
    .limit(20)

  // Pending only — or all
  if (!includeSent) {
    query = query
      .eq('sent', false)
      .gte('trigger_at', new Date().toISOString())
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { error: 'Fetch failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({ data, error: null })
}