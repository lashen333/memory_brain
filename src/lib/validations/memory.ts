// src\lib\validations\memory.ts
//Zod schemas
import { z } from 'zod'

export const createMemorySchema = z.object({
  content: z
    .string()
    .min(1, 'Content cannot be empty')
    .max(10000, 'Content too long'),
  url: z.string().url().nullable().optional(),
  source_title: z.string().max(500).nullable().optional(),
  vault_type: z.enum(['personal', 'work']),
  collection_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
})

export type CreateMemoryInput = z.infer<typeof createMemorySchema>