// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
const fake = vi.hoisted(() => ({
  listener: (_user: any) => {},
  saveResolve: null as null | ((value: any) => void),
}));
vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (_auth: any, listener: any) => {
    fake.listener = listener;
    return () => {};
  },
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: class {},
}));
vi.mock("../src/lib/firebase/client", () => ({ browserAuth: () => ({}) }));
import Dashboard from "../src/components/Dashboard";
import { blankEvent, defaultSettings } from "../src/lib/reminders";
const alpha = {
  uid: "alpha",
  email: "alpha@example.com",
  displayName: "Alpha",
  getIdToken: async () => "alpha",
};
const beta = {
  uid: "beta",
  email: "beta@example.com",
  displayName: "Beta",
  getIdToken: async () => "beta",
};
const privateEvent = {
  ...blankEvent,
  id: "a",
  name: "Alpha Private",
  month: 1,
  day: 1,
  notes: "Private alpha notes",
};
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function () {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function () {
      this.removeAttribute("open");
    },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string, options: any) => {
      const identity = options.headers.Authorization.slice(7);
      if (path === "/api/events")
        return new Promise((resolve) => {
          fake.saveResolve = resolve;
        });
      return {
        ok: true,
        json: async () => ({
          email: `${identity}@example.com`,
          settings: defaultSettings,
          events: identity === "alpha" ? [privateEvent] : [],
          history: [],
          emailReady: true,
        }),
      };
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
async function login() {
  render(<Dashboard />);
  await act(async () => fake.listener(alpha));
  await waitFor(() => expect(screen.getByText("Alpha Private")).toBeTruthy());
}
it("clears a previous identity private event draft on account switch", async () => {
  await login();
  fireEvent.click(screen.getByRole("button", { name: "Edit Alpha Private" }));
  expect(
    (screen.getByLabelText("Private notes") as HTMLTextAreaElement).value,
  ).toBe("Private alpha notes");
  await act(async () => fake.listener(beta));
  expect(screen.queryByLabelText("Private notes")).toBeNull();
  expect(screen.queryByText("Alpha Private")).toBeNull();
});
it("ignores a save response completed after switching accounts", async () => {
  await login();
  fireEvent.click(screen.getByRole("button", { name: "Edit Alpha Private" }));
  fireEvent.click(screen.getByRole("button", { name: "Save occasion" }));
  await waitFor(() => expect(fake.saveResolve).not.toBeNull());
  await act(async () => fake.listener(beta));
  await act(async () =>
    fake.saveResolve!({
      ok: true,
      json: async () => ({
        event: { ...privateEvent, name: "Stale Alpha Result" },
      }),
    }),
  );
  expect(screen.queryByText("Stale Alpha Result")).toBeNull();
  expect(screen.queryByLabelText("Private notes")).toBeNull();
});
