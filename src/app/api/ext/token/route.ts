// src\app\api\ext\token\route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Extension ලෙස call කරනවා — dashboard session verify කරලා
// short-lived token return කරනවා
function buildCorsHeaders(request: Request) {
  const origin = request.headers.get('origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }
}

export async function OPTIONS(request: Request) {
  return new Response(null, { headers: buildCorsHeaders(request) })
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') ?? ''
    const bearerToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null

    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: buildCorsHeaders(request) }
      )
    }

    if (bearerToken) {
      return NextResponse.json(
        { valid: true },
        { headers: buildCorsHeaders(request) }
      )
    }

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'No session' },
        { status: 401, headers: buildCorsHeaders(request) }
      )
    }

    return NextResponse.json(
      {
        token: session.access_token,
        userId: user.id,
        email: user.email,
        name: user.user_metadata?.full_name ?? user.email,
        expiresAt: session.expires_at,
      },
      { headers: buildCorsHeaders(request) }
    )
  } catch (err) {
    console.error('EXT token route error:', err)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500, headers: buildCorsHeaders(request) }
    )
  }
}