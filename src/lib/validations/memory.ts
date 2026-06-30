// src\lib\validations\memory.ts
//Zod schemas
import { z } from 'zod'

function normalizeOptionalUrl(value: unknown): string | null {
  if (value == null || value === '') return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  try {
    return new URL(trimmed).href
  } catch {
    return null
  }
}

function normalizeOptionalText(value: unknown): string | null {
  if (value == null) return null
  const trimmed = String(value).trim()
  return trimmed || null
}

export const createMemorySchema = z.object({
  content: z
    .string()
    .min(1, 'Content cannot be empty')
    .max(10000, 'Content too long'),
  url: z.preprocess(normalizeOptionalUrl, z.string().url().nullable().optional()),
  source_title: z.preprocess(
    normalizeOptionalText,
    z.string().max(500).nullable().optional()
  ),
  vault_type: z.enum(['personal', 'work']),
  collection_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
})

export type CreateMemoryInput = z.infer<typeof createMemorySchema>

export function enrichClipMetadata(
  url: string | null | undefined,
  sourceTitle: string | null | undefined
) {
  const normalizedUrl = normalizeOptionalUrl(url)
  let title = normalizeOptionalText(sourceTitle)

  if (normalizedUrl && !title) {
    try {
      title = new URL(normalizedUrl).hostname.replace(/^www\./, '')
    } catch {
      title = null
    }
  }

  return {
    url: normalizedUrl,
    source_title: title,
  }
}
