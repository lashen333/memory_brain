// src\components\landing\FeaturesSection.tsx
import {
  Home, MessageSquare, Network,
  Bell, Search, Users,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Home,
    title: 'Save from anywhere',
    description: 'Chrome extension lets you save any text from any webpage in one click. No app switching, no friction.',
  },
  {
    icon: MessageSquare,
    title: 'Chat with your memory',
    description: 'Ask questions and get answers from YOUR notes — not the internet. AI that actually knows your context.',
  },
  {
    icon: Network,
    title: 'Knowledge graph',
    description: 'AI automatically connects related notes you saved weeks apart. Discover patterns you forgot existed.',
  },
  {
    icon: Bell,
    title: 'Smart reminders',
    description: 'Save "meeting tomorrow at 3pm" and AI detects the intent, setting a reminder automatically.',
  },
  {
    icon: Search,
    title: 'Semantic search',
    description: 'Search by meaning, not just keywords. Find "that thing about databases" even without exact words.',
  },
  {
    icon: Users,
    title: 'Team vaults',
    description: 'Share project knowledge with your team. New members get instant access to months of context.',
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="px-6 py-24 border-t border-zinc-900">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-16">
          <h2 className="text-3xl font-semibold text-white mb-3">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="text-zinc-500 max-w-lg mx-auto">
            Built for people who think a lot, read a lot, and forget where they put that one important idea.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors"
            >
              <div className="w-10 h-10 bg-violet-600/10 rounded-xl flex items-center justify-center mb-4">
                <feature.icon size={18} className="text-violet-400" />
              </div>
              <h3 className="text-white font-medium mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}