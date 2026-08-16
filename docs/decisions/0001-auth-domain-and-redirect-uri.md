# 0001 — Keep the default authDomain

**Status:** accepted

## Context

On installed iOS, `signInWithPopup` hangs: in standalone mode there is no
opener for the popup to answer to. The fix is `signInWithRedirect`, which
`useAuth` selects by checking `display-mode: standalone`.

Redirect has its own problem. Safari's storage partitioning breaks the flow
when the auth handler lives on a third-party origin, and the default
`<project>.firebaseapp.com` is a third party relative to the app. The usual
remedy is to point `authDomain` at the same origin that serves the app.

We tried that — `authDomain = ropero-outfitengine.web.app` — and sign-in died
with `400 redirect_uri_mismatch`.

## Decision

Keep `authDomain` at the default `<project>.firebaseapp.com`.

## Why

Changing `authDomain` also changes the `redirect_uri` Firebase sends, to
`<that origin>/__/auth/handler`. Google's auto-created OAuth client only has
the default handler registered, so the new URI is rejected. Registering it by
hand in the OAuth client is possible but was not worth blocking on, and the app
is used on Android today, where popup works.

## Consequences

Redirect sign-in on installed iOS may break when we get there. The remedy is
documented in `.env.example` next to the variable: change the value **and**
register `<origin>/__/auth/handler` under Authorized redirect URIs in
APIs & Services → Credentials. One without the other produces a login that
cannot work.
