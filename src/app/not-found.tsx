// src\app\not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl font-bold text-zinc-800 mb-4">404</div>
        <h2 className="text-white text-xl font-medium mb-2">
          Page not found
        </h2>
        <p className="text-zinc-500 text-sm mb-6">
          The page you&rsquo;re looking for doesn&rsquo;t exist.
        </p>
        <Link
          href="/dashboard"
          className="px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors"
        >
          Back to vault
        </Link>
      </div>
    </div>
  )
}