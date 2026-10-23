// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Dashboard from "../src/components/Dashboard";

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (_auth: any, cb: any) => {
    cb(null);
    return () => {};
  },
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: class {},
}));

describe("Dashboard UI Component", () => {
  it("renders brand header and navigation", () => {
    render(<Dashboard />);
    expect(screen.getByLabelText(/Remember home/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Overview/i })).toBeDefined();
  });

  it("does not render technical pipeline cards on overview", () => {
    render(<Dashboard />);
    expect(screen.queryByText(/Delivery Pipeline/i)).toBeNull();
    expect(screen.queryByText(/Alerts today/i)).toBeNull();
  });
});

