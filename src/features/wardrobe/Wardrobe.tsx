import { useAuth } from '../auth/authStore'

// UI copy stays in Spanish on purpose: see the design section of PLAN.md.
export function Wardrobe() {
  const { user, signOut } = useAuth()

  return (
    <main className="flex min-h-dvh flex-col px-6 py-8">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-medium tracking-tight">Ropero</h1>
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-sm text-[var(--color-muted)] underline underline-offset-4"
        >
          Salir
        </button>
      </header>

      {/* Phase 2 replaces this with the grid and wires the button to the camera. */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <p className="text-lg">Agregá tu primera prenda</p>
        <p className="max-w-xs text-sm text-[var(--color-muted)]">
          Sesión iniciada como {user?.email}. La captura llega en la fase 2.
        </p>
      </div>
    </main>
  )
}
