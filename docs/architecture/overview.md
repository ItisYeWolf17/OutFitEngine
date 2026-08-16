# Architecture overview

A personal PWA that catalogs clothing, generates valid combinations with a
local rule engine, and optionally renders the user wearing an outfit.

## Layers

```
Component            src/features/<feature>/components
    ↓
Feature hook/service src/features/<feature>/hooks, .../services
    ↓
Firebase abstraction src/lib/firebase
    ↓
Firebase
```

Components never touch Firebase directly. A feature owns its own data access,
and `src/lib/firebase` owns initialization and nothing else.

## Where things live

| Path | Holds |
|---|---|
| `src/app` | Composition root: providers and the route table |
| `src/domain` | The rule engine and its types. Pure, no I/O, no Firebase |
| `src/features/*` | One folder per real feature, with its own components and hooks |
| `src/lib/firebase` | One module per Firebase service, each exporting one instance |
| `src/styles` | Global stylesheet and the Tailwind theme tokens |
| `functions/src` | Cloud Functions, thin, delegating to services |

`src/domain` sits outside `features/` on purpose: the engine is consumed by the
wardrobe, the suggestions screen and the try-on budget alike, and it is the one
piece with real invariants worth testing in isolation.

## Why `lib/firebase` is split per service

Each Firebase service lives in its own module so importing one does not drag in
the rest. Nothing imports `firestore.ts`, `storage.ts` or `functions.ts` yet, so
those SDKs are tree-shaken out entirely — the production bundle is 390 KB
instead of 891 KB. As features land they pull in only what they use.

A consequence worth knowing: Firestore offline persistence is configured in
`firestore.ts` and therefore initializes on first import, not at page load.
`initializeFirestore` runs there before any consumer can call `getFirestore`,
which is the ordering the SDK requires.

## Cloud Functions

```
Cloud Function   functions/src/functions   trigger wiring, parsing, logging
    ↓
Service          functions/src/services    the actual operation
    ↓
Repository       functions/src/repositories (none yet — no Firestore access)
```

There is no `repositories/` folder yet because no function reads or writes
Firestore. It gets added when `tagGarment` needs to record spend.

## Testing

The rule engine is the only thing with tests, and it is the only thing that
needs them: it is pure, deterministic and its bugs are silent. Tests inject the
clock and use a fixed fixture, so a run never depends on the day it happens on.

Everything else is either configuration (validated by deploying) or a thin
component (validated by looking at it).
