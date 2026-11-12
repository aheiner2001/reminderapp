# People, Gift Notes & Secret Santa Draw Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add private People profiles with gift-note sections and shop links, link occasions to people, run Secret Santa draws on existing Groups (exclusions + private reveal), and support secret wishlist reservations—matching the product intent and visual references in `assets/`.

**Architecture:** Extend types in `src/lib/reminders.ts` (plus focused `src/lib/draws.ts` and `src/lib/people.ts`). Keep Firestore client sync in `src/lib/firebase/storage.ts`. Extract `PeoplePanel` and `GroupDrawPanel` so `Dashboard.tsx` does not absorb all UI. Pure draw algorithm is unit-tested. UI must repeatedly re-check the screenshot PDFs in `assets/`.

**Tech Stack:** Next.js static export, React 19, TypeScript, Firebase Auth/Firestore client, Vitest, Playwright, existing CSS variables in `app/globals.css`.

## Global Constraints

- Spec authority: `docs/superpowers/specs/2026-11-12-people-gift-notes-secret-santa-design.md`
- **ASSET LOOP (MANDATORY):** Before any UI/CSS work, after implementing each UI surface, and again before marking a UI task complete, the implementer MUST open and visually re-read these files with the Read tool (PDFs render as page images in Cursor):
  1. `assets/I'm working on this.pdf` (handwritten requirements + any UI sketches across pages)
  2. `assets/WebpageToPDF-drawnames___Features.pdf` (DrawNames feature/marketing screenshots)
  - Record in the task report which pages were re-checked and what UI adjustments were made from them.
  - Do not invent purple/glow “AI slop” styling; match the existing craft aesthetic (DM Sans, `--pr` blue, soft cards) while aligning layout density and feature hierarchy to the screenshots.
- No Amazon Product Advertising API, no AI-generated art, no gift-finder catalog, no account-free draws.
- People are private to the owner. Draw controls are owner-only. Exclusions are bidirectional. Assignments are a full derangement or fail.
- Reservation hides `reservedByUid` from the wishlist owner in the UI.
- Preserve existing reminder/group/wishlist behavior; additive changes only.
- Node 24; run focused Vitest during work; full `npm test` + `npm run typecheck` before each commit that touches TS.
- Frequent commits; do not push unless the finishing skill / user flow requests it.
- Work on the feature branch / worktree provided by the controller (never commit directly to `main` during task execution).

## File map

| File | Responsibility |
|---|---|
| `src/lib/people.ts` | Person types, defaults, validation |
| `src/lib/draws.ts` | GroupDraw types + `computeAssignments` derangement |
| `src/lib/reminders.ts` | Add `personId` to `ReminderEvent` / `validateEvent`; re-export or keep Group/Wishlist types; extend WishlistItem reservation fields |
| `src/lib/firebase/storage.ts` | People CRUD; draw update helpers; reservation helper; clear personId on person delete |
| `firestore.rules` | People owner rules; group member read/write; reservation-safe wishlist updates |
| `src/components/PeoplePanel.tsx` | People list/detail UI |
| `src/components/GroupDrawPanel.tsx` | Draw setup / reveal UI |
| `src/components/Dashboard.tsx` | Wire People tab, occasion person field, draw panel, reservation UI |
| `app/globals.css` | People + draw styles matching assets + existing tokens |
| `tests/people.test.ts` | Person validation |
| `tests/draws.test.ts` | Assignment algorithm |
| `tests/reminders.test.ts` | personId validation |
| `tests/storage.test.ts` / dashboard / e2e as needed | Integration coverage |

---

### Task 1: Types, person validation, draw algorithm (TDD)

**Files:**
- Create: `src/lib/people.ts`
- Create: `src/lib/draws.ts`
- Create: `tests/people.test.ts`
- Create: `tests/draws.test.ts`
- Modify: `src/lib/reminders.ts`
- Modify: `tests/reminders.test.ts`

**Interfaces:**
- Produces: `Person`, `PersonSection`, `PersonLink`, `createBlankPerson(name)`, `validatePerson(input)`, `GroupDraw`, `DrawExclusion`, `computeAssignments(memberUids, exclusions, rng?)`, extended `ReminderEvent.personId`, extended `WishlistItem.reservedByUid` / `reservedAt`

- [ ] **Step 1: Write failing people + draw tests**

Create `tests/people.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { createBlankPerson, validatePerson } from "../src/lib/people";

describe("people", () => {
  it("creates default Interests and Possible gifts sections", () => {
    const p = createBlankPerson("Sally");
    expect(p.name).toBe("Sally");
    expect(p.sections.map((s) => s.title)).toEqual([
      "Interests",
      "Possible gifts",
    ]);
  });

  it("rejects empty names and non-https links", () => {
    expect(() => validatePerson({ ...createBlankPerson(""), id: "1" })).toThrow(
      /name/i,
    );
    const bad = createBlankPerson("Sam");
    bad.sections[0].links.push({
      id: "l1",
      title: "x",
      url: "ftp://nope",
      createdAt: new Date().toISOString(),
    });
    expect(() => validatePerson({ ...bad, id: "1" })).toThrow(/https/i);
  });

  it("requires at least one section", () => {
    const p = { ...createBlankPerson("A"), id: "1", sections: [] };
    expect(() => validatePerson(p)).toThrow(/section/i);
  });
});
```

Create `tests/draws.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { computeAssignments } from "../src/lib/draws";

function assertDerangement(
  members: string[],
  map: Record<string, string>,
  forbidden: Set<string>,
) {
  expect(Object.keys(map).sort()).toEqual([...members].sort());
  const receivers = Object.values(map).sort();
  expect(receivers).toEqual([...members].sort());
  for (const [g, r] of Object.entries(map)) {
    expect(g).not.toBe(r);
    expect(forbidden.has(`${g}|${r}`)).toBe(false);
  }
}

describe("computeAssignments", () => {
  it("assigns a 3-person derangement", () => {
    const members = ["a", "b", "c"];
    const map = computeAssignments(members, [], () => 0.1);
    assertDerangement(members, map, new Set());
  });

  it("honors bidirectional couple exclusion", () => {
    const members = ["a", "b", "c", "d"];
    const exclusions = [{ aUid: "a", bUid: "b" }];
    const forbidden = new Set(["a|b", "b|a"]);
    const map = computeAssignments(members, exclusions, () => 0.42);
    assertDerangement(members, map, forbidden);
  });

  it("fails when exclusions make a full draw impossible", () => {
    expect(() =>
      computeAssignments(
        ["a", "b"],
        [{ aUid: "a", bUid: "b" }],
        () => 0.5,
      ),
    ).toThrow(/exclusion|impossible|adjust/i);
  });

  it("requires at least 2 members", () => {
    expect(() => computeAssignments(["a"], [], () => 0.1)).toThrow(/2/i);
  });
});
```

Add to `tests/reminders.test.ts`:

```typescript
it("accepts optional personId and strips blank", () => {
  const e = validateEvent({
    ...event,
    personId: "  person-1  ",
  });
  expect(e.personId).toBe("person-1");
  const e2 = validateEvent({ ...event, personId: "   " });
  expect(e2.personId == null || e2.personId === "").toBe(true);
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npx vitest run tests/people.test.ts tests/draws.test.ts tests/reminders.test.ts`
Expected: FAIL (modules / personId missing)

- [ ] **Step 3: Implement libraries**

Create `src/lib/people.ts` with `Person`, `PersonSection`, `PersonLink`, `createBlankPerson`, `validatePerson` matching the design spec (name 1–100, https-only links, ≥1 section, section titles non-empty, body ≤5000 chars).

Create `src/lib/draws.ts`:

```typescript
export interface DrawExclusion {
  aUid: string;
  bUid: string;
}

export interface GroupDraw {
  status: "setup" | "drawn" | "locked";
  celebrationDate?: string;
  budgetNote?: string;
  exclusions: DrawExclusion[];
  assignments: Record<string, string>;
  drawnAt?: string;
  drawnByUid?: string;
}

function pairKey(a: string, b: string) {
  return `${a}|${b}`;
}

export function computeAssignments(
  memberUids: string[],
  exclusions: DrawExclusion[],
  rng: () => number = Math.random,
): Record<string, string> {
  const members = [...new Set(memberUids)];
  if (members.length < 2) {
    throw new Error("Need at least 2 members to draw names.");
  }
  const forbidden = new Set<string>();
  for (const m of members) forbidden.add(pairKey(m, m));
  for (const ex of exclusions) {
    forbidden.add(pairKey(ex.aUid, ex.bUid));
    forbidden.add(pairKey(ex.bUid, ex.aUid));
  }

  const shuffled = (arr: string[]) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const maxAttempts = 500;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const receivers = shuffled(members);
    const map: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < members.length; i++) {
      const g = members[i];
      const r = receivers[i];
      if (forbidden.has(pairKey(g, r))) {
        ok = false;
        break;
      }
      map[g] = r;
    }
    if (!ok) continue;
    const recv = Object.values(map);
    if (new Set(recv).size !== members.length) continue;
    return map;
  }
  throw new Error(
    "No valid draw with these exclusions. Try adjusting exclusions.",
  );
}
```

Note: the shuffle-permutation approach above can miss some valid derangements under heavy exclusions. Prefer backtracking for correctness:

```typescript
export function computeAssignments(
  memberUids: string[],
  exclusions: DrawExclusion[],
  rng: () => number = Math.random,
): Record<string, string> {
  const members = [...new Set(memberUids)];
  if (members.length < 2) {
    throw new Error("Need at least 2 members to draw names.");
  }
  const forbidden = new Set<string>();
  for (const m of members) forbidden.add(`${m}|${m}`);
  for (const ex of exclusions) {
    forbidden.add(`${ex.aUid}|${ex.bUid}`);
    forbidden.add(`${ex.bUid}|${ex.aUid}`);
  }

  const order = [...members].sort((a, b) => a.localeCompare(b));
  // shuffle order with rng for variety
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const used = new Set<string>();
  const map: Record<string, string> = {};

  function optionsFor(g: string) {
    const opts = members.filter(
      (r) => !used.has(r) && !forbidden.has(`${g}|${r}`),
    );
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return opts;
  }

  function dfs(idx: number): boolean {
    if (idx === order.length) return true;
    const g = order[idx];
    for (const r of optionsFor(g)) {
      used.add(r);
      map[g] = r;
      if (dfs(idx + 1)) return true;
      used.delete(r);
      delete map[g];
    }
    return false;
  }

  if (!dfs(0)) {
    throw new Error(
      "No valid draw with these exclusions. Try adjusting exclusions.",
    );
  }
  return map;
}
```

Use the backtracking implementation (not the shuffle-only one).

In `src/lib/reminders.ts`:
- Add `personId?: string | null` to `ReminderEvent`
- Add `reservedByUid?: string | null` and `reservedAt?: string | null` to `WishlistItem`
- In `validateEvent`, sanitize `personId` (trim; empty → `undefined`)
- Optionally re-export draw/people types for convenience (not required)

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run tests/people.test.ts tests/draws.test.ts tests/reminders.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/people.ts src/lib/draws.ts src/lib/reminders.ts tests/people.test.ts tests/draws.test.ts tests/reminders.test.ts
git commit -m "feat: add People types and Secret Santa assignment algorithm"
```

---

### Task 2: Firestore storage helpers + security rules

**Files:**
- Modify: `src/lib/firebase/storage.ts`
- Modify: `firestore.rules`
- Modify: `tests/storage.test.ts` (extend or add cases)

**Interfaces:**
- Consumes: `Person`, `validatePerson`, `GroupDraw`, `computeAssignments`
- Produces: `fetchUserPeople`, `saveUserPerson`, `deleteUserPerson`, `saveGroupDraw`, `clearGroupDraw`, `reserveWishlistItem`, `fetchMemberWishlist`

- [ ] **Step 1: Write failing storage tests** for people save/validate path and that `computeAssignments` is used by a thin `buildGroupDrawPayload(ownerUid, members, drawSetup)` helper if extracted. At minimum assert reservation compare-and-set logic in a pure helper:

```typescript
export function applyReservation(
  items: WishlistItem[],
  itemId: string,
  actorUid: string,
  action: "reserve" | "unreserve",
): WishlistItem[] {
  return items.map((item) => {
    if (item.id !== itemId) return item;
    if (action === "reserve") {
      if (item.reservedByUid) throw new Error("Already reserved");
      return {
        ...item,
        reservedByUid: actorUid,
        reservedAt: new Date().toISOString(),
      };
    }
    if (item.reservedByUid !== actorUid) {
      throw new Error("You can only unreserve your own reservation");
    }
    return { ...item, reservedByUid: null, reservedAt: null };
  });
}
```

Put `applyReservation` in `src/lib/draws.ts` or `src/lib/people.ts` adjacent; test it in `tests/draws.test.ts` or `tests/storage.test.ts`.

- [ ] **Step 2: Implement storage functions** in `src/lib/firebase/storage.ts`:
  - `fetchUserPeople(uid)` → `reminderUsers/{uid}/people`
  - `saveUserPerson(uid, person)` using `validatePerson`
  - `deleteUserPerson(uid, personId)` + clear `personId` on that user’s events that reference it
  - `updateGroupDraw(groupId, draw: GroupDraw)` owner-checked in UI; still write full draw doc field
  - `fetchMemberWishlist(memberUid)` (existing fetch is fine; alias if needed)
  - `saveUserWishlist` already exists — use `applyReservation` then save

- [ ] **Step 3: Update `firestore.rules`**

Replace overly narrow rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }
    function isOwner(userId) {
      return signedIn() && request.auth.uid == userId;
    }

    match /reminderUsers/{userId} {
      allow read, write: if isOwner(userId);

      match /people/{personId} {
        allow read, write: if isOwner(userId);
      }
      match /events/{eventId} {
        allow read, write: if isOwner(userId);
      }
      match /groups/{groupId} {
        allow read, write: if isOwner(userId);
      }
      match /profile/{docId} {
        allow read: if signedIn();
        allow write: if isOwner(userId)
          || (signedIn() && docId == 'wishlist');
        // Note: reservation co-member writes are allowed for wishlist doc;
        // UI still hides reserver identity from owner. Tighten with
        // group-membership checks in a follow-up if Admin SDK available.
      }
      match /{document=**} {
        allow read, write: if isOwner(userId);
      }
    }

    match /reminderGroups/{groupId} {
      allow read: if signedIn()
        && request.auth.uid in resource.data.members;
      allow create: if signedIn()
        && request.auth.uid == request.resource.data.ownerUid;
      allow update: if signedIn()
        && (request.auth.uid == resource.data.ownerUid
            || request.auth.uid in resource.data.members);
      allow delete: if signedIn()
        && request.auth.uid == resource.data.ownerUid;
    }
  }
}
```

If existing tests assert old rules text, update them.

- [ ] **Step 4: Run `npx vitest run tests/storage.test.ts tests/draws.test.ts` — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/firebase/storage.ts src/lib/draws.ts firestore.rules tests/
git commit -m "feat: add People/draw storage helpers and Firestore rules"
```

---

### Task 3: People panel UI + occasion linking

**Files:**
- Create: `src/components/PeoplePanel.tsx`
- Modify: `src/components/Dashboard.tsx`
- Modify: `app/globals.css`
- Modify: `tests/dashboard-render.test.tsx`

**ASSET LOOP — do this three times in this task (before / mid / after):**
1. `Read` `assets/I'm working on this.pdf` (all pages that render)
2. `Read` `assets/WebpageToPDF-drawnames___Features.pdf`
3. Note layout cues: wishlists, people/gift notes, clean mobile+desktop, accordion sections for notes

- [ ] **Step 1: Asset re-read (before coding UI).** Write 3–5 bullets in the report of visual cues to match.

- [ ] **Step 2: Implement `PeoplePanel`**
  - Props: `people`, `onSave`, `onDelete`, `onAddOccasion(person)`, `busy`
  - List + search; detail with accordion sections; add link (title + https URL); add/rename/delete section (keep ≥1)
  - Empty state copy: “Add the people you buy gifts for”

- [ ] **Step 3: Wire Dashboard**
  - Add tab `"peo"` labeled **People** between Occasions and Groups
  - Load/save people with storage when signed in; demo people when signed out
  - Occasion modal: Person select + checkbox “Also keep gift notes for this person” (default checked for new occasions when name set and no personId)
  - On save with checkbox: create/find person by name, set `personId`

- [ ] **Step 4: CSS** using existing tokens (`--sf`, `--pr`, `--ln`, `--sh`). Accordion sections should feel tactile and readable on mobile. Avoid new purple gradient themes.

- [ ] **Step 5: Mid-task asset re-read.** Adjust spacing/typography if screenshots show denser feature hierarchy or clearer CTA placement.

- [ ] **Step 6: Update `tests/dashboard-render.test.tsx`** to assert People tab renders.

- [ ] **Step 7: Final asset re-read + `npm test` + `npm run typecheck`**

- [ ] **Step 8: Commit**

```bash
git commit -m "feat: add People tab with gift-note sections and occasion linking"
```

---

### Task 4: Group Secret Santa draw panel

**Files:**
- Create: `src/components/GroupDrawPanel.tsx`
- Modify: `src/components/Dashboard.tsx` (Groups detail)
- Modify: `app/globals.css`
- Modify: `src/lib/firebase/storage.ts` if draw save helpers still needed

**ASSET LOOP (before / after draw UI):** re-Read both PDFs; match “draw names / hat / wish list” feature emphasis from DrawNames screenshots without copying their branding. Prefer a clear **Name draw** panel with setup fields, primary Draw CTA, and a calm reveal card.

- [ ] **Step 1: Asset re-read before UI**

- [ ] **Step 2: Implement `GroupDrawPanel`**
  - Props: `group`, `currentUid`, `isOwner`, `wishlistsByUid`, `onSaveDraw`, `onViewWishlist(uid)`
  - Setup: celebration date, budget note, exclusion pair dropdowns + Add list
  - Owner: Draw names → `computeAssignments` → status `drawn`
  - Member: only see `assignments[currentUid]` → “You are gifting **Name**” + View wishlist
  - Owner: Lock → `locked` (Clear disabled); Unlock → `drawn`; Clear only when `drawn` (confirm)
  - Demo mode: local state draw without Firestore

- [ ] **Step 3: Block join when `draw.status` is `drawn` or `locked`** in `joinGroupByCode` (throw clear error)

- [ ] **Step 4: Asset re-read; polish reveal animation** (CSS fade/flip only — no generative art)

- [ ] **Step 5: Tests** — unit already covers algorithm; add a small render assertion if practical

- [ ] **Step 6: `npm test` + `npm run typecheck`; commit**

```bash
git commit -m "feat: add Secret Santa name draw to Groups"
```

---

### Task 5: Wishlist reservation UI

**Files:**
- Modify: `src/components/Dashboard.tsx` (member wishlist view)
- Modify: `src/lib/firebase/storage.ts` as needed
- Modify: `app/globals.css`
- Modify: tests as needed

**ASSET LOOP:** Re-read DrawNames PDF pages emphasizing “No duplicate gifts” / reserved wishes. Mirror the *behavior* (secret reserve), not their exact chrome.

- [ ] **Step 1: Asset re-read**

- [ ] **Step 2: When viewing another member’s wishlist**
  - Show Reserve on unreserved items
  - Show Reserved (no buyer name) on reserved items
  - Allow Unreserve only if `reservedByUid === currentUid`
  - Wishlist owner viewing own list: show “Someone reserved this” without identity; no Reserve button on own items

- [ ] **Step 3: Persist via `applyReservation` + `saveUserWishlist`**

- [ ] **Step 4: Asset re-read + tests + commit**

```bash
git commit -m "feat: add secret wishlist item reservations"
```

---

### Task 6: E2E smoke + final asset conformance pass

**Files:**
- Modify: `tests/e2e/demo.spec.ts`
- Possibly `docs/mockups/README.md` (one paragraph pointing at assets PDFs)

- [ ] **Step 1: Extend Playwright demo flow**
  - Open People tab; expect empty or demo people
  - Open Groups; expect Name draw section
  - In demo, run draw if owner controls exist; expect “You are gifting” text
  - Reserve path if demo exposes another wishlist

- [ ] **Step 2: FINAL ASSET LOOP (mandatory)**
  - Re-Read `assets/I'm working on this.pdf` end-to-end
  - Re-Read `assets/WebpageToPDF-drawnames___Features.pdf`
  - Diff mental checklist vs implemented UI: people notes, links, group code join, draw, wishlists, mobile-friendly
  - Fix any clear visual/UX gaps that are in-scope (no Amazon API, no AI art)

- [ ] **Step 3: Run full verification**

```bash
npm run typecheck
npm test
npx playwright test
npm run build
```

Expected: all pass

- [ ] **Step 4: Commit**

```bash
git commit -m "test: cover People and Secret Santa demo flows; final asset pass"
```

---

## Self-review (plan author)

1. **Spec coverage:** People CRUD + sections/links → Tasks 1–3; occasion `personId` → Tasks 1+3; draw/exclusions/lock → Tasks 1+4; reservation → Tasks 1+2+5; out-of-scope Amazon/AI explicitly excluded; asset loop → Global Constraints + Tasks 3–6.
2. **Placeholders:** None intentional; rules note a follow-up tighten for co-member wishlist writes.
3. **Types:** `GroupDraw.status`, `computeAssignments`, `applyReservation`, `personId`, reservation fields consistent across tasks.
