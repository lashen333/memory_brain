// src\app\api\reminders\route.ts
//reminder route to fetch the reminders for the user
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('reminders')
    .select('id, intent, trigger_at')
    .eq('user_id', user.id)
    .eq('sent', false)
    .gte('trigger_at', new Date().toISOString())
    .order('trigger_at', { ascending: true })
    .limit(5)

  if (error) {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })
  }

  return NextResponse.json({ data, error: null })
}