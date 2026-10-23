# Group Circles, Shared Occasions & Christmas Wishlists Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to create and join groups using invite codes, share specific occasions with group members, view a shared celebration calendar, and manage Christmas wishlists.

**Architecture:**
- Extend data models in `src/lib/reminders.ts` and `src/lib/access.ts` with `sharedGroupIds?: string[]`, `GroupCircle`, and `UserWishlist`.
- Add Firestore client storage utilities in `src/lib/firebase/storage.ts` for group creation, lookup by code, joining, fetching shared occasions, and saving wishlists.
- Add a new "Groups" navigation tab to `src/components/Dashboard.tsx` with group creation/joining, shared feed, and member wishlists.
- Add group selection checkboxes to the Add/Edit Occasion modal.
- Verify through unit tests and Playwright E2E tests.

---

### Task 1: Data Models & Validation
**Files:**
- Modify: `src/lib/reminders.ts`
- Modify: `src/lib/access.ts`
- Modify: `tests/reminders.test.ts`

- [ ] Step 1: Add types for `GroupCircle`, `GroupMember`, `WishlistItem`, `UserWishlist` and add `sharedGroupIds?: string[]` to `ReminderEvent`.
- [ ] Step 2: Update `validateEvent` to sanitize `sharedGroupIds`.
- [ ] Step 3: Write unit tests in `tests/reminders.test.ts` for shared group validation.
- [ ] Step 4: Run unit tests to verify.
- [ ] Step 5: Commit changes.

---

### Task 2: Firestore Storage & State Helpers for Groups & Wishlists
**Files:**
- Modify: `src/lib/firebase/storage.ts`
- Modify: `tests/storage.test.ts`

- [ ] Step 1: Implement `createGroupCircle(uid, userName, userEmail, groupName)` (generates 6-char code).
- [ ] Step 2: Implement `joinGroupByCode(uid, userName, userEmail, code)`.
- [ ] Step 3: Implement `fetchUserGroups(uid)`.
- [ ] Step 4: Implement `fetchGroupOccasions(groupId)`.
- [ ] Step 5: Implement `saveUserWishlist(uid, items)` and `fetchUserWishlist(uid)`.
- [ ] Step 6: Write unit tests verifying group operations with client fallback.
- [ ] Step 7: Commit changes.

---

### Task 3: UI Implementation in Dashboard
**Files:**
- Modify: `src/components/Dashboard.tsx`
- Modify: `app/globals.css`
- Modify: `tests/dashboard-render.test.tsx`
- Modify: `tests/e2e/demo.spec.ts`

- [ ] Step 1: Add "Groups" tab (`gro`) to main navigation.
- [ ] Step 2: Implement Groups tab view:
  - List of user's groups.
  - "Create Group" dialog / form (generates share code and link).
  - "Join Group" input (accepts code).
  - Selected group dashboard: member list, shared celebrations feed with countdown pills, and member Christmas wishlists.
- [ ] Step 3: Add "Share with group" selector to Add/Edit Occasion dialog.
- [ ] Step 4: Add Christmas wishlist management editor so users can add/edit their own wishes.
- [ ] Step 5: Add responsive CSS in `app/globals.css`.
- [ ] Step 6: Update unit tests and Playwright E2E tests for group flow.
- [ ] Step 7: Run `npm test`, `npm run build`, and `npx playwright test`.
- [ ] Step 8: Commit changes.

---

### Task 4: Push to Main & Deploy
- [ ] Step 1: Push commits to `origin main`.
- [ ] Step 2: Confirm GitHub Pages deployment passes.
