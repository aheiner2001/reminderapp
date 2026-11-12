import { test, expect } from "@playwright/test";

test("demo supports add, edit, preview, settings and mobile navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Remember home" }),
  ).toBeVisible();

  await expect(
    page.getByRole("button", { name: /Sign in with Google/i }),
  ).toBeEnabled();

  // Open Add event modal
  await page.getByRole("button", { name: "Add event" }).click();
  await page.getByLabel("Name").fill("Maya Test");

  // Select custom type
  await page.getByLabel("Type").selectOption("__custom_new__");
  await page.getByPlaceholder(/Graduation, Memorial/i).fill("Graduation");

  await page.getByLabel("Month").selectOption("1");
  await page.getByRole("spinbutton", { name: "Day", exact: true }).fill("15");

  // Checkpoint pills test
  await expect(page.getByRole("button", { name: /1 week before/i })).toBeVisible();

  await page.getByRole("button", { name: "Save occasion" }).click();

  // Verify event shows in Upcoming list with custom tag
  await expect(page.getByText("Maya Test").first()).toBeVisible();
  await expect(page.getByText("Graduation").first()).toBeVisible();

  // Switch to Events tab
  await page.getByRole("button", { name: "Events" }).click();
  await expect(page.getByText("Maya Test").first()).toBeVisible();

  // Switch to Groups tab
  await page.getByRole("button", { name: "Groups" }).click();
  await expect(page.getByRole("heading", { name: "Your Groups" })).toBeVisible();
  await expect(page.getByText(/The Family/i).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /Christmas Wishlists/i })).toBeVisible();

  // Switch to Preview tab
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByRole("heading", { name: "Preview a day’s email" })).toBeVisible();

  // Switch to Settings tab
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Delivery" })).toBeVisible();

  // Mobile responsiveness check
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Overview" }).click();
  await expect(page.getByText("Maya Test").first()).toBeVisible();

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  expect(errors).toEqual([]);
});

test("demo supports People notes and Secret Santa gifting flows", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");

  await page.getByRole("button", { name: "People" }).click();
  await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
  await page.getByRole("button", { name: /Maya/ }).click();
  await expect(
    page.getByRole("textbox", { name: "Person name", exact: true }),
  ).toHaveValue("Maya");
  await expect(page.getByText(/Pour-over coffee/)).toBeVisible();
  await page
    .getByRole("button", { name: /^Possible gifts 1 links$/ })
    .click();
  await expect(
    page.getByRole("link", { name: /Local pottery studio/ }),
  ).toHaveAttribute("href", "https://example.com/pottery");

  await page.getByRole("button", { name: "Groups" }).click();
  await expect(page.getByText("Code:").first()).toContainText("FAM778");
  await expect(page.getByText(/Invite code:/)).toContainText("FAM778");
  await expect(page.getByRole("heading", { name: "Name draw" })).toBeVisible();

  await page.getByRole("button", { name: "Draw names" }).click();
  await expect(page.getByText(/You are gifting/)).toBeVisible();

  await page
    .getByRole("button", { name: "View Grandma Joan's wishlist" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Grandma Joan's wishlist" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reserve Garden kneeler" }).click();
  await expect(
    page.getByRole("button", { name: "Unreserve Garden kneeler" }),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Name draw" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  expect(errors).toEqual([]);
});
