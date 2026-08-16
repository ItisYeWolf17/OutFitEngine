import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  // Blank on purpose: resolving the persisted session takes milliseconds, and
  // a spinner that flashes looks worse than nothing.
  if (loading) return null
  if (!user) return <Navigate to="/signin" replace />

  return <>{children}</>
}
