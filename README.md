# Remember — birthday & anniversary reminders

A private pilot web app for remembering the people who matter.

## Run
Use Node 24. Run `npm ci`, copy `.env.example` to `.env.local`, then `npm run dev`.
The signed-out demo works without server secrets. Private saved events require Firebase Admin credentials and `TESTER_EMAILS`. Configure `resend_api_key` and `RESEND_FROM_EMAIL` for explicit test emails.

## Check
`npm run typecheck` · `npm test` · `npm run build` · `npm run test:e2e`

GitHub Actions runs the checks on pushes and PRs. Import the repository into Vercel for deployments; see [deployment setup](docs/DEPLOYMENT.md).

## Implemented
- Responsive dashboard and mobile event settings
- Google sign-in and server-enforced private tester access
- Birthday/anniversary create, edit, archive and delete
- Monthly, weekly, advance and daily countdown previews
- Per-event email preferences and global pause
- Explicit Resend test sends to the signed-in user, with a daily cap and history

**Automatic email, SMS, push notifications and payments are not enabled yet.** Test email acceptance does not guarantee inbox delivery.

## Project documents
- [Full specification](docs/superpowers/specs/2026-10-02-birthday-reminder-design.md)
- [TODO and future roadmap](TODO.md)
- [Deployment implementation plan](docs/superpowers/plans/2026-10-02-testing-deployment.md)
- [Original mockups](docs/mockups/README.md)

Do not commit invited email addresses or server credentials. The sandbox Firebase web config is public; it does not grant Admin access.

## Branches

`main` is the canonical app and deployment branch. The former `feat/reminder-app` implementation and `cursor/family-reminder-design-0123` proposal were merged into main. Use main for Vercel imports and future work; old branches contain historical snapshots. The September family/Supabase proposal is archived, and the October Firebase design is authoritative.
