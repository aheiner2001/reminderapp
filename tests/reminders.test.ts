import { describe, expect, it } from "vitest";
import {
  nextOccurrence,
  buildSummary,
  validateEvent,
} from "../src/lib/reminders";
const settings = {
  timezone: "America/Denver",
  sendTime: "09:00",
  defaultLeadDays: 7,
  emailEnabled: true,
  paused: false,
};
const event = {
  id: "a",
  name: "Roger",
  type: "Birthday",
  month: 1,
  day: 1,
  emailEnabled: true,
  leadDays: null,
  daily: false,
  weekly: true,
  monthly: true,
  archived: false,
};
describe("calendar reminders", () => {
  it("rolls past dates into the next year", () =>
    expect(nextOccurrence(event, "2026-10-02")).toBe("2027-01-01"));
  it("observes leap day on February 28 in ordinary years", () =>
    expect(nextOccurrence({ ...event, month: 2, day: 29 }, "2027-01-01")).toBe(
      "2027-02-28",
    ));
  it("retains leap day in leap years", () =>
    expect(nextOccurrence({ ...event, month: 2, day: 29 }, "2028-01-01")).toBe(
      "2028-02-29",
    ));
  it("groups December and January monthly events", () => {
    const s = buildSummary([event], settings, "2026-12-01");
    expect(s.sections[0].items[0].date).toBe("2027-01-01");
  });
  it("weekly window crosses the year boundary", () =>
    expect(
      buildSummary([event], settings, "2026-12-28").sections.some(
        (s: any) => s.kind === "weekly" && s.items.length === 1,
      ),
    ).toBe(true));
  it("sends advance alert once with daily disabled", () => {
    expect(
      buildSummary([event], settings, "2026-12-25").sections.some(
        (s: any) => s.kind === "alerts",
      ),
    ).toBe(true);
    expect(
      buildSummary([event], settings, "2026-12-26").sections.some(
        (s: any) => s.kind === "alerts",
      ),
    ).toBe(false);
  });
  it("includes the event day once in alerts", () => {
    const s = buildSummary(
      [{ ...event, daily: true, leadDays: 0 }],
      settings,
      "2027-01-01",
    );
    expect(
      s.sections.find((s: any) => s.kind === "alerts")!.items,
    ).toHaveLength(1);
  });
  it("omits disabled email and archived events", () =>
    expect(
      buildSummary(
        [
          { ...event, emailEnabled: false },
          { ...event, id: "b", archived: true },
        ],
        settings,
        "2027-01-01",
      ).sections,
    ).toEqual([]));
  it("honors global pause", () =>
    expect(
      buildSummary([event], { ...settings, paused: true }, "2027-01-01")
        .sections,
    ).toEqual([]));
  it("rejects impossible calendar dates and invalid lead times", () => {
    expect(() => validateEvent({ ...event, month: 4, day: 31 })).toThrow();
    expect(() => validateEvent({ ...event, leadDays: 366 })).toThrow();
  });
  it("rejects untrusted event type and oversized name", () => {
    expect(() => validateEvent({ ...event, type: "Other" })).toThrow();
    expect(() => validateEvent({ ...event, name: "a".repeat(101) })).toThrow();
  });
});
