// src\app\(dashboard)\layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import MobileSidebar from '@/components/dashboard/MobileSidebar'
import Toaster from '@/components/ui/Toaster'
import StoreInitializer from '@/components/dashboard/StoreInitializer'
import type { User, Collection, Project } from '@/types'

// ← Remove dynamic import entirely
// dynamic() strips TypeScript prop types
// Direct import works correctly

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [profileResult, collectionsResult, projectsResult] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('collections').select('*').order('created_at'),
    supabase
      .from('projects')
      .select('*, project_members!inner(user_id, role)')
      .eq('project_members.user_id', user.id)
      .order('created_at'),
  ])

  const userProfile = (profileResult.data ?? null) as User | null
  const collections = (collectionsResult.data ?? []) as Collection[]
  const projects = (projectsResult.data ?? []) as Project[]

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Store init — layout level, runs once ✓ */}
      <StoreInitializer
        collections={collections}
        projects={projects}
      />

      <div className="hidden md:flex">
        <Sidebar
          user={userProfile}
          collections={collections}
          projects={projects}
          currentUserId={user.id}
        />
      </div>

      <div className="flex md:hidden">
        <MobileSidebar
          user={userProfile}
          collections={collections}
          projects={projects}
          currentUserId={user.id}
        />
      </div>

      <main className="flex-1 overflow-auto">
        {children}
      </main>

      <Toaster />
    </div>
  )
}