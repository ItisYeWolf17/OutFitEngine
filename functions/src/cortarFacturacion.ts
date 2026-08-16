import { CloudBillingClient } from '@google-cloud/billing'
import { onMessagePublished } from 'firebase-functions/v2/pubsub'
import { logger } from 'firebase-functions'

// El alert de presupuesto de Google Cloud avisa, no corta. Esto corta.
//
// Al superarse el presupuesto, Cloud Billing publica en el topic de Pub/Sub
// configurado; esta funcion desvincula la cuenta de facturacion del proyecto.
// Es deliberadamente brutal: la app deja de funcionar hasta que la revincules
// a mano en la consola. Preferimos eso a una factura sorpresa por un
// useEffect en loop.
//
// Requisitos de despliegue (ver README, fase 0):
//   1. Topic de Pub/Sub llamado `alertas-presupuesto`
//   2. Budget en Cloud Billing apuntado a ese topic
//   3. La service account de la funcion con rol Administrador de proyectos
//      de facturacion SOBRE LA CUENTA DE FACTURACION (no sobre el proyecto)

export const TOPIC_PRESUPUESTO = 'alertas-presupuesto'

interface AvisoPresupuesto {
  budgetDisplayName?: string
  costAmount?: number
  budgetAmount?: number
}

const facturacion = new CloudBillingClient()

export const cortarFacturacion = onMessagePublished(
  { topic: TOPIC_PRESUPUESTO, region: 'us-central1', retry: false },
  async (evento) => {
    const aviso = evento.data.message.json as AvisoPresupuesto | undefined

    if (typeof aviso?.costAmount !== 'number' || typeof aviso?.budgetAmount !== 'number') {
      logger.warn('Aviso de presupuesto sin montos, se ignora', { aviso })
      return
    }

    if (aviso.costAmount <= aviso.budgetAmount) {
      logger.info('Gasto dentro del presupuesto', {
        gastado: aviso.costAmount,
        presupuesto: aviso.budgetAmount,
      })
      return
    }

    const proyecto = `projects/${process.env.GCLOUD_PROJECT}`
    const [info] = await facturacion.getProjectBillingInfo({ name: proyecto })

    if (!info.billingEnabled) {
      logger.info('La facturacion ya estaba desactivada')
      return
    }

    // Cadena vacia = desvincular la cuenta de facturacion.
    await facturacion.updateProjectBillingInfo({
      name: proyecto,
      projectBillingInfo: { billingAccountName: '' },
    })

    logger.error('FACTURACION DESACTIVADA por exceso de presupuesto', {
      gastado: aviso.costAmount,
      presupuesto: aviso.budgetAmount,
      presupuestoNombre: aviso.budgetDisplayName,
    })
  },
)
