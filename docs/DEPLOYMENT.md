# Deployment and private pilot setup

## What is implemented

Next.js application, Google sign-in, private event APIs, birthday/anniversary editing, archive/delete, timezone preferences, monthly/weekly/daily email previews, an explicit Resend test-send endpoint, and test history. The signed-out demo never stores data or sends messages. Text messages, payments, browser push, and automatic scheduled email are not enabled.

## Run locally

1. Use Node 24.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local` and configure server variables privately.
4. Run `npm run dev`.
5. Before committing: `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e`.

## Vercel

Import `aheiner2001/reminderapp` into Vercel, framework Next.js, repository root, Node 24. `vercel.json` specifies `npm ci` and `npm run build`. Do not set output directory or a GitHub Pages base path.

Use Preview environment variables for test deployments. The supplied `sandbox-ed1e2` public configuration is the fallback; custom Firebase configurations require all six `NEXT_PUBLIC_FIREBASE_*` values from `.env.example`. Values are embedded at build time, so redeploy after changing them. Use a separate Firebase project before opening a production paid service.

### Server environment variables

| Name                          | Purpose                                                                 |
| ----------------------------- | ----------------------------------------------------------------------- |
| `FIREBASE_ADMIN_PROJECT_ID`   | `sandbox-ed1e2` for the current pilot                                   |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Firebase service-account email                                          |
| `FIREBASE_ADMIN_PRIVATE_KEY`  | Service-account private key; literal `\\n` line breaks are supported    |
| `TESTER_EMAILS`               | Comma-separated invited Google account addresses                        |
| `resend_api_key`              | The exact lowercase key Aaron added; `RESEND_API_KEY` works as an alias |
| `RESEND_FROM_EMAIL`           | Approved sender address on a verified Resend domain                     |

Keep these on the server. Never prefix private credentials with `NEXT_PUBLIC_` and never paste a service-account key into GitHub. The web config is not an Admin credential and cannot replace one. The UI renders without backend secrets; authenticated saving requires the Admin configuration and invitation list. Changes to Vercel variables require a redeployment.

A GitHub repository secret or variable is not automatically available to Vercel. If the Resend key was added in GitHub, also configure it privately in the Vercel project's Preview environment. CI does not need this key and never sends real emails.

## Firebase console

- Enable Authentication → Google provider and select a support email.
- Create the Firestore database in the sandbox project.
- Authorize the stable Vercel hostname in Authentication → Settings → Authorized domains. Authorize each preview hostname used for sign-in; wildcard entries are not assumed. Add `localhost` explicitly for local development if absent.
- Configure the Firebase Admin credentials privately on the Vercel server with appropriate sandbox permissions.
- Add invited, verified Google emails to `TESTER_EMAILS` in Vercel. An empty invitation list denies all authenticated app access.

App data is namespaced under `reminderUsers/{uid}` so it does not collide with another app's `users` collection. App deletion removes only Remember data and signs out; it does not delete the shared Firebase Authentication identity. An invited user may sign in again to start fresh.

The server APIs enforce invitations on every request and always derive the Firestore path from the verified Firebase UID. They ignore caller-supplied ownership fields. Signed-in but uninvited people cannot read/save/send through the APIs. Authentication itself can still create an identity; it does not grant app access.

`firestore.rules` denies direct client access because all private data goes through these server APIs. **Do not deploy these rules blindly to a shared sandbox that contains other apps.** Merge equivalent deny rules for this app's paths into the existing rules, or use a dedicated Firebase project. The Admin SDK bypasses rules, so API authorization remains necessary. Rules were not deployed by this change.

## Resend test email

### Start without buying a domain

For testing only, set `RESEND_FROM_EMAIL=Remember <onboarding@resend.dev>` in Vercel and redeploy. Resend allows that sender to email only the address associated with your Resend account. Sign in to Remember using that same address, and include it in `TESTER_EMAILS`. Other testers can use the UI after invitation, but their test emails will be rejected until you verify a domain you control.

To send to other testers, add a domain in Resend, publish the DNS verification records it supplies, wait for verification, and change `RESEND_FROM_EMAIL` to an address on that domain. An existing domain you own can be used; the Vercel preview URL is not a sender domain you control. See [Resend's testing restriction](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).


Sign in with an invited Google account, save an occasion, open Reminder preview, choose a date with qualifying reminders, then click Send me this test email. The server reads saved events rather than trusting an email payload from the browser. The only recipient is the verified sign-in email. It rejects paused/disabled/empty summaries, applies an atomic limit of three requests per UTC day per user in the separate `reminderRateLimits` collection (account deletion cannot reset it), and uses an idempotency key for the provider request.

Test history distinguishes sending, accepted, failed, and unknown. Accepted is not confirmation of inbox delivery. Unknown requests are not retried blindly. No provider delivery webhook is enabled yet; no test sends happen in CI. The free provider's test sender may restrict recipients; verify a sender domain before inviting other people.

## GitHub Actions

`.github/workflows/ci.yml` runs on pushes, pull requests, and manual dispatch: `npm ci`, typecheck, unit/API tests, production build, and browser smoke tests. It uses only the public sandbox defaults and no deployment keys. This is build/test CI, not hosting and not an email scheduler. Vercel's Git integration separately creates deploy previews after repository import. To block merges, require the CI check in branch protection after its first run.

## Next milestone: scheduled reminders

Keep automatic sending disabled until sender setup and access-control checks pass. Add one 15-minute managed scheduler invoking protected backend logic, persisted per-user/channel/local-day jobs, dispatch-time invitation/preferences checks, bounded retries, signed unsubscribe, provider webhooks/suppression, and monitoring. A saved 9 AM preference does not schedule a message by itself. Firebase Cloud Scheduler/Functions billing and setup remain a separate milestone in the approved plan.

## Verification limits

The demo UI, API rejection paths, date engine, and local production build can be tested without your credentials. Live Google OAuth, Firestore persistence, and actual email delivery require your Firebase/Vercel settings and an invited test account. A successful local build is not proof that remote CI or a deployment succeeded.

Rate-limit records retain only UID/date/count and an expiry timestamp for 30 days. Configure Firestore TTL on `reminderRateLimits.expiresAt` for automatic cleanup; TTL has not been enabled by this change. App account deletion preserves these short-lived anti-abuse counters.
