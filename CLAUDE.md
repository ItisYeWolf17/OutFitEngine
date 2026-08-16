# Ropero virtual

A personal PWA that catalogs clothing, generates valid combinations with a
local rule engine, and optionally renders what the user looks like wearing an
outfit.

**Code, comments and docs are in English. UI copy stays in Spanish** — voice
active, sentence case. That is a product decision, not an oversight: see the
design section of `PLAN.md`, which is the original Spanish spec.

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
   key in a PWA bundle is a public key. The `VITE_FIREBASE_*` values are public
   by design: what protects the data are the rules. **This repo is public** —
   secrets go in `firebase functions:secrets:set`, never in a file.
2. **The client never decides whether it can spend.** `imageBudget` and
   `imagesGenerated` are decremented in a server-side transaction, and
   `firestore.rules` forbids the client from writing those fields. Same for
   `renderUrl`.
3. **The cache is checked before any paid call**, without exception.
4. **`npm test` must pass before every commit.**

## Commands

```bash
npm run dev      # vite on :5173
npm test         # vitest, single run
npm run build    # tsc -b && vite build
npm run emul     # firebase emulators
npm run deploy   # build + firebase deploy
```

## Layout

```
src/
├── domain/        types.ts, outfitEngine.ts, outfitEngine.test.ts
├── data/          firebase.ts, garmentsRepo.ts, outfitsRepo.ts, schemas.ts
├── features/      capture/ wardrobe/ suggestions/ collage/ tryon/ auth/
├── components/ui/
└── hooks/
functions/         Cloud Functions (disableBilling, tagGarment, renderOutfit)
```

Firestore collections: `users/{uid}` with subcollections `garments`, `outfits`,
`wearLog`, `spending`, `rateLimits`.

## Design

The subject is a wardrobe, not a dashboard. The app competes with opening the
closet door and looking inside: it has to be faster than that.

- One decision per screen. The main one answers "what do I wear today" and
  nothing else.
- The garment is the content. Neutral ground; the color comes from the clothes.
- High density in the wardrobe, low density in the suggestion.
- Gestures, not menus. The use case is one hand, half asleep.

## Status

Phase 0 complete and verified: project `ropero-outfitengine`, Google auth, PWA
installed on Android with the session persisting, Hosting at
`https://ropero-outfitengine.web.app`, rules deployed, a $5 budget measuring
gross spend, and `disableBilling` unlinking billing when it is exceeded.

Access is limited by an allowlist of uids in `firestore.rules` and
`storage.rules`. For now only the owner. If users are added later, they go in
that list in both files and the rules get redeployed: each would get their own
wardrobe, but the billing budget stays one single cap for the whole project.

Phase 1 is next. The phases live in `PLAN.md`. One phase per session, running
the acceptance criteria before moving on.
