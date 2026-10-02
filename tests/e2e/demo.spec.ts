import { test, expect } from "@playwright/test";
test("demo supports add, edit, preview, preferences and mobile navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Something to celebrate." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in with Google" }),
  ).toBeEnabled();
  await page.screenshot({path:"test-results/dashboard.png",fullPage:true});
  await page.getByRole("button", { name: "Add an occasion" }).click();
  await page.getByLabel("Name or occasion").fill("Maya Test");
  await page.getByLabel("Month", { exact: true }).selectOption("1");
  await page.getByLabel("Day", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Save occasion" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: /Your people/ }).click();
  await expect(
    page.getByText("Maya Test", { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("row")
    .filter({ hasText: "Maya Test" })
    .getByRole("button", { name: "Edit" })
    .click();
  await page.getByLabel("Name or occasion").fill("Maya Updated");
  await page.getByRole("button", { name: "Save occasion" }).click();
  await expect(
    page.getByText("Maya Updated", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reminder preview" }).click();
  await page.getByLabel("Preview date").fill("2027-01-01");
  await expect(page.locator(".mailPreview")).toContainText("Maya Updated");
  await expect(
    page.getByRole("button", { name: "Send me this test email" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Preferences" }).click();
  await page.getByLabel("Timezone", { exact: true }).fill("Invalid/Zone");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.locator(".message.error")).toContainText("valid timezone");
  await page.getByLabel("Timezone", { exact: true }).fill("America/Denver");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Demo preferences updated",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /Your people/ }).click();
  await expect(
    page.locator(".eventCards").getByText("Maya Updated"),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.locator("[data-nextjs-dialog], .vite-error-overlay"),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("protected endpoints reject anonymous browser requests", async ({
  request,
}) => {
  for (const path of ["/api/profile", "/api/events", "/api/test-email"]) {
    const r =
      path === "/api/profile"
        ? await request.get(path)
        : await request.post(path, { data: {} });
    expect(r.status()).toBe(401);
  }
});
