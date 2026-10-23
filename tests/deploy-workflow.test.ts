import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";

describe("GitHub Pages Deployment Workflow", () => {
  it("exists and defines GitHub Pages deployment steps", () => {
    expect(existsSync(".github/workflows/deploy.yml")).toBe(true);
    const content = readFileSync(".github/workflows/deploy.yml", "utf8");
    expect(content).toContain("actions/deploy-pages");
    expect(content).toContain("actions/upload-pages-artifact");
    expect(content).toContain("permissions:");
    expect(content).toContain("pages: write");
  });
});
