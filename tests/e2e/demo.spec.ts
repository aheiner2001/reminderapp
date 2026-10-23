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
