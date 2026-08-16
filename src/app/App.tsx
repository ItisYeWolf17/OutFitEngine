import { AppRoutes } from './routes'

// Where app-wide providers go when there are any. The auth store is a zustand
// module, so it needs no provider today.
export default function App() {
  return <AppRoutes />
}
