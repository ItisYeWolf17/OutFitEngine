# Local setup

## Requirements

Node 22+, and the Firebase CLI for anything touching the project.

## First run

```bash
npm install
cp .env.example .env.local   # fill in from Firebase console → Project settings
npm run dev
```

`src/lib/firebase/config.ts` validates the environment with Zod at startup, so
a missing variable fails immediately with the variable's name rather than deep
inside a Firestore listener.

`.env.local` is gitignored and must stay that way. The `VITE_FIREBASE_*` values
are public by design — they ship in the bundle — but there is no reason to
version them.

## Commands

```bash
npm run dev      # vite on :5173
npm test         # vitest, single run
npm run lint     # oxlint
npm run build    # tsc -b && vite build
npm run emul     # firebase emulators
npm run deploy   # build + firebase deploy
```

## Deploying pieces separately

```bash
firebase deploy --only hosting
firebase deploy --only firestore:rules,storage
firebase deploy --only functions
```

Renaming an exported function creates a **new** Cloud Function rather than
renaming the old one. Deploy the new one and verify its trigger before deleting
the old, or the cost guard is uncovered in between:

```bash
firebase deploy --only functions:<newName>
firebase functions:list
firebase functions:delete <oldName> --region us-central1
```

## Adding a user

They sign in once and get permission denied. Then:

```bash
firebase auth:export users.json --format=json
```

Add their uid to `allowed()` in **both** `firestore.rules` and `storage.rules`,
and redeploy the rules. See `docs/decisions/0003-access-allowlist.md`.
