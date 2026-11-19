import { test, expect } from "@playwright/test";
test("HR starts a scoped plan from employee creation and closes it after handover", async ({
  page,
}, info) => {
  const key = info.project.name + "-" + Date.now(),
    name = "ZZ Demo Joiner " + key,
    template = "Fictional intake " + key;
  await page.goto("/login");
  await page.getByLabel("Company workspace").fill("demo");
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Demo-only-1234");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("link", { name: "Add employee", exact: true }).click();
  await page.getByLabel("Employee code", { exact: true }).fill("ON-" + key);
  await page.getByLabel("Full name", { exact: true }).fill(name);
  await page.getByLabel("Date of joining", { exact: true }).fill("2026-11-23");
  for (const label of ["Branch", "Department", "Designation"])
    await page
      .getByRole("combobox", { name: label, exact: true })
      .selectOption({ index: 1 });
  await page.getByLabel("Choose an onboarding template after saving").check();
  await page
    .getByRole("button", { name: "Save employee", exact: true })
    .click();
  await expect(
    page
      .getByRole("combobox", { name: "New joiner", exact: true })
      .locator("option:checked"),
  ).toHaveText(name);
  await page.getByText("Create onboarding template", { exact: true }).click();
  await page.getByLabel("Template name", { exact: true }).fill(template);
  await page.getByLabel("Task name", { exact: true }).fill("Prepare workspace");
  await page
    .getByRole("combobox", { name: "Owner", exact: true })
    .selectOption("HR");
  await page.getByRole("button", { name: "Save template" }).click();
  await page
    .getByRole("combobox", { name: "Onboarding template", exact: true })
    .selectOption({ label: template });
  await page.getByRole("button", { name: "Start onboarding" }).click();
  const plan = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await plan.getByRole("button", { name: "Complete task" }).click();
  await plan.getByText("Record equipment decision", { exact: true }).click();
  await plan.getByLabel("Equipment item").fill("Demo laptop");
  await plan.getByLabel("Asset reference").fill("TEST-" + key);
  await plan.getByRole("button", { name: "Record handover" }).click();
  await plan.getByText("Final review", { exact: true }).click();
  await plan.getByLabel("Final review note").fill("Fictional joiner ready");
  await plan.getByRole("button", { name: "Close onboarding" }).click();
  await page.reload();
  await expect(plan).toContainText("Onboarding closed");
  await expect(plan).toContainText("TEST-" + key);
});
