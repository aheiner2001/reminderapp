# Implementation review — October 2, 2026

## Scope and verification

This milestone implements the responsive Next.js pilot, Firebase Google sign-in, server-enforced verified tester access, private event management, deterministic reminder previews, and explicit Resend test sends. Automatic scheduled messages, SMS, push, and subscriptions remain future milestones.

Local verification: clean dependency install, TypeScript check, 37 unit/component/API tests, production build, and two Chromium browser smoke tests passed. The browser checks cover demo editing, previews, invalid preferences, mobile layout, and anonymous API denial. The private API checks use simulated Firebase/provider boundaries; live OAuth, database persistence, and inbox delivery are not verified without external settings.

## Review fixes

- Preserve daily email quota outside deletable app data; deleting/recreating an app profile cannot reset the quota. Regression failed before the fix and passed after it.
- Reset private drafts/preferences when authentication identity changes and ignore stale asynchronous mutation responses. Both regressions failed before the fix and passed after it.
- Expand private API verification: ownership isolation, forged/revoked tokens, invitation denial, validation, server-derived email recipient, quota, disabled sending, provider failures, and scoped account deletion.

## Implementation decisions

- Use a fresh isolated clone and feature branch instead of a second worktree; the clone had no user modifications.
- Server APIs own Firestore access; clients cannot read/write directly. This requires private Firebase Admin credentials.
- Namespace data under `reminderUsers`, and preserve the shared Firebase Auth identity on app deletion. Invited users can start again.
- Keep test email explicit and limited to the verified sign-in address. Provider acceptance does not establish inbox delivery.
- Keep scheduled sending disabled until setup and live access checks pass, as specified in the deployment plan.

## Deferred minor findings

- Refresh today's date on focus or at midnight for tabs left open overnight.
- Separate unsaved preference previews from saved settings used by the server test send, or disable sending while preferences are dirty.
- Display optional age/anniversary number in the browser preview as well as the email.
- Reject partially configured custom Firebase environment variables rather than using the sandbox fallback when project ID is absent.
- Production dependency audit has two moderate UUID/gaxios transitive findings; the high-severity gRPC finding was resolved with a patched dependency override. Avoid unverified forced dependency upgrades.

## External setup still required

Import the feature branch into Vercel or merge it before importing main. Set the server variables in `docs/DEPLOYMENT.md`, enable Firebase Google sign-in, authorize the deployment hostname, and verify a Resend sender domain. The connected Vercel deployment action was unavailable and no Reminder app project was visible, so no live deployment is claimed. Do not deploy blanket Firestore rules onto a shared project without integrating existing rules.
