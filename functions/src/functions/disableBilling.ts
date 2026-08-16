import { logger } from 'firebase-functions'
import { onMessagePublished } from 'firebase-functions/v2/pubsub'
import { unlinkBillingAccount } from '../services/billingService'
import { type BudgetNotification, hasAmounts } from '../types/budget'

// Google Cloud budget alerts warn, they do not cut. This cuts.
//
// Deployment requirements (see docs/decisions/0002-cost-guards.md):
//   1. A Pub/Sub topic named `alertas-presupuesto`
//   2. A Cloud Billing budget pointed at that topic, with credits excluded
//   3. The function's service account granted Project Billing Manager on the
//      project

export const BUDGET_TOPIC = 'alertas-presupuesto'

export const disableBilling = onMessagePublished(
  { topic: BUDGET_TOPIC, region: 'us-central1', retry: false },
  async (event) => {
    const notice = event.data.message.json as BudgetNotification | undefined

    if (!hasAmounts(notice)) {
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

    const result = await unlinkBillingAccount(process.env.GCLOUD_PROJECT ?? '')

    if (result === 'already-disabled') {
      logger.info('Billing was already disabled')
      return
    }

    logger.error('BILLING DISABLED after exceeding budget', {
      spent: notice.costAmount,
      budget: notice.budgetAmount,
      budgetName: notice.budgetDisplayName,
    })
  },
)
