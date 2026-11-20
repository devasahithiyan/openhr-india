import { test, expect } from "@playwright/test";
test("HR records an asset and follows its repair history", async ({
  page,
}, info) => {
  await page.goto("/login");
  await page.getByLabel("Company workspace").fill("demo");
  await page.getByLabel("Email", { exact: true }).fill("hr@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Demo-only-1234");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("link", { name: "Workforce", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Workspace", exact: true })
    .selectOption("asset");
  const label = "Demo laptop " + info.project.name + " " + Date.now();
  await page.locator("summary").filter({ hasText: "Register asset" }).click();
  await page.getByLabel("Asset reference").fill(label);
  await page.getByLabel("Name", { exact: true }).fill(label);
  await page.getByRole("button", { name: "Register asset" }).click();
  const asset = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: label, exact: true }) });
  await expect(asset).toContainText("In stock");
  await asset.locator("summary").filter({ hasText: "Send for repair" }).click();
  await asset
    .locator("form:visible")
    .getByLabel("Notes")
    .fill("Demo battery replacement");
  await asset.getByRole("button", { name: "Send for repair" }).click();
  await expect(asset).toContainText("In repair");
  await page.reload();
  await page
    .getByRole("combobox", { name: "Workspace", exact: true })
    .selectOption("asset");
  await asset.getByText("Record history", { exact: true }).click();
  await expect(
    asset.getByText("Demo battery replacement", { exact: true }),
  ).toBeVisible();
});
