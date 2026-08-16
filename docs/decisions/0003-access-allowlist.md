# 0003 — Gate access on an allowlist of uids

**Status:** accepted

## Context

Firebase Auth with the Google provider accepts **any** Google account. Rules
scoped as `request.auth.uid == uid` isolate each person's data correctly, but
they do not stop a stranger from signing up and filling the project's Storage
and Firestore. This repo is public and the app is on a public URL, so the link
is discoverable.

## Decision

`firestore.rules` and `storage.rules` each hold an `allowed()` list of uids,
and `isOwner(uid)` requires membership. Everything else is denied.

## Why uids and not emails

We started with emails, which have the advantage that you can authorize
someone before they ever sign in — a uid does not exist until first sign-in.

But this repo is public, and an email in a rules file is a personal identifier
published to anyone who clones it. A uid is opaque: it reveals nothing about
who someone is and is worthless without the Google account behind it.

## Consequences

Adding a person takes two steps instead of one: they sign in once and get
denied, then their uid is read from `firebase auth:export` and added to both
files, and the rules are redeployed.

The list is duplicated across two files because Firestore and Storage are
separate services with separate rule sets. Adding someone to one and not the
other produces a half-working account.
