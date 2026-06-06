// src\lib\store\useVaultStore.ts
import { create } from 'zustand'
import type { Collection, Project } from '@/types'

interface VaultStore {
  collections: Collection[]
  projects: Project[]
  setCollections: (collections: Collection[]) => void
  setProjects: (projects: Project[]) => void
  addCollection: (collection: Collection) => void
  addProject: (project: Project) => void
  removeCollection: (id: string) => void
  removeProject: (id: string) => void
}

export const useVaultStore = create<VaultStore>((set) => ({
  collections: [],
  projects: [],

  setCollections: (collections) => set({ collections }),
  setProjects: (projects) => set({ projects }),

  addCollection: (collection) =>
    set((state) => ({
      collections: [...state.collections, collection],
    })),

  addProject: (project) =>
    set((state) => ({
      projects: [...state.projects, project],
    })),

  removeCollection: (id) =>
    set((state) => ({
      collections: state.collections.filter((c) => c.id !== id),
    })),

  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
    })),
}))