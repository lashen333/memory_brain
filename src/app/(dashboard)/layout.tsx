// src\app\(dashboard)\layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import MobileSidebar from '@/components/dashboard/MobileSidebar'
import Toaster from '@/components/ui/Toaster'
import StoreInitializer from '@/components/dashboard/StoreInitializer'
import type { User, Collection, Project } from '@/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [profileResult, collectionsResult, projectMembershipsResult] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('collections').select('*').order('created_at'),
    // ← Query project_members directly, not projects with embedded filter
    supabase
      .from('project_members')
      .select(`
        role,
        projects (
          id,
          name,
          color,
          owner_id,
          created_at
        )
      `)
      .eq('user_id', user.id),
  ])

  const userProfile = (profileResult.data ?? null) as User | null
  const collections = (collectionsResult.data ?? []) as Collection[]

  // ← Flatten the nested projects object out of each membership row
  type ProjectMembershipRow = {
    role: string
    projects: Project[]
  }

  const projects = (projectMembershipsResult.data as unknown as ProjectMembershipRow[] ?? [])
    .flatMap((row) => row.projects)
    .filter(Boolean) as Project[]

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
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