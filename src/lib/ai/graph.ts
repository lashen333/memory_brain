// src\lib\ai\graph.ts
//Background Connection Job
import { createClient } from '@/lib/supabase/server'

export async function detectAndSaveConnections(
  memoryId: string
): Promise<void> {
  const supabase = await createClient()

  try {
    // 1. Detect similar memories via SQL function
    const { data: connections, error } = await supabase.rpc(
      'detect_memory_connections',
      {
        target_memory_id: memoryId,
        similarity_threshold: 0.65,
        max_connections: 5,
      }
    )

    if (error || !connections?.length) return

    // 2. Save connections — upsert (ignore duplicates)
    const rows = connections.map(
      (c: { from_id: string; to_id: string; strength: number }) => ({
        from_id: c.from_id,
        to_id: c.to_id,
        strength: Math.round(c.strength * 100) / 100,
      })
    )

    await supabase
      .from('connections')
      .upsert(rows, { onConflict: 'from_id,to_id' })

  } catch (err) {
    console.error('Connection detection error:', err)
  }
}