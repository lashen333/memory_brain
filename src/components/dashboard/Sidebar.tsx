'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Brain, User, Briefcase, ChevronDown,
  ChevronRight, Plus, Settings, LogOut,
  Trash2, UserPlus,
} from 'lucide-react'
import { useVaultStore } from '@/lib/store/useVaultStore'
import CreateCollectionModal from './CreateCollectionModal'
import CreateProjectModal from './CreateProjectModal'
import InviteMemberModal from './InviteMemberModal'
import type { User as UserType, Collection, Project } from '@/types'

// ── Props ─────────────────────────────────────
export interface SidebarProps {
  user: UserType | null
  collections: Collection[]
  projects: Project[]
  currentUserId: string
}

// ═══════════════════════════════════════════════
// Main Sidebar
// ═══════════════════════════════════════════════
export default function Sidebar({
  user,
  collections: initialCollections,
  projects: initialProjects,
  currentUserId,
}: SidebarProps) {
  const [showCreateCollection, setShowCreateCollection] = useState(false)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [inviteProject, setInviteProject] = useState<Project | null>(null)
  const router = useRouter()

  const { collections, projects, removeCollection, removeProject } =
    useVaultStore()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleDeleteCollection(id: string) {
    if (!confirm('Delete this collection? Notes will not be deleted.')) return
    await fetch(`/api/collections/${id}`, { method: 'DELETE' })
    removeCollection(id)
  }

  async function handleDeleteProject(id: string) {
    if (!confirm('Delete this project? All project notes will be deleted.'))
      return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    removeProject(id)
  }

  return (
    <>
      <aside className="w-64 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col flex-shrink-0">

        {/* Logo */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
              <Brain size={14} className="text-white" />
            </div>
            <span className="font-semibold text-sm text-white">
              Memory Vault
            </span>
          </div>
        </div>

        {/* Nav — Suspense required for useSearchParams */}
        <Suspense fallback={<SidebarNavSkeleton />}>
          <SidebarNavContent
            collections={collections}
            projects={projects}
            currentUserId={currentUserId}
            onDeleteCollection={handleDeleteCollection}
            onDeleteProject={handleDeleteProject}
            onInviteProject={setInviteProject}
            onNewCollection={() => setShowCreateCollection(true)}
            onNewProject={() => setShowCreateProject(true)}
          />
        </Suspense>

        {/* Bottom */}
        <div className="p-3 border-t border-zinc-800 space-y-1">
          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-sm">
            <Settings size={14} />
            <span>Settings</span>
          </button>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors text-sm"
          >
            <LogOut size={14} />
            <span>Sign out</span>
          </button>

          {user && (
            <div className="flex items-center gap-2 px-2 py-2 mt-1">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt=""
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-medium">
                    {user.email?.[0]?.toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">
                  {user.full_name ?? 'User'}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          )}
        </div>

      </aside>

      {/* Modals */}
      {showCreateCollection && (
        <CreateCollectionModal
          onClose={() => setShowCreateCollection(false)}
        />
      )}
      {showCreateProject && (
        <CreateProjectModal
          onClose={() => setShowCreateProject(false)}
        />
      )}
      {inviteProject && (
        <InviteMemberModal
          projectId={inviteProject.id}
          projectName={inviteProject.name}
          onClose={() => setInviteProject(null)}
        />
      )}
    </>
  )
}

// ═══════════════════════════════════════════════
// SidebarNavContent — useSearchParams inside Suspense
// ═══════════════════════════════════════════════
function SidebarNavContent({
  collections,
  projects,
  currentUserId,
  onDeleteCollection,
  onDeleteProject,
  onInviteProject,
  onNewCollection,
  onNewProject,
}: {
  collections: Collection[]
  projects: Project[]
  currentUserId: string
  onDeleteCollection: (id: string) => void
  onDeleteProject: (id: string) => void
  onInviteProject: (proj: Project) => void
  onNewCollection: () => void
  onNewProject: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams() // ✓ inside Suspense

  const [personalOpen, setPersonalOpen] = useState(true)
  const [workOpen, setWorkOpen] = useState(true)

  function navigateToCollection(collectionId: string) {
    const current = searchParams.get('collection_id')
    router.push(
      current === collectionId
        ? pathname
        : `${pathname}?vault_type=personal&collection_id=${collectionId}`
    )
  }

  function navigateToProject(projectId: string) {
    const current = searchParams.get('project_id')
    router.push(
      current === projectId
        ? pathname
        : `${pathname}?vault_type=work&project_id=${projectId}`
    )
  }

  return (
    <nav className="flex-1 overflow-y-auto p-3 space-y-1">

      {/* ── Personal ── */}
      <div>
        <button
          onClick={() => setPersonalOpen(!personalOpen)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-sm"
        >
          {personalOpen
            ? <ChevronDown size={14} />
            : <ChevronRight size={14} />
          }
          <User size={14} />
          <span className="font-medium flex-1 text-left">Personal</span>
        </button>

        {personalOpen && (
          <div className="mt-1 ml-4 space-y-0.5">
            {collections.length === 0 && (
              <p className="text-xs text-zinc-600 px-2 py-1">
                No collections yet
              </p>
            )}

            {collections.map((col) => {
              const isActive =
                searchParams.get('collection_id') === col.id

              return (
                <div
                  key={col.id}
                  onClick={() => navigateToCollection(col.id)}
                  className={`
                    group flex items-center gap-2 px-2 py-1.5 rounded-lg
                    text-sm cursor-pointer transition-colors
                    ${isActive
                      ? 'bg-zinc-700 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }
                  `}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: col.color }}
                  />
                  <span className="truncate flex-1">{col.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteCollection(col.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              )
            })}

            <button
              onClick={onNewCollection}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-colors text-sm"
            >
              <Plus size={12} />
              <span>New collection</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Work ── */}
      <div>
        <button
          onClick={() => setWorkOpen(!workOpen)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-sm"
        >
          {workOpen
            ? <ChevronDown size={14} />
            : <ChevronRight size={14} />
          }
          <Briefcase size={14} />
          <span className="font-medium flex-1 text-left">Work</span>
        </button>

        {workOpen && (
          <div className="mt-1 ml-4 space-y-0.5">
            {projects.length === 0 && (
              <p className="text-xs text-zinc-600 px-2 py-1">
                No projects yet
              </p>
            )}

            {projects.map((proj) => {
              const isActive =
                searchParams.get('project_id') === proj.id

              return (
                <div
                  key={proj.id}
                  onClick={() => navigateToProject(proj.id)}
                  className={`
                    group flex items-center gap-2 px-2 py-1.5 rounded-lg
                    text-sm cursor-pointer transition-colors
                    ${isActive
                      ? 'bg-zinc-700 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }
                  `}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: proj.color }}
                  />
                  <span className="truncate flex-1">{proj.name}</span>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                    {proj.owner_id === currentUserId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onInviteProject(proj)
                        }}
                        className="text-zinc-600 hover:text-blue-400 transition-colors"
                      >
                        <UserPlus size={11} />
                      </button>
                    )}
                    {proj.owner_id === currentUserId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteProject(proj.id)
                        }}
                        className="text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            <button
              onClick={onNewProject}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-colors text-sm"
            >
              <Plus size={12} />
              <span>New project</span>
            </button>
          </div>
        )}
      </div>

    </nav>
  )
}

// ═══════════════════════════════════════════════
// Skeleton — shown while Suspense loading
// ═══════════════════════════════════════════════
function SidebarNavSkeleton() {
  return (
    <nav className="flex-1 p-3">
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-7 bg-zinc-800 rounded-lg animate-pulse"
          />
        ))}
      </div>
    </nav>
  )
}