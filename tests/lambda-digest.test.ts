import { describe, it, expect } from "vitest";
import { buildEmailHtml } from "../lambda/index.mjs";

describe("Lambda Reminder Digest Builder", () => {
  it("generates clean HTML email with upcoming events", () => {
    const events = [
      { name: "Sarah", type: "Birthday", month: 10, day: 25, days: 2 }
    ];
    const html = buildEmailHtml("Sarah's Birthday coming up", events);
    expect(html).toContain("Sarah");
    expect(html).toContain("Birthday");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("2 days away");
  });
});
