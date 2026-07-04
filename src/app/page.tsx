// src\app\page.tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HeroSection from '@/components/landing/HeroSection'
import FeaturesSection from '@/components/landing/FeaturesSection'
import HowItWorks from '@/components/landing/HowItWorks'
import PricingSection from '@/components/landing/PricingSection'
import LandingFooter from '@/components/landing/LandingFooter'
import LandingNav from '@/components/landing/LandingNav'

export default async function LandingPage() {
  // Already logged in? → dashboard
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <LandingNav />
      <HeroSection />
      <FeaturesSection />
      <HowItWorks />
      <PricingSection />
      <LandingFooter />
    </div>
  )
}
