# Task 6 report: E2E smoke and final asset conformance

## Changes

- Extended `tests/e2e/demo.spec.ts` with a guest-demo smoke flow covering People notes and links, group invite codes, Secret Santa name drawing, assignment reveal, wishlist reservation, and the related mobile overflow check.
- Added links to both product-reference PDFs in `docs/mockups/README.md`.

## Final asset checklist

- [x] Re-read `assets/I'm working on this.pdf` end-to-end.
- [x] Re-read `assets/WebpageToPDF-drawnames___Features.pdf` end-to-end.
- [x] People: private notes, editable sections, and clickable shop links are represented.
- [x] Groups: create/join controls and a visible invite code are represented.
- [x] Name draw: organizer setup, exclusions, assignment reveal, lock/clear controls, and recipient wishlist navigation are represented.
- [x] Wishlists: reusable lists, item links/details, member browsing, and private reservation controls are represented.
- [x] Responsive behavior: the covered People and Groups flows remain free of horizontal page overflow at a 390 × 844 viewport.
- [x] Scope exclusions respected: no Amazon API integration and no AI-generated art were added.

No clear in-scope visual or UX gap remained after comparing the implemented demo against the supplied assets, so no production UI change was required.

## Verification

- `npm run typecheck` — passed.
- `npm test` — passed: 15 files, 74 tests.
- `npx playwright test` — passed: 2 tests.
- `npm run build` — passed: optimized static production build generated.
- IDE diagnostics for edited files — no errors.
- `git diff --check` — passed.

## Concerns

- Playwright emits a harmless environment warning because `FORCE_COLOR` overrides `NO_COLOR`.
- Live authenticated Firebase behavior remains outside this guest-demo E2E smoke test; storage and component behavior are covered by the existing unit tests.

## Final whole-branch review fixes

- Firestore is now initialized with `ignoreUndefinedProperties: true`, and
  Secret Santa draw payloads omit absent `celebrationDate` and `budgetNote`
  fields.
- Signed-in users may read `reminderGroups` so join-by-code can scan invite
  codes. Group updates are restricted to the existing owner or a join-only
  update that adds exactly the caller to `members`; only the owner can change
  `draw` or any other group field.
- Profile access now exposes only `profile/wishlist` to non-owners. Non-owner
  writes are update-only and limited to the wishlist `items` and `updatedAt`
  top-level fields while preserving the owner UID. Because items are stored as
  an array, rules cannot enforce field-level reservation-only mutations inside
  one item; this remaining limitation is documented in `firestore.rules`.
- Wishlist reservation compare-and-set now runs inside a Firestore transaction.
- Secret Santa reveal animation is disabled when reduced motion is requested.

## Final fix verification

- Regression tests were observed failing before implementation: 4 expected
  failures covering undefined draw fields, Firestore initialization, rules,
  and transactional reservations.
- `npm run typecheck` — passed.
- `npm test` — passed: 15 files, 78 tests.
- IDE diagnostics for edited files — no errors.
- `git diff --check` — passed.
