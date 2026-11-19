import { test, expect } from "@playwright/test";
import { chargeableDays, type TimeView } from "../../packages/shared/src/time";
test("employee previews and withdraws leave, views the calendar and opens attendance", async ({
  page,
}, info) => {
  await page.goto("/login");
  await page.getByLabel("Company workspace").fill("demo");
  await page.getByLabel("Email", { exact: true }).fill("employee@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Demo-only-1234");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("link", { name: "Leave", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Request time off" }),
  ).toBeVisible();
  const snapshot: TimeView = await (await page.request.get("/api/time")).json();
  const year = snapshot.today.slice(0, 4);
  const branch = snapshot.branches.find((b) => b.id === snapshot.branchId)!;
  const date = chargeableDays(
    year + "-01-01",
    year + "-12-31",
    branch.weekdays,
    branch.holidays.map((h) => h.day),
  ).find(
    (d) =>
      !snapshot.leaves.some(
        (l) =>
          ["Approved", "Pending"].includes(l.status) &&
          l.start <= d &&
          l.end >= d,
      ),
  )!;
  await page.getByLabel("From", { exact: true }).fill(date);
  await page.getByLabel("Through").fill(date);
  const reason = "Demo journey " + info.project.name + " " + Date.now();
  await page.getByLabel("Reason (optional)").fill(reason);
  await expect(page.getByText("1 chargeable working days")).toBeVisible();
  await page.getByRole("button", { name: "Submit request" }).click();
  const row = page.locator("article").filter({ hasText: reason });
  await expect(row.getByText("Pending", { exact: true })).toBeVisible();
  await page.reload();
  await row.getByRole("button", { name: "Withdraw" }).click();
  await expect(row.getByText("Withdrawn", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Calendar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Approved absences" }),
  ).toBeVisible();
  await expect(page.getByText(reason)).toHaveCount(0);
  await page.getByRole("link", { name: "Attendance", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Daily register" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Correct an entry" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: "test-results/" + info.project.name + "-attendance.png",
    fullPage: true,
  });
});

test("HR sets an allocation and a manager approves an employee's leave", async ({
  page,
}, info) => {
  async function enter(role: string) {
    await page.goto("/login");
    await page.getByLabel("Company workspace").fill("demo");
    await page
      .getByLabel("Email", { exact: true })
      .fill(role + "@example.test");
    await page.getByLabel("Password", { exact: true }).fill("Demo-only-1234");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.getByRole("link", { name: "Leave", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Leave requests" }),
    ).toBeVisible();
  }
  async function exit() {
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
  }
  const policy = "Demo review " + info.project.name + " " + Date.now();
  await enter("hr");
  await page.getByLabel("Type name").fill(policy);
  await page.getByLabel("Opening days").fill("3");
  await page.getByRole("button", { name: "Add policy" }).click();
  await expect(page.getByText("Changes saved.")).toBeVisible();
  await exit();
  await enter("employee");
  const state: TimeView = await (await page.request.get("/api/time")).json();
  const branch = state.branches.find((b) => b.id === state.branchId)!;
  const year = state.today.slice(0, 4);
  const date = chargeableDays(
    year + "-01-01",
    year + "-12-31",
    branch.weekdays,
    branch.holidays.map((h) => h.day),
  ).find(
    (d) =>
      !state.leaves.some(
        (l) =>
          ["Pending", "Approved"].includes(l.status) &&
          l.start <= d &&
          l.end >= d,
      ),
  )!;
  await page.getByLabel("From", { exact: true }).fill(date);
  await page.getByLabel("Through").fill(date);
  await page
    .getByRole("combobox", { name: "Leave type" })
    .selectOption({ label: policy });
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page.getByText("Changes saved.")).toBeVisible();
  await exit();
  await enter("manager");
  await page.getByRole("button", { name: "Show awaiting review" }).click();
  const row = page.locator("article").filter({ hasText: policy });
  await row.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(row).toHaveCount(0);
  await exit();
  await enter("employee");
  await page
    .getByRole("combobox", { name: "Leave type" })
    .selectOption({ label: policy });
  await expect(page.locator(".balance strong")).toHaveText("2");
  await expect(
    page.locator("article").filter({ hasText: policy }),
  ).toContainText("Approved");
});
