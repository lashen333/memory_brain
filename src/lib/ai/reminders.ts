// src\lib\ai\reminders.ts
//this file create the reminder helper
 import { createClient } from '@/lib/supabase/server'
import { detectIntent } from './intent'

export async function createReminderIfNeeded(
  memoryId: string,
  userId: string,
  content: string
): Promise<void> {
  try {
    const intent = await detectIntent(content)

    if (!intent.hasIntent || !intent.triggerAt) return

    // Don't create reminders for past times
    if (new Date(intent.triggerAt) <= new Date()) return

    const supabase = await createClient()

    await supabase.from('reminders').insert({
      memory_id: memoryId,
      user_id: userId,
      trigger_at: intent.triggerAt,
      intent: intent.summary ?? content.slice(0, 100),
      sent: false,
    })

  } catch (err) {
    console.error('Reminder creation error:', err)
  }
}