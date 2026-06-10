// src\components\dashboard\StoreInitializer.tsx
'use client'

import { useState } from 'react'
import { useVaultStore } from '@/lib/store/useVaultStore'
import type { Collection, Project } from '@/types'

interface Props {
  collections: Collection[]
  projects: Project[]
}

export default function StoreInitializer({ collections, projects }: Props) {

  // useState initializer — runs exactly once, before render
  // Never causes re-render, never triggers during render
  useState(() => {
    useVaultStore.setState({ collections, projects })
  })

  return null
}