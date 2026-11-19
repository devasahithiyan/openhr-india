import { expect, test } from "@playwright/test";

test("manager explores reporting lines and opens a report's profile", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Company workspace").fill("demo");
  await page.getByLabel("Email", { exact: true }).fill("manager@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Demo-only-1234");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("link", { name: "Org chart" }).click();
  const report = page.getByRole("link", { name: "Demo Employee", exact: true });
  await expect(report).toBeVisible();
  const toggle = page.locator("summary").filter({ hasText: "direct report" });
  await toggle.click();
  await expect(report).toBeHidden();
  await toggle.press("Enter");
  await report.click();
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue(
    "Demo Employee",
  );
});
