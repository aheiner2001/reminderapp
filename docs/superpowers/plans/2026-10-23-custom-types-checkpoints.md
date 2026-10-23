# Custom Types, Multi-Checkpoints, Clean Slate & UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to define and save custom occasion types, select multiple reminder checkpoints (1 month, 1 week, 1 day, day-of) and reminder time, clean up the overview stats, and present new users with a clean slate empty state.

**Architecture:** Extend `ReminderEvent` and `Settings` models with `checkpoints?: number[]`, `remindTime?: string`, and `customTypes?: string[]`. Update reminder engine and Lambda calculation. Refactor `Dashboard.tsx` and `app/globals.css` with clean empty state and multi-select checkpoints.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Playwright.

## Global Constraints
- Node version: 24.x
- Static export: `npm run build` must succeed without errors
- All unit and e2e tests must pass

---

### Task 1: Update Data Model & Reminder Engine

**Files:**
- Modify: `src/lib/reminders.ts`
- Modify: `tests/reminders.test.ts`

- [ ] **Step 1: Write test for checkpoints in reminder engine**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Update `src/lib/reminders.ts` with `checkpoints` and `remindTime`**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit changes**

---

### Task 2: Update UI with Clean Slate, Custom Types & Checkpoints

**Files:**
- Modify: `src/components/Dashboard.tsx`
- Modify: `app/globals.css`
- Modify: `tests/dashboard-render.test.tsx`

- [ ] **Step 1: Write test for empty state and custom types in `tests/dashboard-render.test.tsx`**
- [ ] **Step 2: Update `Dashboard.tsx` (remove technical cards, add blank slate start, add custom type creation, add checkpoint pills and time input)**
- [ ] **Step 3: Update `app/globals.css` styling for checkpoint pills and empty state**
- [ ] **Step 4: Run unit and e2e tests**
- [ ] **Step 5: Commit changes**

---

### Task 3: Update Lambda Worker & Final Verification

**Files:**
- Modify: `lambda/index.mjs`
- Modify: `tests/lambda-digest.test.ts`
- Modify: `tests/e2e/demo.spec.ts`

- [ ] **Step 1: Update `lambda/index.mjs` to honor checkpoints array**
- [ ] **Step 2: Run all unit and e2e tests (`npm test && npm run test:e2e`)**
- [ ] **Step 3: Verify static build (`npm run build`)**
- [ ] **Step 4: Commit and push to main**
