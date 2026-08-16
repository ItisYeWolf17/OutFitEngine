import { useAuth } from '../auth/authStore'

export function Ropero() {
  const { usuario, salir } = useAuth()

  return (
    <main className="flex min-h-dvh flex-col px-6 py-8">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-medium tracking-tight">Ropero</h1>
        <button
          type="button"
          onClick={() => void salir()}
          className="text-sm text-[var(--color-tenue)] underline underline-offset-4"
        >
          Salir
        </button>
      </header>

      {/* Fase 2 reemplaza esto por el grid y conecta el boton a la camara. */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <p className="text-lg">Agregá tu primera prenda</p>
        <p className="max-w-xs text-sm text-[var(--color-tenue)]">
          Sesión iniciada como {usuario?.email}. La captura llega en la fase 2.
        </p>
      </div>
    </main>
  )
}
