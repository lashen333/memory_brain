// src\lib\ai\intent.ts
//In this file define the intent of the note if it has time or something related that remind then it call to the ai
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export interface IntentResult {
  hasIntent: boolean
  triggerAt: string | null  // ISO timestamp
  summary: string | null
}

// Fast regex pre-filter — avoid unnecessary AI calls
const TIME_KEYWORDS = [
  'tomorrow', 'today', 'tonight', 'next week', 'next month',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
  'saturday', 'sunday',
  'am', 'pm', 'meeting', 'deadline', 'due', 'call', 'appointment',
  'remind', 'schedule', 'event',
]

function hasTimeSignal(content: string): boolean {
  const lower = content.toLowerCase()
  return TIME_KEYWORDS.some((kw) => lower.includes(kw))
}

export async function detectIntent(
  content: string
): Promise<IntentResult> {
  // 1. Fast pre-filter — skip AI call if no time signal
  if (!hasTimeSignal(content)) {
    return { hasIntent: false, triggerAt: null, summary: null }
  }

  // 2. AI extraction — only for likely candidates
  const now = new Date().toISOString()

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 150,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Extract time-based intent from notes. Current time: ${now}.
Return JSON: { "hasIntent": boolean, "triggerAt": "ISO timestamp or null", "summary": "short reminder text or null" }
If the note mentions a specific future date/time/event, set hasIntent=true and calculate triggerAt as 30 minutes BEFORE that event.
If no clear future time reference, hasIntent=false.
Only extract genuine scheduling intent — not past events or vague mentions.`,
        },
        { role: 'user', content },
      ],
    })

    const result = JSON.parse(
      response.choices[0]?.message?.content ?? '{}'
    )

    return {
      hasIntent: result.hasIntent ?? false,
      triggerAt: result.triggerAt ?? null,
      summary: result.summary ?? null,
    }

  } catch (err) {
    console.error('Intent detection error:', err)
    return { hasIntent: false, triggerAt: null, summary: null }
  }
}