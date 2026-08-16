// Shape of the message Cloud Billing publishes to the budget's Pub/Sub topic.
// Only the fields we actually rely on are declared.
export interface BudgetNotification {
  budgetDisplayName?: string
  costAmount?: number
  budgetAmount?: number
}

export function hasAmounts(
  notice: BudgetNotification | undefined,
): notice is BudgetNotification & { costAmount: number; budgetAmount: number } {
  return typeof notice?.costAmount === 'number' && typeof notice?.budgetAmount === 'number'
}
