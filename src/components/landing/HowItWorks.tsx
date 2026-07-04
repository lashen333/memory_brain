// src\components\landing\HowItWorks.tsx
const STEPS = [
  {
    num: '01',
    title: 'Highlight & save',
    description: 'See something worth remembering? Highlight it, right-click, done. Takes one second.',
  },
  {
    num: '02',
    title: 'AI organizes automatically',
    description: 'Every note gets embedded and connected to related ideas — no folders, no manual tagging needed.',
  },
  {
    num: '03',
    title: 'Ask anything, anytime',
    description: 'Chat with your vault like talking to a friend who remembers everything you\'ve ever read.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-24 border-t border-zinc-900 bg-zinc-950">
      <div className="max-w-4xl mx-auto">

        <div className="text-center mb-16">
          <h2 className="text-3xl font-semibold text-white mb-3">
            How it works
          </h2>
          <p className="text-zinc-500">
            Three steps. No learning curve.
          </p>
        </div>

        <div className="space-y-12">
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              className="flex items-start gap-6"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-violet-600/10 border border-violet-600/20 flex items-center justify-center">
                <span className="text-violet-400 font-semibold text-sm">
                  {step.num}
                </span>
              </div>
              <div className="flex-1 pt-1">
                <h3 className="text-white font-medium text-lg mb-1.5">
                  {step.title}
                </h3>
                <p className="text-zinc-500 leading-relaxed">
                  {step.description}
                </p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="hidden sm:block absolute left-[5.5rem] mt-14 w-px h-12 bg-zinc-800" />
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}