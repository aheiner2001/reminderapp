import { beforeEach, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({
  records: new Map<string, any>(),
  message: null as any,
  mode: "accepted",
  checkedRevocation: false,
}));
function doc(path: string): any {
  return {
    id: path.split("/").at(-1),
    path,
    get: async () => ({
      exists: fake.records.has(path),
      data: () => fake.records.get(path),
    }),
    set: async (value: any, options?: any) =>
      fake.records.set(
        path,
        options?.merge ? { ...fake.records.get(path), ...value } : value,
      ),
    update: async (value: any) =>
      fake.records.set(path, { ...fake.records.get(path), ...value }),
    delete: async () => fake.records.delete(path),
    collection: (name: string) => collection(path + "/" + name),
  };
}
function collection(path: string): any {
  return {
    doc: (id = "generated-" + fake.records.size) => doc(path + "/" + id),
    get: async () => ({
      docs: [...fake.records]
        .filter(
          ([key]) =>
            key.startsWith(path + "/") &&
            key.slice(path.length + 1).indexOf("/") === -1,
        )
        .map(([key, value]) => ({
          id: key.split("/").at(-1),
          data: () => value,
        })),
    }),
    orderBy: () => collection(path),
    limit: () => collection(path),
  };
}
vi.mock("firebase-admin/app", () => ({
  cert: () => ({}),
  getApps: () => [{ name: "reminder-server" }],
  initializeApp: () => ({ name: "reminder-server" }),
}));
vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({
    verifyIdToken: async (token: string, checkRevoked: boolean) => {
      fake.checkedRevocation = checkRevoked;
      if (token === "forged" || token === "revoked")
        throw new Error("Invalid token");
      return {
        uid: token,
        email: `${token}@example.com`,
        email_verified: true,
      };
    },
  }),
}));
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    collection,
    runTransaction: async (fn: any) =>
      fn({
        get: (ref: any) => ref.get(),
        set: (ref: any, data: any) => ref.set(data),
        create: (ref: any, data: any) => ref.set(data),
      }),
    recursiveDelete: async (ref: any) => {
      for (const key of fake.records.keys())
        if (key === ref.path || key.startsWith(ref.path + "/"))
          fake.records.delete(key);
    },
  }),
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (message: any) => {
        fake.message = message;
        if (fake.mode === "unknown") throw new Error("Timed out");
        return fake.mode === "failed"
          ? { data: null, error: { message: "Rejected" } }
          : { data: { id: "provider-1" }, error: null };
      },
    };
  },
}));
import { POST as save, DELETE as remove } from "../app/api/events/route";
import {
  GET as profile,
  DELETE as deleteAccount,
} from "../app/api/profile/route";
import { POST as send } from "../app/api/test-email/route";
import { blankEvent, defaultSettings } from "../src/lib/reminders";
function req(token = "alpha", method = "POST", body: unknown = {}) {
  return new Request("https://example.com/api", {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(method === "GET" || method === "DELETE"
      ? {}
      : { body: JSON.stringify(body) }),
  });
}
beforeEach(() => {
  fake.records.clear();
  fake.message = null;
  fake.mode = "accepted";
  fake.checkedRevocation = false;
  vi.stubEnv("FIREBASE_ADMIN_CLIENT_EMAIL", "test@example.com");
  vi.stubEnv("FIREBASE_ADMIN_PRIVATE_KEY", "fake-key");
  vi.stubEnv("TESTER_EMAILS", "alpha@example.com,beta@example.com");
  vi.stubEnv("resend_api_key", "fake-key");
  vi.stubEnv("RESEND_FROM_EMAIL", "Remember <reminders@example.com>");
});
it("rejects forged and revoked tokens before returning data", async () => {
  for (const t of ["forged", "revoked"])
    expect((await profile(req(t, "GET"))).status).toBe(401);
  expect(fake.checkedRevocation).toBe(true);
});
it("rejects a signed-in uninvited identity", async () =>
  expect((await profile(req("outsider", "GET"))).status).toBe(403));
it("ignores supplied ownership and separates identical event IDs", async () => {
  const event = {
    ...blankEvent,
    id: "shared",
    name: "Alpha",
    ownerUid: "beta",
    uid: "beta",
  };
  expect((await save(req("alpha", "POST", event))).status).toBe(200);
  expect(
    (await save(req("beta", "POST", { ...event, name: "Beta" }))).status,
  ).toBe(200);
  const data = await (await profile(req("alpha", "GET"))).json();
  expect(data.events.map((e: any) => e.name)).toEqual(["Alpha"]);
  expect(
    fake.records.get("reminderUsers/alpha/events/shared").ownerUid,
  ).toBeUndefined();
});
it("deleting an event cannot remove another user event with the same ID", async () => {
  await save(
    req("alpha", "POST", { ...blankEvent, id: "shared", name: "Alpha" }),
  );
  await save(
    req("beta", "POST", { ...blankEvent, id: "shared", name: "Beta" }),
  );
  const r = await remove(
    new Request("https://example.com/api?id=shared", {
      method: "DELETE",
      headers: { Authorization: "Bearer alpha" },
    }),
  );
  expect(r.status).toBe(200);
  expect(fake.records.has("reminderUsers/beta/events/shared")).toBe(true);
  expect(fake.records.has("reminderUsers/alpha/events/shared")).toBe(false);
});
it("rejects invalid event dates without writing records", async () => {
  expect(
    (
      await save(
        req("alpha", "POST", { ...blankEvent, name: "Bad", month: 4, day: 31 }),
      )
    ).status,
  ).toBe(400);
  expect(fake.records.size).toBe(0);
});
async function seed() {
  await save(
    req("alpha", "POST", {
      ...blankEvent,
      id: "a",
      name: "Maya",
      month: 1,
      day: 1,
    }),
  );
  fake.records.set("reminderUsers/alpha", { settings: defaultSettings });
}
it("sends only to the verified signed-in email using saved events", async () => {
  await seed();
  const r = await send(
    req("alpha", "POST", {
      date: "2027-01-01",
      to: "victim@example.com",
      events: [],
    }),
  );
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({ status: "accepted" });
  expect(fake.message.to).toEqual(["alpha@example.com"]);
  expect(fake.message.text).toContain("Maya");
  expect(
    [...fake.records.values()].filter((v) => v.status === "accepted"),
  ).toHaveLength(1);
});
it("caps test email requests at three per day", async () => {
  await seed();
  for (let i = 0; i < 3; i++)
    expect(
      (await send(req("alpha", "POST", { date: "2027-01-01" }))).status,
    ).toBe(200);
  expect(
    (await send(req("alpha", "POST", { date: "2027-01-01" }))).status,
  ).toBe(429);
});
it("rejects paused or empty summaries without submitting a message", async () => {
  await seed();
  fake.records.set("reminderUsers/alpha", {
    settings: { ...defaultSettings, paused: true },
  });
  expect(
    (await send(req("alpha", "POST", { date: "2027-01-01" }))).status,
  ).toBe(400);
  expect(fake.message).toBeNull();
});
it("records provider rejection as failed", async () => {
  await seed();
  fake.mode = "failed";
  expect(
    (await send(req("alpha", "POST", { date: "2027-01-01" }))).status,
  ).toBe(502);
  expect([...fake.records.values()].some((v) => v.status === "failed")).toBe(
    true,
  );
});
it("records ambiguous provider errors as unknown", async () => {
  await seed();
  fake.mode = "unknown";
  expect(
    (await send(req("alpha", "POST", { date: "2027-01-01" }))).status,
  ).toBe(500);
  expect([...fake.records.values()].some((v) => v.status === "unknown")).toBe(
    true,
  );
});
it("app deletion removes only this users app namespace", async () => {
  fake.records.set("reminderUsers/alpha/events/a", {});
  fake.records.set("reminderUsers/beta/events/a", {});
  fake.records.set("users/alpha", {});
  expect((await deleteAccount(req("alpha", "DELETE"))).status).toBe(200);
  expect(fake.records.has("reminderUsers/alpha/events/a")).toBe(false);
  expect(fake.records.has("reminderUsers/beta/events/a")).toBe(true);
  expect(fake.records.has("users/alpha")).toBe(true);
});

it("deleting app data cannot reset the daily email quota", async () => {
  await seed();
  for (let i = 0; i < 3; i++)
    await send(req("alpha", "POST", { date: "2027-01-01" }));
  await deleteAccount(req("alpha", "DELETE"));
  await seed();
  expect(
    (await send(req("alpha", "POST", { date: "2027-01-01" }))).status,
  ).toBe(429);
});
