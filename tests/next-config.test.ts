import { describe, it, expect } from "vitest";
import nextConfig from "../next.config.mjs";

describe("Next.js Configuration", () => {
  it("enables static export and unoptimized images", () => {
    expect(nextConfig.output).toBe("export");
    expect(nextConfig.images?.unoptimized).toBe(true);
  });
});
