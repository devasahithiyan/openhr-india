import { test, expect } from "@playwright/test";
test("admin creates, edits and reloads an employee; private values remain masked", async ({
  page,
}, testInfo) => {
  await page.goto("/login");
  await page.getByLabel("Company workspace").fill("demo");
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Demo-only-1234");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "People", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "DEMO001" }),
  ).toBeVisible();
  const layout = await page.evaluate(() => ({
    viewport: window.innerWidth,
    width: document.documentElement.scrollWidth,
    overflows: Array.from(document.querySelectorAll("body *"))
      .filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1)
      .map((e) => ({
        tag: e.tagName,
        cls: e.className,
        right: e.getBoundingClientRect().right,
      }))
      .slice(0, 15),
  }));
  expect(layout.width, JSON.stringify(layout)).toBeLessThanOrEqual(
    layout.viewport,
  );
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-people.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "Add employee", exact: true }).click();
  const code = `E2E-${testInfo.project.name}-${Date.now()}`;
  await page.getByLabel("Employee code", { exact: true }).fill(code);
  await page.getByLabel("Full name", { exact: true }).fill("Demo E2E Person");
  await page.getByLabel("Date of joining", { exact: true }).fill("2026-04-01");
  for (const label of ["Branch", "Department", "Designation"])
    await page
      .getByRole("combobox", { name: label, exact: true })
      .selectOption({ index: 1 });
  await page.getByLabel("PAN", { exact: true }).fill("TESTP0000A");
  await page
    .getByLabel("Aadhaar last four digits", { exact: true })
    .fill("0000");
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-form.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Save employee", exact: true })
    .click();
  await expect(page).toHaveURL(/\/employees$/);
  await page.getByLabel("Find a person").fill(code);
  const row = page.getByRole("row").filter({ hasText: code });
  await expect(row).toBeVisible();
  await row.getByRole("link").click();
  await expect(page.getByText("Saved: ••••000A")).toBeVisible();
  await expect(page.getByLabel("PAN", { exact: true })).toHaveValue("");
  await page
    .getByLabel("Full name", { exact: true })
    .fill("Updated Demo E2E Person");
  await page
    .getByRole("button", { name: "Save employee", exact: true })
    .click();
  await expect(page).toHaveURL(/\/employees$/);
  await page.reload();
  await page.getByLabel("Find a person").fill(code);
  await expect(page.getByRole("row").filter({ hasText: code })).toContainText(
    "Updated Demo E2E Person",
  );
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
});
test("employee can view own record and cannot open the add form", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Company workspace").fill("demo");
  await page.getByLabel("Email", { exact: true }).fill("employee@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Demo-only-1234");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "People", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Add employee", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: /View profile/ }).click();
  await expect(
    page.getByRole("heading", { name: "Employee profile" }),
  ).toBeVisible();
  await page.goto("/employees/new");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Admin or HR access is required",
  );
});
