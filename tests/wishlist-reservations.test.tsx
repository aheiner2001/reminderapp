// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import WishlistReservationList from "../src/components/WishlistReservationList";
import type { WishlistItem } from "../src/lib/reminders";

afterEach(cleanup);

const items: WishlistItem[] = [
  {
    id: "open",
    title: "Open gift",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "mine",
    title: "My reserved gift",
    createdAt: "2026-01-01T00:00:00.000Z",
    reservedByUid: "viewer",
    reservedAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "theirs",
    title: "Reserved gift",
    createdAt: "2026-01-01T00:00:00.000Z",
    reservedByUid: "someone-else",
    reservedAt: "2026-01-02T00:00:00.000Z",
  },
];

describe("WishlistReservationList", () => {
  it("hides reservation identity and controls from the wishlist owner", () => {
    render(
      <WishlistReservationList
        items={items}
        ownerUid="owner"
        currentUid="owner"
        onReservation={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Someone reserved this")).toHaveLength(2);
    expect(screen.queryByText(/viewer|someone-else/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /reserve/i })).toBeNull();
  });

  it("lets shoppers reserve open items and unreserve only their own", () => {
    const onReservation = vi.fn();
    render(
      <WishlistReservationList
        items={items}
        ownerUid="owner"
        currentUid="viewer"
        onReservation={onReservation}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reserve Open gift" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Unreserve My reserved gift" }),
    );

    expect(onReservation).toHaveBeenNthCalledWith(1, "open", "reserve");
    expect(onReservation).toHaveBeenNthCalledWith(2, "mine", "unreserve");
    expect(
      screen.queryByRole("button", { name: "Unreserve Reserved gift" }),
    ).toBeNull();
    expect(
      screen.getByText("Reserved gift").closest("li")?.textContent,
    ).toContain("Reserved");
  });
});
