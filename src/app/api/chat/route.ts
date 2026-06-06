// src\app\api\chat\route.ts
import { NextResponse } from 'next/server'

// Placeholder — full RAG implementation coming Day 12
export async function POST() {
  return NextResponse.json(
    { data: null, error: 'AI chat coming soon' },
    { status: 501 }
  )
}