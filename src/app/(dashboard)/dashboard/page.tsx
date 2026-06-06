// src\app\(dashboard)\dashboard\page.tsx
import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/dashboard/DashboardClient'
import type { Memory, Collection, Project } from '@/types'
import ErrorBoundary from '@/components/ui/ErrorBoundary'

interface PageProps {
  searchParams: Promise<{
    vault_type?: string
    collection_id?: string
    project_id?: string
  }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const supabase = await createClient()

  // Read URL params — server side
  const params = await searchParams
  const vault_type = params.vault_type ?? ''
  const collection_id = params.collection_id ?? ''
  const project_id = params.project_id ?? ''

  // Build query with filters
  let query = supabase
    .from('memories')
    .select(
      'id, user_id, content, url, source_title, vault_type, collection_id, project_id, created_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(0, 19)

  // Apply filters server-side — fast + correct
  if (vault_type) query = query.eq('vault_type', vault_type)
  if (collection_id) query = query.eq('collection_id', collection_id)
  if (project_id) query = query.eq('project_id', project_id)

  const [memoriesResult, collectionsResult, projectsResult] = await Promise.all([
    query,
    supabase.from('collections').select('*').order('created_at'),
    supabase.from('projects').select('*').order('created_at'),
  ])

  const { data: memories, count } = memoriesResult
  const totalPages = Math.ceil((count ?? 0) / 20)

  return (
    <ErrorBoundary>
    <DashboardClient
      initialMemories={(memories ?? []) as Memory[]}
      initialTotalPages={totalPages}
      initialCount={count ?? 0}
      collections={(collectionsResult.data ?? []) as Collection[]}
      projects={(projectsResult.data ?? []) as Project[]}
      activeFilters={{ vault_type, collection_id, project_id }}
    />
    </ErrorBoundary>
  )
}