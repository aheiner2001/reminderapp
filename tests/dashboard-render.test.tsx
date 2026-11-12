// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

afterEach(cleanup);

describe("Dashboard UI Component", () => {
  it("renders brand header and navigation", () => {
    render(<Dashboard />);
    expect(screen.getByLabelText(/Remember home/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Overview/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /People/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Groups/i })).toBeDefined();
  });

  it("renders demo people in the People tab", () => {
    render(<Dashboard />);
    fireEvent.click(screen.getByRole("button", { name: /People/i }));
    expect(screen.getByRole("heading", { name: /People/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Maya/i })).toBeDefined();
  });

  it("does not render technical pipeline cards on overview", () => {
    render(<Dashboard />);
    expect(screen.queryByText(/Delivery Pipeline/i)).toBeNull();
    expect(screen.queryByText(/Alerts today/i)).toBeNull();
  });

  it("opens a group member wishlist and reserves an available item", () => {
    render(<Dashboard />);
    fireEvent.click(screen.getByRole("button", { name: /Groups/i }));
    fireEvent.click(
      screen.getByRole("button", { name: "View Grandma Joan's wishlist" }),
    );

    expect(
      screen.getByRole("heading", { name: "Grandma Joan's wishlist" }),
    ).toBeDefined();
    fireEvent.click(
      screen.getByRole("button", { name: "Reserve Garden kneeler" }),
    );
    expect(
      screen.getByRole("button", { name: "Unreserve Garden kneeler" }),
    ).toBeDefined();
  });
});

