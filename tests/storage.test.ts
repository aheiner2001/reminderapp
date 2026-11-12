import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertGroupOpenForJoin,
  clearPersonIdFromEvents,
  formatStoragePath,
  saveGroupDraw,
  updateGroupDraw,
  validateClientEvent,
  validateClientPerson,
} from "../src/lib/firebase/storage";
import type { ReminderEvent } from "../src/lib/reminders";
import { blankEvent } from "../src/lib/reminders";
import { createBlankPerson } from "../src/lib/people";

describe("Client Storage Layer", () => {
  it("formats user collection paths correctly", () => {
    expect(formatStoragePath("user-123", "events")).toBe("reminderUsers/user-123/events");
    expect(formatStoragePath("user-123", "profile")).toBe("reminderUsers/user-123/profile/settings");
  });

  it("validates event fields cleanly before saving", () => {
    const valid = { ...blankEvent, name: "Birthday Party", month: 5, day: 20 };
    expect(() => validateClientEvent(valid)).not.toThrow();
  });

  it("validates person fields cleanly before saving", () => {
    const person = {
      ...createBlankPerson("Sally"),
      id: "person-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    expect(() => validateClientPerson(person)).not.toThrow();
    const validated = validateClientPerson(person);
    expect(validated.name).toBe("Sally");
    expect(() => validateClientPerson({ ...person, name: "" })).toThrow(
      /name/i,
    );
  });

  it("allows group members to read profile docs in Firestore rules", () => {
    const rules = readFileSync(join(process.cwd(), "firestore.rules"), "utf8");
    expect(rules).toMatch(/reminderGroups\/\{groupId\}/);
    expect(rules).toMatch(/docId == 'wishlist'/);
    expect(rules).toMatch(/match \/people\/\{personId\}/);
  });

  it("configures Firestore to ignore undefined properties", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/firebase/client.ts"),
      "utf8",
    );
    expect(source).toContain("initializeFirestore");
    expect(source).toContain("ignoreUndefinedProperties: true");
  });

  it("restricts group joins and draw updates in Firestore rules", () => {
    const rules = readFileSync(join(process.cwd(), "firestore.rules"), "utf8");
    expect(rules).toMatch(/allow read: if signedIn\(\)/);
    expect(rules).toContain("isOwnerGroupUpdate()");
    expect(rules).toContain("isJoinOnlyUpdate()");
    expect(rules).toMatch(/affectedKeys\(\)\s*\.hasOnly\(\['members'\]\)/);
    expect(rules).toContain("docId == 'wishlist'");
    expect(rules).toContain("request.resource.data.uid == userId");
  });

  it("uses a Firestore transaction for wishlist reservations", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/firebase/storage.ts"),
      "utf8",
    );
    expect(source).toContain("runTransaction");
    expect(source).toMatch(/runTransaction\(db,\s*async \(transaction\)/);
    expect(source).toContain("transaction.get(ref)");
    expect(source).toContain("transaction.update(ref");
  });

  it("clearPersonIdFromEvents nulls personId only on matching events", () => {
    const base = { ...blankEvent, id: "e1", name: "Birthday", month: 5, day: 20 };
    const events: ReminderEvent[] = [
      { ...base, id: "e1", personId: "person-a" },
      { ...base, id: "e2", personId: "person-b" },
      { ...base, id: "e3", personId: "person-a" },
      { ...base, id: "e4" },
    ];
    const cleared = clearPersonIdFromEvents(events, "person-a");
    expect(cleared).toHaveLength(2);
    expect(cleared.map((e) => e.id).sort()).toEqual(["e1", "e3"]);
    cleared.forEach((e) => expect(e.personId).toBeNull());
    expect(events[0].personId).toBe("person-a");
    expect(events[2].personId).toBe("person-a");
  });

  it("exports saveGroupDraw as alias of updateGroupDraw", () => {
    expect(saveGroupDraw).toBe(updateGroupDraw);
  });

  it("blocks joining a group after names are drawn or locked", () => {
    for (const status of ["drawn", "locked"] as const) {
      expect(() => assertGroupOpenForJoin({ status })).toThrow(
        /organizer.*clear/i,
      );
    }
    expect(() => assertGroupOpenForJoin({ status: "setup" })).not.toThrow();
    expect(() => assertGroupOpenForJoin(null)).not.toThrow();
  });
});
