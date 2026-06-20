// src\app\api\cron\check-reminders\route.ts
//this create the cron job endpoint
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { reminderEmailHtml } from '@/lib/email/reminder-template'

const resend = new Resend(process.env.RESEND_API_KEY!)

// Service role client — cron runs without user session
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  // Verify cron secret — prevent unauthorized triggers
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()

  try {
    // Find due reminders — trigger_at <= now, not sent yet
    const { data: reminders, error } = await supabase
      .from('reminders')
      .select(
        'id, memory_id, user_id, intent, trigger_at, memories(content), users(email, full_name)'
      )
      .eq('sent', false)
      .lte('trigger_at', new Date().toISOString())
      .limit(50)

    if (error) {
      console.error('Cron fetch error:', error)
      return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })
    }

    if (!reminders || reminders.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No due reminders' })
    }

    let sentCount = 0

    for (const reminder of reminders) {
      const user = reminder.users as unknown as {
        email: string
        full_name: string | null
      }
      const memory = reminder.memories as unknown as { content: string }

      if (!user?.email) continue

      try {
        await resend.emails.send({
          from: 'Memory Vault <reminders@yourdomain.com>',
          to: user.email,
          subject: `Reminder: ${reminder.intent}`,
          html: reminderEmailHtml({
            userName: user.full_name ?? 'there',
            intentText: reminder.intent,
            memoryContent: memory?.content ?? '',
            appUrl: process.env.NEXT_PUBLIC_APP_URL!,
          }),
        })

        await supabase
          .from('reminders')
          .update({ sent: true })
          .eq('id', reminder.id)

        sentCount++

      } catch (emailErr) {
        console.error('Email send failed:', reminder.id, emailErr)
      }
    }

    return NextResponse.json({ sent: sentCount, total: reminders.length })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}