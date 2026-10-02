# Testing and Deployment Implementation Plan

Date: October 2, 2026. Status: Proposed; no application or deployments exist yet.
Spec: docs/superpowers/specs/2026-10-02-birthday-reminder-design.md

## Goal
Build the reminder web app so the same locked dependency installation and production build pass locally, in GitHub Actions, and in Vercel previews. GitHub Actions is the CI runner; Vercel hosts the running application. GitHub Pages is not part of this deployment.

## Architecture
Use Next.js with TypeScript, Firebase Google sign-in and Firestore. Use the supplied sandbox-ed1e2 Firebase project for testing only. Preserve normal Next.js server support on Vercel; do not configure a GitHub Pages basePath or static export. Email scheduling remains a separate backend milestone.

## Files
- package.json and package-lock.json: reproducible dependencies and scripts.
- app/layout.tsx, app/page.tsx: initial application shell.
- src/lib/firebase/client.ts: lazily initialize the Firebase browser SDK with getApps/getApp protection.
- .env.example: public Firebase configuration names and sandbox defaults.
- .github/workflows/ci.yml: checks on pushes, pull requests, and workflow_dispatch.
- tests/: meaningful date-engine and access-control tests as functionality is implemented.
- docs/DEPLOYMENT.md: Vercel and Firebase console setup.
- firestore.rules: private owner and tester membership checks.

## Sandbox configuration
Use NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, and NEXT_PUBLIC_FIREBASE_APP_ID.

Values come from Aaron's supplied Firebase web configuration for sandbox-ed1e2.
They are browser configuration, not an Admin service-account credential.
Keep service-account private keys, email provider keys, Stripe secrets, and tester
allowlists in server-controlled configuration, never NEXT_PUBLIC variables.

## Tasks
- [x] Create the Next.js application and commit a lockfile; pin a supported Node version consistently in package.json engines, GitHub Actions, and Vercel.
- [x] Add scripts: typecheck (tsc --noEmit), test (test runner in non-watch mode), build (next build), dev, and start.
- [x] Add Firebase client initialization that occurs in browser-facing code; imports/builds must not attempt sign-in or live database access.
- [x] Build Google sign-in and enforce private tester membership and ownership at the backend/database level.
- [x] Implement event management and the reminder engine according to the spec, with boundary-date tests.
- [x] Add CI triggered by pull_request, push, and workflow_dispatch with contents: read permission, checkout, setup-node with npm cache, npm ci, npm run typecheck, npm test, and npm run build.
- [x] CI uses sandbox public configuration only; never depend on private production secrets in fork pull-request checks.
- [x] Run those same four commands locally and resolve failures before pushing.
- [ ] Import aheiner2001/reminderapp into Vercel; framework preset Next.js; root directory repository root; install npm ci; build npm run build.
- [ ] Configure the six public Firebase variables for Preview and Development before building; keep future Production Firebase configuration separate.
- [ ] Enable Google as a Firebase Authentication provider and authorize the stable Vercel test hostname. Add individual preview hostnames when testing sign-in on those URLs; do not assume a wildcard works.
- [ ] Verify root page, refresh/direct navigation, sign-in, sign-out, unauthorized account denial, and per-user event persistence on the deployed preview.
- [ ] Inspect GitHub CI and Vercel build results at the same commit. A generated workflow or passing local build is not proof a remote deployment succeeded.
- [ ] Set branch protection to require CI after the check first runs, if desired; Vercel automatic deployments and CI gates are separate mechanisms.
- [ ] Add scheduled email backend only after account/data rules are verified.

## Review focus
Missing build-time configuration must produce an actionable setup state.
Server imports must not access window or invoke sign-in.
Unauthorized users must not gain data access just by creating an Auth identity.
Preview deployments must use sandbox data rather than future production data.
No claim that emails run automatically until a sending backend is configured.

## Current blockers
GitHub previously returned 403 Resource not accessible by integration for writes.
No tester email, Vercel project connection, or live Firebase console settings have been supplied/verified.
Do not assume these settings already exist. The app itself is not implemented.

## Verification
Application milestone: npm ci, npm run typecheck, npm test, npm run build pass.
Deployment milestone: remote CI is green and Vercel preview loads and passes the authenticated access checks.

