// src\types\index.ts
//all TypeScript types
export type VaultType = 'personal' | 'work'

export type UserPlan = 'free' | 'pro'

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  plan: UserPlan
  created_at: string
}

export interface Collection {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

export interface Project {
  id: string
  name: string
  color: string
  owner_id: string
  created_at: string
}

export interface ProjectMember {
  project_id: string
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
}

export interface Memory {
  id: string
  user_id: string
  content: string
  url: string | null
  source_title: string | null
  vault_type: VaultType
  collection_id: string | null
  project_id: string | null
  created_at: string
  // embedding stored in DB but never sent to frontend
}

export interface Connection {
  from_id: string
  to_id: string
  strength: number  // 0.0 – 1.0
  created_at: string
}

export interface Reminder {
  id: string
  memory_id: string
  user_id: string
  trigger_at: string
  intent: string
  sent: boolean
}

// API response wrapper — consistent error handling
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}