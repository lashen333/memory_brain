import OpenAI from 'openai'
import { retrieveContext, buildSystemPrompt } from '@/lib/ai/rag'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  vault_type: z.enum(['personal', 'work', '']).optional().default(''),
  project_id: z.string().uuid().nullable().optional(),
  collection_id: z.string().uuid().nullable().optional(),
  history: z
    .array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    }))
    .optional()
    .default([]),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = chatSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message },
        { status: 400 }
      )
    }

    const { message, vault_type, project_id, collection_id, history } = parsed.data

    // ← Now returns retrievalMode too
    const { memories, contextText, retrievalMode } = await retrieveContext(
      message,
      user.id,
      {
        vaultType: vault_type,
        projectId: project_id ?? null,
        collectionId: collection_id ?? null,
      }
    )

    if (memories.length === 0) {
      return NextResponse.json({
        answer: "I couldn't find any relevant memories in your vault for this question. Try saving some notes first!",
        sources: [],
      })
    }

    // ← Pass retrievalMode into prompt builder
    const systemPrompt = buildSystemPrompt(contextText, retrievalMode)

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      temperature: 0.2, // ← lower than before — more deterministic on dates/facts
      stream: true,
      messages,
    })

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              )
            }
          }

          const sourcesPayload = JSON.stringify({
            done: true,
            sources: memories.map((m) => ({
              id: m.id,
              content: m.content.slice(0, 150) + (m.content.length > 150 ? '...' : ''),
              source_title: m.source_title,
              url: m.url,
              created_at: m.created_at,
              vault_type: m.vault_type,
            })),
            retrievalMode, // ← expose to frontend for UI badge
          })

          controller.enqueue(encoder.encode(`data: ${sourcesPayload}\n\n`))
          controller.close()

        } catch (err) {
          console.error('Stream error:', err)
          controller.error(err)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}