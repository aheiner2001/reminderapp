import { describe, expect, it } from "vitest";
import {
  GET as profile,
  PUT as settings,
  DELETE as deleteAccount,
} from "../app/api/profile/route";
import { POST as save, DELETE as remove } from "../app/api/events/route";
import { POST as email } from "../app/api/test-email/route";
describe("protected API boundaries", () => {
  for (const [name, handler, method] of [
    ["profile", profile, "GET"],
    ["settings", settings, "PUT"],
    ["delete account", deleteAccount, "DELETE"],
    ["save event", save, "POST"],
    ["delete event", remove, "DELETE"],
    ["test email", email, "POST"],
  ] as const) {
    it(`requires authentication for ${name}`, async () => {
      const response = await handler(
        new Request("https://example.com/api", { method }),
      );
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Sign in to continue." });
    });
  }
});
