import { CloudBillingClient } from '@google-cloud/billing'
import { onMessagePublished } from 'firebase-functions/v2/pubsub'
import { logger } from 'firebase-functions'

// Google Cloud budget alerts warn, they do not cut. This cuts.
//
// When the budget is exceeded, Cloud Billing publishes to the configured
// Pub/Sub topic and this function unlinks the billing account from the
// project. It is deliberately brutal: the app stops working until you relink
// it by hand in the console. We prefer that to a surprise bill from a runaway
// useEffect.
//
// Deployment requirements (see README, phase 0):
//   1. A Pub/Sub topic named `alertas-presupuesto`
//   2. A Cloud Billing budget pointed at that topic
//   3. The function's service account granted Project Billing Manager
//      ON THE PROJECT (unlinking is checked against the project, not the
//      billing account)

export const BUDGET_TOPIC = 'alertas-presupuesto'

interface BudgetNotification {
  budgetDisplayName?: string
  costAmount?: number
  budgetAmount?: number
}

const billing = new CloudBillingClient()

export const disableBilling = onMessagePublished(
  { topic: BUDGET_TOPIC, region: 'us-central1', retry: false },
  async (event) => {
    const notice = event.data.message.json as BudgetNotification | undefined

    if (typeof notice?.costAmount !== 'number' || typeof notice?.budgetAmount !== 'number') {
      logger.warn('Budget notification without amounts, ignoring', { notice })
      return
    }

    if (notice.costAmount <= notice.budgetAmount) {
      logger.info('Spend within budget', {
        spent: notice.costAmount,
        budget: notice.budgetAmount,
      })
      return
    }

    const project = `projects/${process.env.GCLOUD_PROJECT}`
    const [info] = await billing.getProjectBillingInfo({ name: project })

    if (!info.billingEnabled) {
      logger.info('Billing was already disabled')
      return
    }

    // Empty string = unlink the billing account.
    await billing.updateProjectBillingInfo({
      name: project,
      projectBillingInfo: { billingAccountName: '' },
    })

    logger.error('BILLING DISABLED after exceeding budget', {
      spent: notice.costAmount,
      budget: notice.budgetAmount,
      budgetName: notice.budgetDisplayName,
    })
  },
)
