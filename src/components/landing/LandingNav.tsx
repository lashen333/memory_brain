// src\components\landing\LandingNav.tsx
import Link from 'next/link'
import { Brain } from 'lucide-react'

export default function LandingNav() {
  return (
    <nav className="border-b border-zinc-800 sticky top-0 bg-zinc-950/80 backdrop-blur-md z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
            <Brain size={16} className="text-white" />
          </div>
          <span className="font-semibold text-white">Memory Vault</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-sm text-zinc-400 hover:text-white transition-colors">
            How it works
          </a>
          <a href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Pricing
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-zinc-400 hover:text-white transition-colors hidden sm:block"
          >
            Log in
          </Link>
          <Link
            href="/login"
            className="text-sm bg-violet-600 hover:bg-violet-500 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Get started free
          </Link>
        </div>

      </div>
    </nav>
  )
}