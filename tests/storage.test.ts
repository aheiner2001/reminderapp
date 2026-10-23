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
