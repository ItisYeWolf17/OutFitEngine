# Ropero virtual

A personal PWA that catalogs clothing, generates valid combinations with a
local rule engine, and optionally renders what the user looks like wearing an
outfit.

**Code, comments and docs are in English. UI copy stays in Spanish** — active
voice, sentence case. That is a product decision, not an oversight: `PLAN.md`
is the original Spanish spec and fixes the voice.

## Settled decisions (do not reopen without reason)

| Decision | Choice |
|---|---|
| Platform | Installable PWA, not a native app |
| Framework | React + Vite + TypeScript |
| Database | Firestore, with offline persistence |
| Auth | Firebase Auth, Google provider, single user |
| Images | Compressed client-side + Firebase Storage |
| Suggestion engine | Deterministic rules on the client, no AI |
| Garment tagging | Vision model, once per garment |
| Try-on | On demand, cached by `outfitId`, hard budget cap |
| Cost target | < $10 once, ~$0/month at rest |

**What we do NOT do:** no AI deciding what matches — the rules decide and the
AI only draws. We do not pre-generate every combination, only the top-scoring
ones.

## Hard rules

1. **Model API keys never reach the client.** Every Gemini call goes through a
   Cloud Function that validates the authenticated user before forwarding. A
   key in a PWA bundle is a public key. **This repo is public** — secrets go in
   `firebase functions:secrets:set`, never in a file. The `VITE_FIREBASE_*`
   values are public by design: what protects the data are the rules.
2. **The client never decides whether it can spend.** `imageBudget` and
   `imagesGenerated` are decremented in a server-side transaction, and
   `firestore.rules` forbids the client from writing those fields. Same for
   `renderUrl`.
3. **The cache is checked before any paid call**, without exception.
4. **`npm test` and `npm run lint` must pass before every commit.**

## Layout

```
src/
├── app/            App.tsx, routes.tsx — composition root
├── domain/         the rule engine and its types; pure, no I/O
├── features/
│   ├── auth/       components/, hooks/, index.ts
│   └── wardrobe/   components/, index.ts
├── lib/firebase/   config, auth, firestore, storage, functions
├── styles/         index.css and the theme tokens
└── main.tsx
functions/src/
├── functions/      Cloud Functions: trigger wiring only
├── services/       the actual operations
└── types/
docs/               architecture/, decisions/, development/
```

Read `docs/architecture/overview.md` before moving code between these.

## Conventions

- **Imports** use the `@/` alias for anything outside the current feature, and
  relative paths within one. `@/` maps to `src/` in both `tsconfig.app.json`
  and `vite.config.ts` — change one and you must change the other.
- **Features are self-contained.** A component only used by one feature lives
  in that feature, not in `src/components`. Cross-feature imports go through
  the feature's `index.ts`, never into its internals.
- **Components never touch Firebase directly.** Component → feature hook or
  service → `src/lib/firebase` → Firebase.
- **Naming** is domain language in English: `Garment`, not `Item` or `Prenda`.
  Firestore collections match: `users/{uid}/garments`, and then `outfits`,
  `wearLog`, `spending`, `rateLimits`.
- **Comments explain why**, not what. If a line needs a comment to say what it
  does, rename something instead.

## Feature architecture

```
src/features/<feature>/
├── components/
├── hooks/
├── services/     data access for this feature
├── types.ts      types only this feature uses
└── index.ts      the public surface
```

Create only the folders a feature actually needs. `src/components/ui` and
`src/components/layout` exist for genuinely reusable pieces; there are none
yet, so those folders do not exist yet either.

## Firebase

`src/lib/firebase` has one module per service, each exporting one instance.
Import the specific module (`@/lib/firebase/auth`), not the barrel, so unused
SDKs stay out of the bundle — that is what keeps it at 390 KB instead of 891 KB.

Firestore offline persistence is configured in `firestore.ts` via
`initializeFirestore`, which must run before anything calls `getFirestore`.
Importing the module is what guarantees the ordering.

## Cloud Functions

```
Cloud Function → Service → Repository → Firestore
```

Functions in `functions/src/functions` do trigger wiring, parsing and logging.
The operation itself goes in a service. There is no `repositories/` yet because
no function touches Firestore.

Renaming an exported function creates a new Cloud Function; the old one is not
renamed. Deploy the new one, verify its trigger, then delete the old — see
`docs/development/setup.md`.

## Auth

Google provider only. `useAuth` is a zustand store with a single
`onAuthStateChanged` observer mounted at import. It picks popup or redirect by
checking `display-mode: standalone`, because on installed iOS the popup has no
opener to answer to. `ProtectedRoute` renders nothing while `loading` is true —
a spinner that flashes for 20 ms looks worse than a blank frame.

Access is gated by an allowlist of uids in the rules, not by auth: any Google
account can authenticate, and then gets denied. See
`docs/decisions/0003-access-allowlist.md`.

## Error handling

Fail loudly at the boundary, quietly in the UI. The environment is validated
with Zod at startup so a misconfiguration names itself. Auth errors that are
the user's own doing — closing the popup — are swallowed; everything else sets
`error` and is logged. Anything the model returns is parsed with Zod before it
is trusted.

## Testing

`npm test` runs Vitest over `src/**/*.test.ts`. The rule engine is the only
tested unit and the only one that needs it: pure, deterministic, and its bugs
are silent rather than loud.

Tests inject the clock and use the fixed fixture in `src/domain/fixtures.ts`.
Never assert against `Date.now()` or a randomly built wardrobe. Prefer
asserting a property — the pruning test compares against a brute force pass
rather than a magic count.

## Security

- `.env.local` is gitignored. `.env.example` documents the shape, never values.
- Rules deny by default and gate on an allowlist of uids.
- Storage caps uploads at 2 MB and requires an `image/*` content type.
- `imageBudget`, `imagesGenerated` and `renderUrl` are server-only fields.
- If a secret is ever committed, report it before rewriting anything.

## Commands

```bash
npm run dev      # vite on :5173
npm test         # vitest, single run
npm run lint     # oxlint
npm run build    # tsc -b && vite build
npm run emul     # firebase emulators
npm run deploy   # build + firebase deploy
```

## Git

One branch per phase (`phase-1-domain`). Commit messages in English, subject in
the imperative, body explaining why rather than what. Do not commit unless
asked. Never force-push a shared branch without saying so first.

## Status

Phase 0 and phase 1 complete. Phases live in `PLAN.md`, one per session, with
the acceptance criteria run before moving on.
