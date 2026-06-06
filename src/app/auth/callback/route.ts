// src\app\auth\callback\route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  console.log('Callback params:', Object.fromEntries(searchParams))
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${error}`)
  }

  if (code) {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (!exchangeError) {
      return NextResponse.redirect(`${origin}/dashboard`)
    }

    console.error('Exchange error:', exchangeError.message)
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}