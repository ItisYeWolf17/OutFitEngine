import { Route, Routes } from 'react-router-dom'
import { Login, ProtectedRoute } from '@/features/auth'
import { Wardrobe } from '@/features/wardrobe'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/signin" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Wardrobe />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
