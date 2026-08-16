import { Route, Routes } from 'react-router-dom'
import { Login } from './features/auth/Login'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { Wardrobe } from './features/wardrobe/Wardrobe'

export default function App() {
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
