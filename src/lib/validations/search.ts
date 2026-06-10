// src\lib\validations\search.ts
import { z } from 'zod'

export const searchSchema = z.object({
  q: z.string().min(1).max(500).optional(),
  vault_type: z.enum(['personal', 'work', '']).optional(),
  collection_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  time_range: z.enum([
    'today',
    'this_week',
    'this_month',
    'last_3_months',
    'all_time',
  ]).optional().default('all_time'),
  limit: z.number().min(1).max(50).optional().default(20),
})

export type SearchInput = z.infer<typeof searchSchema>