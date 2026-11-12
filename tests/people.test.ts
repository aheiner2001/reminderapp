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

  it("rejects names longer than 100 characters", () => {
    const p = { ...createBlankPerson("a".repeat(101)), id: "1" };
    expect(() => validatePerson(p)).toThrow(/1 and 100/i);
  });

  it("rejects empty section titles", () => {
    const p = createBlankPerson("Sam");
    p.sections[0].title = "";
    expect(() => validatePerson({ ...p, id: "1" })).toThrow(/section title/i);
  });

  it("rejects section bodies over 5000 characters", () => {
    const p = createBlankPerson("Sam");
    p.sections[0].body = "x".repeat(5001);
    expect(() => validatePerson({ ...p, id: "1" })).toThrow(/5,000/i);
  });
});
