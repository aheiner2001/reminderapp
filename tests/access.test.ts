import { expect, it } from "vitest";
import { checkTester, validateSettings } from "../src/lib/access";
const token = { uid: "one", email: "tester@example.com", email_verified: true };
it("rejects uninvited verified identities", () =>
  expect(() => checkTester(token, "other@example.com")).toThrow());
it("requires verified email even when invited", () =>
  expect(() =>
    checkTester({ ...token, email_verified: false }, "tester@example.com"),
  ).toThrow());
it("denies access when no allowlist configured", () =>
  expect(() => checkTester(token, "")).toThrow());
it("accepts invited identity case insensitively", () =>
  expect(
    checkTester(token, " TESTER@example.com, second@example.com "),
  ).toEqual({ uid: "one", email: "tester@example.com" }));
it("rejects malformed timezones and invalid settings", () => {
  expect(() =>
    validateSettings({
      timezone: "Not/Real",
      sendTime: "09:00",
      defaultLeadDays: 7,
      emailEnabled: true,
      paused: false,
    }),
  ).toThrow();
  expect(() =>
    validateSettings({
      timezone: "UTC",
      sendTime: "25:00",
      defaultLeadDays: 7,
      emailEnabled: true,
      paused: false,
    }),
  ).toThrow();
});
