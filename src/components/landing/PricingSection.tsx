// src\components\landing\PricingSection.tsx
import Link from 'next/link'
import { Check } from 'lucide-react'

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying things out',
    features: [
      'First 100 notes',
      'Chrome extension',
      'Basic timeline view',
      '5 smart reminders/month',
    ],
    cta: 'Start for free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$12',
    period: '/month',
    description: 'For people who save a lot',
    features: [
      'Unlimited notes',
      'AI chat with your memory',
      'Knowledge graph',
      'Unlimited smart reminders',
      'Priority support',
    ],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Team',
    price: '$49',
    period: '/month',
    description: 'Shared knowledge for teams',
    features: [
      'Everything in Pro',
      '5 team members',
      'Shared team vault',
      'Admin dashboard',
      'Onboarding support',
    ],
    cta: 'Contact us',
    highlighted: false,
  },
]

export default function PricingSection() {
  return (
    <section id="pricing" className="px-6 py-24 border-t border-zinc-900">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-16">
          <h2 className="text-3xl font-semibold text-white mb-3">
            Simple pricing
          </h2>
          <p className="text-zinc-500">
            Start free. Upgrade when you need more.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`
                rounded-2xl p-6 flex flex-col
                ${plan.highlighted
                  ? 'bg-violet-600/5 border-2 border-violet-600/40'
                  : 'bg-zinc-900/50 border border-zinc-800'
                }
              `}
            >
              {plan.highlighted && (
                <span className="text-xs font-medium text-violet-400 bg-violet-600/10 rounded-full px-3 py-1 w-fit mb-4">
                  Most popular
                </span>
              )}

              <h3 className="text-white font-medium mb-1">{plan.name}</h3>
              <p className="text-zinc-500 text-sm mb-4">{plan.description}</p>

              <div className="mb-6">
                <span className="text-3xl font-semibold text-white">{plan.price}</span>
                <span className="text-zinc-500 text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check size={15} className="text-violet-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-zinc-400">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/login"
                className={`
                  text-center text-sm font-medium px-4 py-2.5 rounded-xl transition-colors
                  ${plan.highlighted
                    ? 'bg-violet-600 hover:bg-violet-500 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  }
                `}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}