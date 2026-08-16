import { CloudBillingClient } from '@google-cloud/billing'

const billing = new CloudBillingClient()

export type UnlinkResult = 'unlinked' | 'already-disabled'

// Unlinks the billing account from the project. Deliberately brutal: the app
// stops working until it is relinked by hand in the console. We prefer that
// to a surprise bill from a runaway useEffect.
//
// Requires the function's service account to hold Project Billing Manager ON
// THE PROJECT — unlinking is authorized against the project being unlinked,
// not against the billing account.
export async function unlinkBillingAccount(projectId: string): Promise<UnlinkResult> {
  const name = `projects/${projectId}`
  const [info] = await billing.getProjectBillingInfo({ name })

  if (!info.billingEnabled) return 'already-disabled'

  // Empty string = unlink.
  await billing.updateProjectBillingInfo({
    name,
    projectBillingInfo: { billingAccountName: '' },
  })

  return 'unlinked'
}
