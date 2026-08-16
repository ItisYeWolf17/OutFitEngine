# Ropero

A personal wardrobe PWA. It catalogs clothes, generates the combinations that
actually work using a local rule engine, and optionally renders what you look
like wearing them.

The app competes with opening the closet door and looking inside, so it has to
be faster than that.

## How it works

Garments are photographed once, tagged by a vision model, and stored. A
deterministic rule engine — no AI, runs on the client, costs nothing — filters
the combinations down to the viable ones and ranks them by how long since you
wore each piece, what you have marked as a favorite, and how versatile each
item is. The model is only ever used to draw, never to decide.

## Stack

React + TypeScript + Vite, Tailwind, installable as a PWA. Firestore with
offline persistence, Firebase Auth, Firebase Storage, Cloud Functions.

## Documentation

- [Architecture overview](docs/architecture/overview.md)
- [The rule engine](docs/architecture/rule-engine.md)
- [Local setup](docs/development/setup.md)
- [Decisions](docs/decisions/)
- [Build plan](PLAN.md) — the original spec, in Spanish

## A note on language

Code, comments and documentation are in English. **UI copy is in Spanish**, on
purpose: the app has one user and the plan fixes the voice.

## Security

`VITE_FIREBASE_*` values are public by design and ship in the bundle — what
protects the data are the Firestore and Storage rules, which gate on an
allowlist of uids. Model API keys never reach the client; they live in Cloud
Functions secrets. No secrets are versioned.

## License

Apache-2.0.
