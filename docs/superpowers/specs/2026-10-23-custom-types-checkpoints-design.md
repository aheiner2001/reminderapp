# Design Spec: Custom Occasion Types, Multi-Checkpoints, Clean Slate & UI Polish

Date: October 23, 2026
Status: Approved

## 1. Overview & Goals
Enhance the user experience of the Dates to Remember app by:
1. Cleaning up technical metrics (removing pipeline and email time cards from the overview).
2. Giving newly authenticated users a clean slate with an inviting empty state instead of preloading demo records.
3. Enabling users to create, reuse, and filter by custom occasion types (e.g. "Christmas Wish", "Work Anniversary").
4. Enabling multi-checkpoint reminder alerts per occasion (e.g. 1 month before, 1 week before, 1 day before, day-of) plus per-event reminder times.

---

## 2. UI Updates

### Overview Dashboard
- Replace the 4 stat cards with 3 focused, human-centric metrics:
  - **Active Occasions**: Total count of active events.
  - **Next Celebration**: Name, date, and countdown chip for the upcoming occasion.
  - **Due in 30 Days**: Total celebrations happening in the next month.
- Remove technical AWS and send-time pipeline cards.

### Filter Chips
- Dynamically build filter chips based on present occasion types:
  - `All`, `Birthdays`, `Anniversaries`, and any custom types (e.g. `Christmas Wish`).

### Empty State (New Sign-Ins)
- When a user logs in and has 0 events, show a clean, tactile empty-state card:
  - Title: *"No occasions yet"*
  - Subtitle: *"Add your first birthday, anniversary, or special date to get started."*
  - Primary button: `+ Add occasion`
  - Secondary button: `Load sample occasions`

---

## 3. Custom Occasion Types

- **Storage**:
  - Saved under `Settings.customTypes?: string[]` in `reminderUsers/{uid}/profile/settings`.
- **Add/Edit Occasion Dialog**:
  - Type selector provides `Birthday`, `Anniversary`, any saved custom types, plus a `+ Add custom type...` option.
  - Selecting `+ Add custom type...` shows an inline text input to type a new category name.
  - Saving the event appends the new type to the user's custom types list and saves to Firestore.

---

## 4. Multi-Checkpoint Reminders & Reminder Time

- **Data Model**:
  - `ReminderEvent.checkpoints?: number[]` (defaults to `[7, 0]` - 1 week before and day-of).
  - `ReminderEvent.remindTime?: string` (e.g. `"09:00"`, defaults to user's send time).
  - Backwards compatible with existing `leadDays`.
- **Add/Edit UI**:
  - Checkbox toggle pills for presets:
    - `30 days before` (1 month)
    - `14 days before` (2 weeks)
    - `7 days before` (1 week)
    - `1 day before` (Tomorrow)
    - `Day-of event` (0 days)
    - Optional custom day input.
  - Time input for preferred reminder time.
- **Reminder Engine & Lambda Worker**:
  - When calculating alerts for today (`days === 0`) or milestone checkpoints (`checkpoints.includes(diffDays)`), event qualifies for delivery.

---

## 5. Testing & Verification
- Unit tests for checkpoint calculations and custom type validation in `tests/reminders.test.ts`.
- Component test for empty state and custom types in `tests/dashboard-render.test.tsx`.
- Playwright E2E test verifying add event with custom type and checkpoints.
- Production static build verification via `npm run build`.
