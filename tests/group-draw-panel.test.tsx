// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import GroupDrawPanel from "../src/components/GroupDrawPanel";
import type { GroupCircle } from "../src/lib/reminders";

afterEach(cleanup);

const group: GroupCircle = {
  id: "family",
  name: "Family",
  code: "FAM123",
  ownerUid: "owner",
  createdAt: "2026-01-01T00:00:00.000Z",
  members: {
    owner: {
      uid: "owner",
      name: "Organizer",
      email: "owner@example.com",
      joinedAt: "2026-01-01T00:00:00.000Z",
    },
    maya: {
      uid: "maya",
      name: "Maya",
      email: "maya@example.com",
      joinedAt: "2026-01-01T00:00:00.000Z",
    },
    joan: {
      uid: "joan",
      name: "Joan",
      email: "joan@example.com",
      joinedAt: "2026-01-01T00:00:00.000Z",
    },
  },
  draw: {
    status: "drawn",
    exclusions: [],
    assignments: { owner: "maya", maya: "joan", joan: "owner" },
  },
};

describe("GroupDrawPanel", () => {
  it("reveals only the current member's recipient", () => {
    const onViewWishlist = vi.fn();
    render(
      <GroupDrawPanel
        group={group}
        currentUid="maya"
        isOwner={false}
        wishlistsByUid={{}}
        onSaveDraw={vi.fn()}
        onViewWishlist={onViewWishlist}
      />,
    );

    expect(screen.getByText(/You are gifting/i).textContent).toContain("Joan");
    expect(screen.queryByText("Organizer")).toBeNull();
    expect(screen.queryByText(/Maya is gifting/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /View wishlist/i }));
    expect(onViewWishlist).toHaveBeenCalledWith("joan");
  });

  it("shows setup and owner draw controls before a draw", () => {
    render(
      <GroupDrawPanel
        group={{ ...group, draw: null }}
        currentUid="owner"
        isOwner
        wishlistsByUid={{}}
        onSaveDraw={vi.fn()}
        onViewWishlist={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/Celebration date/i)).toBeDefined();
    expect(screen.getByLabelText(/Budget note/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Draw names/i })).toBeDefined();
  });
});
