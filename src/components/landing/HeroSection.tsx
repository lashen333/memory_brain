// src\components\landing\HeroSection.tsx
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'

export default function HeroSection() {
  return (
    <section className="relative px-6 pt-24 pb-32 overflow-hidden">

      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-violet-950/20 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 mb-8">
          <Sparkles size={13} className="text-violet-400" />
          <span className="text-xs text-zinc-400">
            Now with AI knowledge graph & smart reminders
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl font-semibold text-white leading-tight mb-6">
          ChatGPT knows the world.
          <br />
          <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            Memory Vault knows YOU.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Save anything from anywhere with one click. Chat with your own notes.
          Watch AI connect your ideas automatically. Your personal second brain
          that actually remembers everything — so you don&apos;t have to.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-medium px-6 py-3 rounded-xl transition-colors w-full sm:w-auto justify-center"
          >
            Start saving for free
            <ArrowRight size={16} />
          </Link>
          <a
            href="#how-it-works"
            className="text-zinc-400 hover:text-white font-medium px-6 py-3 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors w-full sm:w-auto text-center"
          >
            See how it works
          </a>
        </div>

        <p className="text-xs text-zinc-600 mt-6">
          No credit card required · Free forever for personal use
        </p>

      </div>
    </section>
  )
}