import { expect, test } from "@playwright/test";
test("HR previews the three March pilot payroll cases", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Company workspace").fill("payroll-demo");
  await page.getByLabel("Email", { exact: true }).fill("hr@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Demo-only-1234");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("link", { name: "Payroll", exact: true }).click();
  const register = page.locator(".register-ledger");
  await expect(
    register
      .getByText("Employees", { exact: true })
      .locator("..")
      .getByRole("definition"),
  ).toHaveText("3");
  await expect(
    register
      .getByText("Gross pay", { exact: true })
      .locator("..")
      .getByRole("definition"),
  ).toContainText("77,000.00");
  const joiner = page
    .locator("article")
    .filter({ hasText: "Demo March Joiner" });
  await expect(joiner).toContainText("16 payable / 31 calendar days");
  const unpaid = page
    .locator("article")
    .filter({ hasText: "Demo Unpaid Leave" });
  await expect(unpaid).toContainText("Approved unpaid leave · 2025-03-10");
  await unpaid
    .getByText("Review deductions and attendance", { exact: true })
    .click();
  await expect(unpaid.getByLabel("TDS (₹)", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve and publish payslips" }),
  ).toHaveCount(0);
});
