import { describe, expect, it, vi } from "vitest";
import {
  applyReservation,
  buildGroupDrawPayload,
  computeAssignments,
} from "../src/lib/draws";
import type { WishlistItem } from "../src/lib/reminders";

function assertDerangement(
  members: string[],
  map: Record<string, string>,
  forbidden: Set<string>,
) {
  expect(Object.keys(map).sort()).toEqual([...members].sort());
  const receivers = Object.values(map).sort();
  expect(receivers).toEqual([...members].sort());
  for (const [g, r] of Object.entries(map)) {
    expect(g).not.toBe(r);
    expect(forbidden.has(`${g}|${r}`)).toBe(false);
  }
}

describe("computeAssignments", () => {
  it("assigns a 3-person derangement", () => {
    const members = ["a", "b", "c"];
    const map = computeAssignments(members, [], () => 0.1);
    assertDerangement(members, map, new Set());
  });

  it("honors bidirectional couple exclusion", () => {
    const members = ["a", "b", "c", "d"];
    const exclusions = [{ aUid: "a", bUid: "b" }];
    const forbidden = new Set(["a|b", "b|a"]);
    const map = computeAssignments(members, exclusions, () => 0.42);
    assertDerangement(members, map, forbidden);
  });

  it("fails when exclusions make a full draw impossible", () => {
    expect(() =>
      computeAssignments(
        ["a", "b"],
        [{ aUid: "a", bUid: "b" }],
        () => 0.5,
      ),
    ).toThrow(/exclusion|impossible|adjust/i);
  });

  it("requires at least 2 members", () => {
    expect(() => computeAssignments(["a"], [], () => 0.1)).toThrow(/2/i);
  });
});

describe("applyReservation", () => {
  const base: WishlistItem[] = [
    {
      id: "w1",
      title: "Book",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "w2",
      title: "Socks",
      createdAt: "2026-01-01T00:00:00.000Z",
      reservedByUid: "user-b",
      reservedAt: "2026-01-02T00:00:00.000Z",
    },
  ];

  it("reserves an open item", () => {
    vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"));
    const next = applyReservation(base, "w1", "user-a", "reserve");
    expect(next[0].reservedByUid).toBe("user-a");
    expect(next[0].reservedAt).toBe("2026-03-01T12:00:00.000Z");
    expect(next[1]).toEqual(base[1]);
    vi.useRealTimers();
  });

  it("rejects double reserve", () => {
    expect(() => applyReservation(base, "w2", "user-c", "reserve")).toThrow(
      /already reserved/i,
    );
  });

  it("unreserves only the actor's reservation", () => {
    const next = applyReservation(base, "w2", "user-b", "unreserve");
    expect(next[1].reservedByUid).toBeNull();
    expect(next[1].reservedAt).toBeNull();
  });

  it("rejects unreserve by non-owner of reservation", () => {
    expect(() => applyReservation(base, "w2", "user-a", "unreserve")).toThrow(
      /your own/i,
    );
  });
});

describe("buildGroupDrawPayload", () => {
  it("uses computeAssignments for a drawn payload", () => {
    const members = ["a", "b", "c", "d"];
    const draw = buildGroupDrawPayload("owner", members, {
      exclusions: [{ aUid: "a", bUid: "b" }],
      rng: () => 0.42,
    });
    expect(draw.status).toBe("drawn");
    expect(draw.drawnByUid).toBe("owner");
    expect(Object.keys(draw.assignments).sort()).toEqual([...members].sort());
    expect(draw.assignments["a"]).not.toBe("a");
    expect(draw.assignments["a"]).not.toBe("b");
  });
});
