# Design Spec: Group Circles, Shared Occasions & Christmas Wishlists

Date: October 23, 2026
Status: Proposed

## 1. Overview & Goals
Allow users to connect with family, friends, or teams via **Groups (Circles)** using simple join codes or invite links.
Users can:
1. Create a group (e.g. "The Family", "Work Team") or join via a short code.
2. Selectively opt-in specific occasions to share with their groups (per-occasion privacy).
3. View shared birthdays, anniversaries, and milestones from other group members.
4. Maintain a dedicated **Christmas Wishlist** (items, links, notes) visible to group members so gift planning is easy.

---

## 2. Architecture & Data Model

### A. Groups Model (`reminderGroups/{groupId}`)
```typescript
export interface GroupMember {
  uid: string;
  name: string;
  email: string;
  joinedAt: string;
}

export interface GroupCircle {
  id: string;             // Unique ID (or 6-character code e.g. "FAM778")
  name: string;           // e.g. "The Heiner Family"
  code: string;           // Shareable join code
  ownerUid: string;       // Creator UID
  createdAt: string;
  members: Record<string, GroupMember>; // UID -> Member details
}
```

### B. Per-Occasion Sharing (`ReminderEvent`)
Extend `ReminderEvent` in `src/lib/reminders.ts`:
```typescript
export interface ReminderEvent {
  // ...existing fields...
  sharedGroupIds?: string[]; // Array of group IDs this occasion is shared with
}
```

### C. Christmas Wishlist Model
Stored under `reminderUsers/{uid}/profile/wishlist` (or within group member profile):
```typescript
export interface WishlistItem {
  id: string;
  title: string;          // e.g. "Wool winter sweater"
  url?: string;           // Optional product link
  notes?: string;         // Size M, navy blue, etc.
  createdAt: string;
}

export interface UserWishlist {
  uid: string;
  items: WishlistItem[];
  updatedAt: string;
}
```

---

## 3. User Experience & Navigation

### A. New "Groups" Navigation Tab
Add a `"gro"` ("Groups") tab to the top navigation:
- **My Groups List**: Shows joined groups with member counts.
- **Create a Group**: Modal/input to enter group name (generates 6-char share code and copyable join link).
- **Join a Group**: Input to paste a 6-character join code.
- **Group Details View**:
  - Group name & invite code with "Copy code / link" button.
  - Member list.
  - **Shared Occasions Feed**: Combined timeline of all birthdays, anniversaries, and milestones shared by members with countdown badges.
  - **Christmas Wishlists Section**: Dropdown or cards per member showing their Christmas gift wishes.

### B. Add/Edit Occasion Modal Update
- Below "Private notes", display **"Share with Groups"**:
  - If user is in groups: checkable pills or checkboxes for each group (e.g. `[✓ The Heiner Family]`).
  - If user is not in any groups: helpful prompt *"Join or create a group in the Groups tab to share this occasion."*

### C. Christmas Wishlist Management
- In Settings (or in Groups > My Wishlist), users have an easy editor to add/remove wishlist items.
- Members in the same group can open each other's wishlist to see what gifts they're wishing for.

---

## 4. Security & Offline/Client Fallback
- Direct Firestore sync when authenticated via Google Auth.
- Local state simulation for prototypes/demos so users can preview the flow even before sign-in.
- Full type safety and automated unit + E2E test coverage.
