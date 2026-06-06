// src\lib\hooks\useDebounce.ts
import { useState, useEffect } from 'react'

// useEffect here is CORRECT — timer = external system
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    // External system: setTimeout
    const timer = setTimeout(() => {
      setDebounced(value)
    }, delay)

    // Cleanup = external system teardown ✓
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}