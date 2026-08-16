import { Route, Routes } from 'react-router-dom'
import { Login } from './features/auth/Login'
import { RutaProtegida } from './features/auth/RutaProtegida'
import { Ropero } from './features/ropero/Ropero'

export default function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<Login />} />
      <Route
        path="/"
        element={
          <RutaProtegida>
            <Ropero />
          </RutaProtegida>
        }
      />
    </Routes>
  )
}
