# 0002 — Cost guards before anything that can spend

**Status:** accepted

## Context

The project targets under $10 once and roughly $0/month at rest, on a Blaze
plan with no hard ceiling. The real risk is not expected spend but a bug — a
`useEffect` firing model calls in a loop while nobody is watching.

Google Cloud budget alerts send email. They do not stop anything.

## Decision

Four layers, all in place before any paid call exists:

1. **A $5 budget** scoped to the project, published to the Pub/Sub topic
   `alertas-presupuesto`.
2. **`disableBilling`**, a Cloud Function subscribed to that topic, which
   unlinks the billing account when spend exceeds the budget.
3. **Server-side counters.** `imageBudget` and `imagesGenerated` live in the
   user document and `firestore.rules` forbids the client from writing them.
   Same for `renderUrl`, which is what a paid render produces.
4. **Cache before any paid call**, keyed by `outfitId`, which is a
   deterministic function of the sorted garment ids.

## Why `EXCLUDE_ALL_CREDITS`

By default a budget measures cost **net of credits**. With $300 of free trial
credit absorbing everything, `costAmount` would sit at zero no matter the usage
and the guard would never fire — precisely during the months of heaviest
experimentation. The budget is configured to measure gross spend instead.

## Why the function is brutal

Unlinking billing takes the app down until it is relinked by hand in the
console. That is the point. A guard that degrades gracefully is a guard that
does not stop a runaway loop.

## Consequences

The function's service account needs Project Billing Manager **on the project**
— not on the billing account, which rejects that role. Unlinking is authorized
against the project being unlinked.

The budget is one cap for the whole project. If the app ever has more than one
user, their spend adds up against that single $5 and the kill switch takes down
everyone's app at once.
