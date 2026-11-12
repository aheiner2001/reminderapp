import { describe, expect, it } from "vitest";
import { computeAssignments } from "../src/lib/draws";

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
