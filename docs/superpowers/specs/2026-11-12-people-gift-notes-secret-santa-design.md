# Design Spec: People Profiles, Gift Notes & Secret Santa Draws

Date: November 12, 2026  
Status: Draft for review  
Sources: `assets/I'm working on this.pdf`, DrawNames feature reference (`assets/WebpageToPDF-drawnames___Features.pdf`), existing Groups & Wishlists implementation

## 1. Purpose

The reminder app already helps users track birthdays and anniversaries, share occasions in groups, and keep a basic Christmas wishlist. The notes in `assets/` add the missing half of the product: **remember people deeply enough to give meaningful gifts**, and **run a fair temporary gift exchange (draw names)** on top of those groups.

Success for this slice:

1. A user can maintain a **People** list (e.g. Sally) with structured gift notes and shop links over months.
2. Creating or editing an occasion can **tag a person**, creating the person if needed.
3. A group can run a **Secret Santa / Christmas draw**: join by code (already exists), set exclusions, draw once, each member sees only who they drew, and can open that person's wishlist.
4. Wishlist items can be **secretly reserved** so two people do not buy the same gift.

This is an evolution of the current app, not a rewrite and not a full DrawNames clone.

## 2. Approaches considered

| Approach | Pros | Cons |
|---|---|---|
| **A. Bolt draw + notes onto Groups/Events only** | Fastest; little new navigation | People stay buried inside occasion names; gift notes stay scattered; hard to grow year-round gift memory |
| **B. First-class People hub + Secret Santa on Groups (recommended)** | Matches the handwritten problem statement; reuses Groups/Wishlists; clear data boundaries | One more nav tab; migration for existing occasion names |
| **C. Rebuild as DrawNames-first product** | Closest feature parity with competitor PDF | Throws away reminder strength; large rewrite; Amazon Gift Finder + AI art expand scope dramatically |

**Recommendation: Approach B.** Keep reminders as the core loop. Add People as the gift-memory layer. Extend existing Groups with an optional draw mode. Defer Amazon Product Advertising API, curated gift-finder catalogs, ChatGPT plugins, and AI-generated hat artwork.

## 3. Scope

### In scope (this design / next implementation plan)

- People CRUD owned by the signed-in user (private by default).
- Person note sections: default **Interests**, **Possible gifts**, plus user-created custom sections; each section holds free-text notes and optional URL link lists.
- Link occasions to an optional `personId`; creating an occasion for a new name can create the person.
- Group **Draw** mode: celebration date, optional budget note, exclusions, fair assignment (no self-matches), organizer-controlled lock/redraw, private reveal of assignment.
- Wishlist **reservation** visible only as “reserved” to others (reserver identity hidden from the wishlist owner).
- Paste-any-shop URL wishlist links (Amazon or otherwise) with optional title/notes; no live product API.
- Responsive People + Draw UI that fits the existing Dashboard aesthetic.
- Unit tests for assignment algorithm, exclusions, reservation rules; E2E smoke for create person → tag occasion → group draw → view assignee wishlist.

### Explicitly out of scope

- Amazon Product Advertising API / embedded Amazon storefront.
- AI-generated drawings or “fun art” for hat animations (may use a simple CSS/SVG reveal later).
- Anonymous Q&A with your giftee.
- Mailing-address exchange.
- Account-free invite flows (app remains Google-signed-in; join still uses group code).
- Gift Finder catalog, ChatGPT plugin, SMS invites.
- Billing / Stripe.
- Changes to the AWS Lambda scheduled digest rules beyond optionally including person-linked occasion names (no scheduler redesign).

### Already shipped (do not rebuild)

- Occasion CRUD, custom types, multi-checkpoint reminders, email preview/history hooks.
- Groups with create/join-by-code, shared occasions feed.
- Per-user Christmas wishlist document (`reminderUsers/{uid}/profile/wishlist`).

## 4. Architecture & data model

Keep client Firestore sync patterns used today (`src/lib/firebase/storage.ts`), with types in `src/lib/reminders.ts` (or a sibling `src/lib/people.ts` / `src/lib/draws.ts` if files grow). Prefer small focused modules over growing `Dashboard.tsx` further; extract People and Draw panels into components when implementing.

### 4.1 Person (private to owner)

Path: `reminderUsers/{uid}/people/{personId}`

```typescript
interface Person {
  id: string;
  name: string;                 // 1–100 trimmed chars
  notesSummary?: string;        // optional one-line blurb
  sections: PersonSection[];    // ordered
  createdAt: string;
  updatedAt: string;
}

interface PersonSection {
  id: string;
  title: string;                // e.g. "Interests", "Possible gifts", custom
  body?: string;                // free-form notes
  links: PersonLink[];          // shop / idea links
}

interface PersonLink {
  id: string;
  title: string;
  url: string;                  // must be http(s)
  createdAt: string;
}
```

Default sections on create: `Interests`, `Possible gifts`. Users may rename, reorder, add, or delete sections (keep at least one section).

People are **not** group-shared automatically. They are the owner’s private gift memory. When someone else shares a wishlist via a group, that is a different document (existing wishlist).

### 4.2 Occasion → Person link

Extend `ReminderEvent`:

```typescript
interface ReminderEvent {
  // ...existing fields...
  personId?: string | null;     // optional link to owner’s Person
}
```

Rules:

- `personId` must reference a person owned by the same uid, or be absent.
- Editing the occasion name does **not** rename the person unless the user explicitly chooses “Also rename person.”
- Deleting a person clears `personId` on linked occasions; occasions remain.
- Demo mode may include 1–2 sample people with notes when loading sample occasions.

### 4.3 Group draw extension

Extend `GroupCircle` (same `reminderGroups/{groupId}` document, additive fields):

```typescript
interface GroupCircle {
  // ...existing fields...
  draw?: GroupDraw | null;
}

interface GroupDraw {
  status: "setup" | "drawn" | "locked";
  celebrationDate?: string;     // YYYY-MM-DD optional
  budgetNote?: string;          // free text, e.g. "$25"
  exclusions: DrawExclusion[];  // undirected pairs forbidden both ways
  assignments: Record<string, string>; // giverUid -> receiverUid
  drawnAt?: string;
  drawnByUid?: string;
}

interface DrawExclusion {
  aUid: string;
  bUid: string;
}
```

Assignment rules (authoritative, pure function in shared lib):

1. Every member is both a giver and a receiver exactly once (derangement of member UIDs).
2. No self-assignment.
3. Honor exclusions as bidirectional (if A cannot draw B, B cannot draw A).
4. If no valid complete assignment exists, fail with a clear error; do not partial-assign.
5. Prefer a deterministic testable algorithm (e.g. randomized backtracking with seeded RNG for tests). Cap retries; surface “try adjusting exclusions” after exhaustion.
6. Only the group owner (or later a designated organizer; for this slice: **owner only**) may run, clear, or lock a draw.
7. After `drawn`, members may still join only if status is `setup`. Joining while `drawn`/`locked` is rejected until the owner clears the draw.
8. Each member may read only their own assignment (`assignments[myUid]`). Clients must not display the full map. Firestore rules should deny reading other users’ assignment entries when rules are tightened; until rules are updated, the UI still treats the full map as private and only renders the viewer’s entry (document the rules gap and fix rules in the same implementation plan).

### 4.4 Wishlist reservation

Extend `WishlistItem`:

```typescript
interface WishlistItem {
  id: string;
  title: string;
  url?: string;
  notes?: string;
  createdAt: string;
  reservedByUid?: string | null;
  reservedAt?: string | null;
}
```

Rules:

- Owner can always edit/delete their items; reservation does not block owner edits (owner sees “Someone reserved this” without identity).
- A group member viewing another member’s wishlist may reserve an unreserved item or unreserve their own reservation.
- Only one reserver per item.
- Reservation identity is hidden from the wishlist owner; other shoppers see “Reserved.”
- Reservations are stored on the owner’s wishlist document; writers must be authenticated group co-members. Implementation plan must update Firestore rules accordingly; until then, keep write paths in shared storage helpers and fail closed on permission errors.

### 4.5 Security summary

| Data | Who reads | Who writes |
|---|---|---|
| People | Owner only | Owner only |
| Occasion `personId` | Owner only (occasions remain private unless shared) | Owner only |
| Group membership / code | Members | Owner create; any signed-in user join by code |
| Draw setup fields | Members | Owner |
| Full assignment map | Prefer server/rules-limited; UI shows self only | Owner on draw/clear |
| Own assignment | Member | n/a |
| Own wishlist | Owner + group co-members (existing intent) | Owner for items; co-members for reservation fields only |

## 5. User experience

### 5.1 Navigation

Add a **People** tab (`peo`) beside Groups:

- Overview | Occasions | **People** | Groups | Preview | History | Settings

People tab:

- List of people (search by name).
- Empty state: “Add the people you buy gifts for” + Add person.
- Person detail: name, sections accordion, add link, edit/delete.
- Shortcut: “Add birthday occasion” pre-fills name + `personId`.

### 5.2 Occasion modal

- Field: **Person** — searchable select of existing people, or “Create person: {name}” when typing a new name.
- Default behavior when saving a new occasion with no person selected: do **not** auto-create a person (avoids clutter). Offer a checkbox defaulting **on** for new occasions: “Also keep gift notes for this person.”
- Recommended default: checkbox **checked** when name is non-empty and no `personId` yet.

### 5.3 Groups → Draw

On group detail, add a **Name draw** panel below shared occasions / wishlists:

1. **Setup**: celebration date, budget note, exclusion pairs (pick two members).
2. **Draw names** (owner): runs algorithm; status → `drawn`.
3. **My draw**: each member sees “You are gifting **{name}**” + button **View wishlist**.
4. **Lock** (owner): status → `locked`. While locked, Clear is disabled until the owner **Unlocks** (returns to `drawn`).
5. **Clear draw** (owner, only when `drawn`): confirms; returns to `setup`; deletes assignments and exclusions remain editable.

Reveal animation: lightweight (card flip / confetti-free fade). No generative AI art in this slice.

### 5.4 Wishlists

- Keep editor in Groups (My wishlist) as today.
- When viewing another member’s list: Reserve / Unreserve controls; reserved items show state without reserver name.
- URLs remain plain links that open the shop in a new tab.

### 5.5 Responsive behavior

- People list → detail pushes full-width on small screens; back button returns to list.
- Draw setup uses stacked forms; exclusion picker uses two dropdowns + Add, not a dense matrix, until member count > 12 (then still pairwise list, not a grid).

## 6. Data flow

```text
Signed-in user
  ├─ CRUD people ──► reminderUsers/{uid}/people/{id}
  ├─ CRUD occasions (optional personId) ──► reminderUsers/{uid}/events/{id}
  ├─ Groups create/join (existing)
  ├─ Owner configures draw / runs assignment ──► reminderGroups/{groupId}.draw
  ├─ Member reads own assignment + assignee wishlist
  └─ Member reserves wishlist item ──► assignee profile/wishlist.items[].reserved*
```

Demo / signed-out mode: local-only sample people, a sample drawn assignment for the demo group, and local reservation toggles; no Firestore writes (same pattern as current demo groups).

## 7. Error handling

| Case | Behavior |
|---|---|
| Invalid person name / empty section title | Inline validation; block save |
| Non-http(s) link | Reject with “Use a full https:// link” |
| Draw with < 2 members | Disable Draw; explain |
| Impossible exclusions | Error toast with guidance; leave status `setup` |
| Non-owner tries draw/clear/lock | Disable controls; ignore API attempts |
| Join after draw started | Reject with “Ask the organizer to clear the draw first” |
| Double-reserve race | Treat as compare-and-set: succeed only if `reservedByUid` is empty; otherwise show “Already reserved” and refresh |
| Permission denied on reservation | Toast; refresh wishlist |

## 8. Testing

- **Unit**: derangement with exclusions (fixtures for 2, 3, 4, couples exclusion, impossible graph); person validation; occasion `personId` clearing on person delete; reservation state transitions.
- **Component/UI**: People empty state; occasion checkbox creates person; draw panel shows only own assignee.
- **E2E (demo or auth test hooks)**: create person with link → tag on occasion → open Groups draw → (demo) view assignment → reserve wishlist item.
- Do not require live Amazon or AI services.

## 9. Implementation boundaries (for the later plan)

Suggested work units (not this document’s job to schedule in detail):

1. Types + pure draw algorithm + tests.
2. People storage helpers + Firestore rules for people.
3. People UI tab + occasion person linking.
4. Group draw fields + owner controls + member reveal.
5. Wishlist reservation + rules.
6. E2E smoke + docs/README touch.

Keep `Dashboard.tsx` from absorbing all of this: extract `PeoplePanel` and `GroupDrawPanel` (names flexible) during implementation.

## 10. Relationship to prior specs

- Does not replace [birthday reminder design](2026-10-02-birthday-reminder-design.md) delivery rules.
- Extends [groups and wishlists design](2026-10-23-groups-and-wishlists-design.md) with draw + reservation; that doc remains valid for create/join/share basics.
- Platform hosting (GitHub Pages + AWS Lambda) stays as in the Oct 23 GitHub Pages / AWS specs; this feature is primarily client + Firestore.

## 11. Resolved product decisions (recommended defaults)

These are locked for this spec unless review changes them:

1. **People are private** gift notebooks, not shared profiles.
2. **Owner-only** draw controls for v1.
3. **Bidirectional exclusions**; full derangement or fail.
4. **No Amazon API** — paste links only.
5. **No AI art** in v1.
6. **Reservation hides buyer** from the wishlist owner.
7. **Single approval gate** for this brainstorm was requested by the product owner: proceed from this written spec to an implementation plan after one review pass.
