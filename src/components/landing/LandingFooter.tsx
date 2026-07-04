// src\components\landing\LandingFooter.tsx
import Link from 'next/link'
import { Brain } from 'lucide-react'

export default function LandingFooter() {
  return (
    <footer className="px-6 py-12 border-t border-zinc-900">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-violet-600 rounded-md flex items-center justify-center">
            <Brain size={12} className="text-white" />
          </div>
          <span className="text-sm text-zinc-400">
            © 2026 Memory Vault. Your data is never used to train AI models.
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm text-zinc-500">
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-white transition-colors">
            Terms
          </Link>
          <a href="mailto:hello@memoryvault.app" className="hover:text-white transition-colors">
            Contact
          </a>
        </div>

      </div>
    </footer>
  )
}