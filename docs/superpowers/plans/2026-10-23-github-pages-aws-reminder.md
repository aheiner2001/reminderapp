# GitHub Pages Deployment, Modern UI, and AWS Lambda Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Reminder App into a static-deployable website for GitHub Pages with a bespoke, high-craft UI, direct Firebase client persistence, and a standalone AWS EventBridge + Lambda + SES worker for scheduled reminder emails.

**Architecture:** Next.js static export hosted on GitHub Pages via GitHub Actions; direct Firebase Auth & Firestore client layer for user data; independent AWS Lambda Node.js worker triggered daily by EventBridge to calculate reminders and send HTML digests via AWS SES.

**Tech Stack:** Next.js 16 (Static Export), React 19, TypeScript, Firebase Auth & Firestore Client SDK, GitHub Actions, AWS SDK for JavaScript v3 (`@aws-sdk/client-ses`), Firebase Admin SDK, Vitest.

## Global Constraints
- Node version: 24.x
- Static web export: `output: 'export'` in `next.config.mjs` (no Node server runtimes on GitHub Pages)
- High-craft UI: tactile, minimalist editorial design (warm stone/zinc palette, zero generic AI-gradient tropes)
- Firestore schema path: `reminderUsers/{userId}/events/{eventId}` and `reminderUsers/{userId}/profile/settings`
- All tests must pass: `npm run typecheck` and `npm test`

---

### Task 1: Next.js Static Export Configuration

**Files:**
- Create: `next.config.mjs`
- Modify: `package.json`
- Test: `tests/next-config.test.ts`

**Interfaces:**
- Consumes: Environment variable `BASE_PATH` (optional for repository root)
- Produces: Static export build config yielding `out/` directory

- [ ] **Step 1: Write test for next.config.mjs**

```typescript
// tests/next-config.test.ts
import { describe, it, expect } from "vitest";
import nextConfig from "../next.config.mjs";

describe("Next.js Configuration", () => {
  it("enables static export and unoptimized images", () => {
    expect(nextConfig.output).toBe("export");
    expect(nextConfig.images?.unoptimized).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/next-config.test.ts`
Expected: FAIL (Cannot find module '../next.config.mjs')

- [ ] **Step 3: Implement next.config.mjs**

```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath: process.env.BASE_PATH || "",
  trailingSlash: true,
};

export default nextConfig;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/next-config.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add next.config.mjs tests/next-config.test.ts
git commit -m "feat: configure Next.js static export for GitHub Pages"
```

---

### Task 2: GitHub Actions Workflow for GitHub Pages Deployment

**Files:**
- Create: `.github/workflows/deploy.yml`
- Test: `tests/deploy-workflow.test.ts`

**Interfaces:**
- Consumes: Push to `main` branch
- Produces: GitHub Pages artifact deployment using `actions/deploy-pages@v4`

- [ ] **Step 1: Write validation test for deployment workflow YAML**

```typescript
// tests/deploy-workflow.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";

describe("GitHub Pages Deployment Workflow", () => {
  it("exists and defines GitHub Pages deployment steps", () => {
    expect(existsSync(".github/workflows/deploy.yml")).toBe(true);
    const content = readFileSync(".github/workflows/deploy.yml", "utf8");
    expect(content).toContain("actions/deploy-pages");
    expect(content).toContain("actions/upload-pages-artifact");
    expect(content).toContain("permissions:");
    expect(content).toContain("pages: write");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/deploy-workflow.test.ts`
Expected: FAIL

- [ ] **Step 3: Create .github/workflows/deploy.yml**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: npm

      - name: Setup Pages
        id: pages
        uses: actions/configure-pages@v5

      - name: Install dependencies
        run: npm ci

      - name: Run checks & tests
        run: |
          npm run typecheck
          npm test

      - name: Build static export
        env:
          BASE_PATH: ${{ steps.pages.outputs.base_path }}
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./out

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/deploy-workflow.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/deploy.yml tests/deploy-workflow.test.ts
git commit -m "ci: add GitHub Pages deployment workflow"
```

---

### Task 3: Client Firebase Storage Layer & Firestore Rules

**Files:**
- Create: `src/lib/firebase/storage.ts`
- Modify: `firestore.rules`
- Test: `tests/storage.test.ts`

**Interfaces:**
- Consumes: `browserAuth()`, Firebase Firestore Client SDK (`getFirestore`, `collection`, `doc`, `setDoc`, `getDocs`, `deleteDoc`)
- Produces: `fetchUserData(uid)`, `saveUserEvent(uid, event)`, `deleteUserEvent(uid, eventId)`, `saveUserSettings(uid, settings)`

- [ ] **Step 1: Write test for storage module interface and validations**

```typescript
// tests/storage.test.ts
import { describe, it, expect } from "vitest";
import { formatStoragePath, validateClientEvent } from "../src/lib/firebase/storage";
import { blankEvent } from "../src/lib/reminders";

describe("Client Storage Layer", () => {
  it("formats user collection paths correctly", () => {
    expect(formatStoragePath("user-123", "events")).toBe("reminderUsers/user-123/events");
    expect(formatStoragePath("user-123", "profile")).toBe("reminderUsers/user-123/profile/settings");
  });

  it("validates event fields cleanly before saving", () => {
    const valid = { ...blankEvent, name: "Birthday Party", month: 5, day: 20 };
    expect(() => validateClientEvent(valid)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/storage.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement src/lib/firebase/storage.ts and update firestore.rules**

```typescript
// src/lib/firebase/storage.ts
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  type Firestore,
} from "firebase/firestore";
import { browserAuth } from "./client";
import {
  validateEvent,
  type ReminderEvent,
  type Settings,
  defaultSettings,
} from "../reminders";
import { validateSettings } from "../access";

let dbInstance: Firestore | null = null;

export function getClientDb(): Firestore {
  if (typeof window === "undefined") {
    throw new Error("Client Firestore is only available in the browser.");
  }
  if (!dbInstance) {
    const auth = browserAuth();
    dbInstance = getFirestore(auth.app);
  }
  return dbInstance;
}

export function formatStoragePath(uid: string, type: "events" | "profile"): string {
  if (type === "profile") {
    return `reminderUsers/${uid}/profile/settings`;
  }
  return `reminderUsers/${uid}/events`;
}

export function validateClientEvent(event: unknown): ReminderEvent {
  return validateEvent(event);
}

export async function fetchUserData(uid: string): Promise<{
  events: ReminderEvent[];
  settings: Settings;
}> {
  const db = getClientDb();
  
  // Fetch settings
  const settingsRef = doc(db, `reminderUsers/${uid}/profile`, "settings");
  const settingsSnap = await getDoc(settingsRef);
  const settings = settingsSnap.exists()
    ? validateSettings(settingsSnap.data())
    : defaultSettings;

  // Fetch events
  const eventsCol = collection(db, `reminderUsers/${uid}`, "events");
  const eventsSnap = await getDocs(eventsCol);
  const events: ReminderEvent[] = [];
  eventsSnap.forEach((docSnap) => {
    try {
      events.push(validateEvent({ ...docSnap.data(), id: docSnap.id }));
    } catch {
      // skip corrupted documents gracefully
    }
  });

  return { events, settings };
}

export async function saveUserEvent(uid: string, event: ReminderEvent): Promise<ReminderEvent> {
  const validated = validateClientEvent(event);
  const id = validated.id || crypto.randomUUID();
  const db = getClientDb();
  const eventRef = doc(db, `reminderUsers/${uid}/events`, id);
  const payload = { ...validated, id, updatedAt: new Date().toISOString() };
  await setDoc(eventRef, payload);
  return payload;
}

export async function deleteUserEvent(uid: string, eventId: string): Promise<void> {
  const db = getClientDb();
  const eventRef = doc(db, `reminderUsers/${uid}/events`, eventId);
  await deleteDoc(eventRef);
}

export async function saveUserSettings(uid: string, settings: Settings): Promise<Settings> {
  const validated = validateSettings(settings);
  const db = getClientDb();
  const settingsRef = doc(db, `reminderUsers/${uid}/profile`, "settings");
  await setDoc(settingsRef, validated);
  return validated;
}
```

Update `firestore.rules`:
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/storage.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/firebase/storage.ts firestore.rules tests/storage.test.ts
git commit -m "feat: add direct client Firestore storage operations and security rules"
```

---

### Task 4: High-Craft Modern UI Redesign

**Files:**
- Modify: `app/globals.css`
- Modify: `src/components/Dashboard.tsx`
- Test: `tests/dashboard-render.test.tsx`

**Interfaces:**
- Consumes: `src/lib/firebase/storage.ts`, `src/lib/reminders.ts`
- Produces: Polished, responsive, non-AI-slop UI component with countdown timeline, add/edit modal, settings, and filter tabs.

- [ ] **Step 1: Write render test for Dashboard**

```typescript
// tests/dashboard-render.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Dashboard from "../src/components/Dashboard";

describe("Dashboard UI Component", () => {
  it("renders brand header and occasion timeline", () => {
    render(<Dashboard />);
    expect(screen.getByText(/Remember/i)).toBeDefined();
    expect(screen.getByText(/Upcoming/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify initial status**

Run: `npm test tests/dashboard-render.test.tsx`
Expected: PASS or initial match

- [ ] **Step 3: Redesign app/globals.css with clean tactile design tokens**

Replace boilerplate and generic styles with:
- Warm paper background: `#fafaf9`
- Text: `#18181b`, muted: `#71717a`
- Border: `#e4e4e7`
- Tactile cards with gentle micro-shadows (`box-shadow: 0 1px 3px rgba(0,0,0,0.04)`)
- Clear tag pills: Terracotta for birthdays, Indigo for anniversaries
- Tabular numeric countdown badge (`Today`, `In 3 days`)
- Focus rings, accessible button states, smooth modals

- [ ] **Step 4: Update src/components/Dashboard.tsx**

Connect to `src/lib/firebase/storage.ts` when authenticated:
- Display demo events if unauthenticated with clear banner "Preview Mode — Sign in with Google to save your occasions".
- Direct create, edit, archive, and delete operations syncing to Firestore.
- Refined Add/Edit modal dialog with lead-time selector (Day-of, 3 days, 7 days, 14 days, 30 days).
- Clean Settings tab with timezone selection and email digest preview.

- [ ] **Step 5: Run tests and typecheck**

Run: `npm run typecheck && npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/globals.css src/components/Dashboard.tsx tests/dashboard-render.test.tsx
git commit -m "feat: implement high-craft tactile UI and client Firestore integration"
```

---

### Task 5: AWS Lambda Worker + EventBridge + SES Package

**Files:**
- Create: `lambda/package.json`
- Create: `lambda/index.mjs`
- Create: `lambda/build.sh`
- Create: `lambda/test-worker.mjs`
- Create: `lambda/README.md`
- Test: `tests/lambda-digest.test.ts`

**Interfaces:**
- Consumes: AWS SES Client (`@aws-sdk/client-ses`), Firebase Admin SDK (`firebase-admin`)
- Produces: Daily automated email digest of upcoming birthdays & anniversaries

- [ ] **Step 1: Write test for reminder digest email generator**

```typescript
// tests/lambda-digest.test.ts
import { describe, it, expect } from "vitest";
import { buildEmailHtml } from "../lambda/index.mjs";

describe("Lambda Reminder Digest Builder", () => {
  it("generates clean HTML email with upcoming events", () => {
    const events = [
      { name: "Sarah", type: "Birthday", month: 10, day: 25, days: 2 }
    ];
    const html = buildEmailHtml("Sarah's Birthday coming up", events);
    expect(html).toContain("Sarah");
    expect(html).toContain("Birthday");
    expect(html).toContain("<!DOCTYPE html>");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/lambda-digest.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement lambda/index.mjs and packaging scripts**

1. Create `lambda/package.json`:
```json
{
  "name": "reminder-worker",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@aws-sdk/client-ses": "^3.750.0",
    "firebase-admin": "^13.0.0"
  }
}
```

2. Implement `lambda/index.mjs`:
- Initializes Firebase Admin using `FIREBASE_SERVICE_ACCOUNT_JSON` env var.
- Initializes SES client using standard AWS credential chain.
- Evaluates qualifying occasions for each active user.
- Dispatches email digest from `SES_FROM_EMAIL`.

3. Create `lambda/README.md` with:
- AWS SES verification steps (verifying your sender email address).
- IAM Role setup (`ses:SendEmail`, `logs:*`).
- Lambda creation & uploading `dist/reminder-worker.zip`.
- EventBridge Rule creation (`cron(0 14 * * ? *)` daily schedule).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/lambda-digest.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lambda/ tests/lambda-digest.test.ts
git commit -m "feat: add AWS Lambda worker, SES integration, and setup guide"
```

---

### Task 6: End-to-End Build & Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run full typecheck and unit test suite**

Run: `npm run typecheck && npm test`
Expected: All tests PASS with zero errors.

- [ ] **Step 2: Verify production static export build**

Run: `npm run build`
Expected: Clean build with output generated in `out/`.

- [ ] **Step 3: Update documentation in README.md**

Document:
- GitHub Pages deployment instructions (Settings → Pages → Source: GitHub Actions).
- AWS Lambda setup and SES email verification link.
- Firebase Client setup.

- [ ] **Step 4: Commit and tag**

```bash
git add README.md
git commit -m "docs: update README with GitHub Pages and AWS Lambda instructions"
```
