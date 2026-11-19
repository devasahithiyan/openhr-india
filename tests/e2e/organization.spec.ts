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
  const toggle = page.getByRole("button", {
    name: /Direct reports for Demo Manager/,
  });
  await toggle.click();
  await expect(report).toBeHidden();
  await toggle.press("Enter");
  await page.getByRole("button", { name: "Collapse all" }).click();
  await expect(report).toBeHidden();
  await page
    .getByRole("combobox", { name: "Department", exact: true })
    .selectOption({ label: "Demo Operations" });
  await expect(report).toBeVisible();
  await page.getByLabel("Find a person").fill("demo002");
  await expect(page.getByRole("status")).toContainText("1 matching person");
  await expect(
    page.getByRole("link", { name: "Demo Manager", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Find a person").fill("absent-person");
  await expect(page.getByRole("status")).toContainText("No people");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(report).toBeHidden();
  await page.getByRole("button", { name: "Expand all" }).click();
  await report.click();
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue(
    "Demo Employee",
  );
});
