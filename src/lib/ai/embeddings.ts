// src\lib\ai\embeddings.ts
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function generateEmbedding(text: string): Promise<number[]> {
  // Truncate — OpenAI has token limit
  const truncated = text.slice(0, 8000)

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: truncated,
  })

  return response.data[0].embedding
}