import { Navigate } from 'react-router-dom'
import { useAuth } from './authStore'

export function Login() {
  const { usuario, cargando, error, entrar } = useAuth()

  if (cargando) return null
  if (usuario) return <Navigate to="/" replace />

  return (
    <main className="flex min-h-dvh flex-col justify-between px-6 py-16">
      <div className="mt-16">
        <h1 className="text-3xl font-medium tracking-tight">Ropero</h1>
        <p className="mt-3 max-w-xs text-[var(--color-tenue)]">
          Tu ropa, con las combinaciones ya resueltas.
        </p>
      </div>

      <div>
        {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
        <button
          type="button"
          onClick={() => void entrar()}
          className="w-full rounded-full bg-[var(--color-tinta)] px-6 py-4 text-base font-medium text-[var(--color-papel)] active:opacity-80"
        >
          Entrar con Google
        </button>
      </div>
    </main>
  )
}
