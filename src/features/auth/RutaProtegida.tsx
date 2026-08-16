import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './authStore'

export function RutaProtegida({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useAuth()

  // Pantalla en blanco a proposito: resolver la sesion persistida toma
  // milisegundos y un spinner que parpadea se ve peor que nada.
  if (cargando) return null
  if (!usuario) return <Navigate to="/entrar" replace />

  return <>{children}</>
}
