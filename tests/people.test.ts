import { describe, expect, it } from "vitest";
import { createBlankPerson, validatePerson } from "../src/lib/people";

describe("people", () => {
  it("creates default Interests and Possible gifts sections", () => {
    const p = createBlankPerson("Sally");
    expect(p.name).toBe("Sally");
    expect(p.sections.map((s) => s.title)).toEqual([
      "Interests",
      "Possible gifts",
    ]);
  });

  it("rejects empty names and non-https links", () => {
    expect(() => validatePerson({ ...createBlankPerson(""), id: "1" })).toThrow(
      /name/i,
    );
    const bad = createBlankPerson("Sam");
    bad.sections[0].links.push({
      id: "l1",
      title: "x",
      url: "ftp://nope",
      createdAt: new Date().toISOString(),
    });
    expect(() => validatePerson({ ...bad, id: "1" })).toThrow(/https/i);
  });

  it("requires at least one section", () => {
    const p = { ...createBlankPerson("A"), id: "1", sections: [] };
    expect(() => validatePerson(p)).toThrow(/section/i);
  });
});
