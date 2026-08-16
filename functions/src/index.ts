import { initializeApp } from 'firebase-admin/app'

initializeApp()

// Fase 0: solo la guarda de costo. `etiquetarPrenda` (fase 3) y
// `renderizarOutfit` (fase 5) se exportan desde aca cuando existan.
export { cortarFacturacion } from './cortarFacturacion'
