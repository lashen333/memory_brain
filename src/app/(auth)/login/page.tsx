// src\app\(auth)\login\page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginButton from './LoginButton'

export default async function LoginPage() {
  // Already logged in? → dashboard
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-full max-w-sm px-6">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-12 h-12 bg-violet-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-xl font-bold">M</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">Memory Vault</h1>
          <p className="text-zinc-400 mt-2 text-sm">Your second brain</p>
        </div>

        {/* Login Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <h2 className="text-white font-medium mb-1">Welcome back</h2>
          <p className="text-zinc-400 text-sm mb-6">
            Sign in to access your vault
          </p>
          <LoginButton />
        </div>

        <p className="text-zinc-600 text-xs text-center mt-6">
          Your data is never used to train AI models
        </p>

      </div>
    </div>
  )
}