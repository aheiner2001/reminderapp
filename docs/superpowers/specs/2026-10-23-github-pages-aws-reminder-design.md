# Design Spec: GitHub Pages Deployment, Modern UI, and AWS Lambda SES Worker

## 1. Goal & Overview
Turn the Reminder App into a production-ready, beautifully crafted web application hosted on **GitHub Pages**, backed by **Firebase Auth & Firestore** for client data storage, and scheduled with an **AWS EventBridge + Lambda + AWS SES** pipeline for daily email reminders.

---

## 2. Architecture & Components

```
                ┌──────────────────────────────────────┐
                │          User's Web Browser          │
                └──────────────┬───────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────────────┐   ┌──────────────────────────────┐
│         GitHub Pages          │   │  Firebase Auth & Firestore   │
│  (Next.js Static Export out/) │   │  - Google Sign-In            │
│  - Modern Clean UI            │   │  - reminderUsers/{uid}/...   │
│  - Direct Client Firestore SDK│   │  - Security rules enforced   │
└───────────────────────────────┘   └──────────────▲───────────────┘
                                                   │ reads active reminders
                                    ┌──────────────┴───────────────┐
                                    │      AWS Lambda Worker       │
                                    │   (Node.js / Firebase Admin) │
                                    └──────▲───────────────┬───────┘
                                           │               │
                            ┌──────────────┴────────┐      │ sends HTML digest
                            │ AWS EventBridge (Cron)│      ▼
                            │ Daily morning trigger │ ┌────────────────────┐
                            └───────────────────────┘ │      AWS SES       │
                                                      │ (Verified Address) │
                                                      └────────────────────┘
```

---

## 3. High-Craft UI (Non-AI-Slop)

### Aesthetic & Design System
- **Tone**: Clean, editorial, tactile utility aesthetic (inspired by Things 3 and Linear). Avoids generic neon purple gradients, cluttered cards, and AI-boilerplate tropes.
- **Palette**:
  - Background: Crisp, warm paper (`#fafaf9` / `#f4f4f5`) with subtle border dividers (`#e4e4e7`).
  - Text: Deep zinc ink (`#18181b`) and muted descriptions (`#71717a`).
  - Accents: Restrained, intentional tags — Terracotta (`#ea580c`) for Birthdays, Indigo (`#4f46e5`) for Anniversaries, Sage (`#16a34a`) for Custom events.
- **Typography**: Refined modern sans (`Inter` / system stack) with tight headline tracking (`letter-spacing: -0.02em`) and monospaced tabular numerals (`font-variant-numeric: tabular-nums`) for countdowns.

### Core Views & Interactions
1. **Header & Navigation Bar**:
   - Clean brand identity with indicator of signed-in user and quick auth button.
   - Segmented filter control: *All*, *Birthdays*, *Anniversaries*, *Archived*.
   - Prominent primary action: `+ Add Occasion`.
2. **Upcoming Timeline & Countdown Grid**:
   - Prominently displays chronological occasions with relative badges: `Today`, `Tomorrow`, `In 4 days`, `Next Month`.
   - Clear cards with name, occasion date, countdown, custom lead time notice, and quick edit/archive actions.
3. **Add/Edit Modal**:
   - Focus-trapped, accessible modal dialog with smooth fade/scale transition.
   - Fields: Name, Type (Birthday, Anniversary, Custom), Month/Day, Lead Days selector (Day-of, 3 days, 7 days, 14 days, 30 days), and optional Notes.
4. **Settings & Preview Tab**:
   - Timezone selector and preferred send time.
   - Email digest preview showing exactly how the email notification appears.
   - Email notifications toggle (enabled/paused).

---

## 4. Client Data Layer & Firebase Configuration

### Client-Side Firestore
- Replaces server-dependent `/api/*` CRUD endpoints with direct Firebase Web SDK calls (`firebase/firestore`):
  - Document paths: `reminderUsers/{uid}/events/{eventId}` and `reminderUsers/{uid}/profile/settings`.
  - Fallback / Demo mode: If unauthenticated, loads local demo events into memory with an invitation to sign in.
- **Firestore Security Rules** (`firestore.rules`):
  ```javascript
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /reminderUsers/{userId}/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
  ```

---

## 5. AWS Lambda Worker + EventBridge + SES

### Directory & Runtime
- Located in `lambda/` containing:
  - `handler.ts` / `index.mjs`: Entrypoint for AWS Lambda.
  - `package.json`: Lightweight dependencies (`@aws-sdk/client-ses`, `firebase-admin`).
  - `build.js` / bundle script: Packages into `dist/index.zip` ready for AWS Console or CLI upload.
  - `README.md`: Step-by-step AWS setup guide (SES email verification, IAM Lambda execution role, EventBridge cron trigger creation).

### Worker Logic
1. **Trigger**: EventBridge fires Lambda daily (e.g. `cron(0 14 * * ? *)` = 9 AM EST).
2. **Scan**: Lambda initializes Firebase Admin SDK via `FIREBASE_SERVICE_ACCOUNT_JSON` env var, scans active users with `emailEnabled: true`.
3. **Calculate**: Evaluates upcoming events against user timezone and configured lead days.
4. **Digest Generation**: Builds a clean, mobile-responsive HTML email template listing today's and upcoming occasions.
5. **Dispatch**: Sends via `@aws-sdk/client-ses` from verified `SES_FROM_EMAIL`.

---

## 6. GitHub Actions Deployment to GitHub Pages

### Next.js Configuration (`next.config.mjs`)
- `output: 'export'`
- `images: { unoptimized: true }`
- Base path detection for GitHub Pages (`basePath: process.env.BASE_PATH || ''`).

### Workflow (`.github/workflows/deploy.yml`)
- Trigger on `push` to `main` branch or manual `workflow_dispatch`.
- Steps:
  1. Checkout repository.
  2. Setup Node 24 with npm cache.
  3. `npm ci`
  4. Run tests & typecheck (`npm run typecheck`, `npm test`).
  5. Build static site: `npm run build` with `BASE_PATH=/reminderapp`.
  6. Deploy to GitHub Pages using standard `actions/upload-pages-artifact` & `actions/deploy-pages`.

---

## 7. Testing & Verification Plan
1. **Unit & Component Tests**: Update tests in `tests/` for the new client storage layer and UI components.
2. **Typecheck & Static Export**: Verify `npm run typecheck` and `npm run build` generates a clean `out/` static directory.
3. **Local Preview**: Run `npx serve out` or `npm run dev` to verify visual craft, responsiveness, and interactions.
4. **Lambda Worker Verification**: Run local dry-run test script for the Lambda handler verifying Firestore query and SES payload generation.
