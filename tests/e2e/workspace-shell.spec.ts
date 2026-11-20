import { test, expect } from "@playwright/test";
test("workspace navigation marks the current section and keeps the directory within the viewport", async ({
  page,
  isMobile,
}) => {
  await page.goto("/login");
  await page.getByLabel("Company workspace").fill("demo");
  await page.getByLabel("Email", { exact: true }).fill("hr@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Demo-only-1234");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const nav = page.getByRole("navigation", { name: "Workspace" });
  await expect(
    nav.getByRole("link", { name: "People", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  const bounds = await page
    .getByRole("table", { name: "Employee directory" })
    .boundingBox();
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  const menu = page.getByRole("button", { name: "All sections" });
  if (isMobile) {
    await menu.click();
    await expect(
      page.getByRole("button", { name: "Close menu" }),
    ).toHaveAttribute("aria-expanded", "true");
  }
  await nav.getByRole("link", { name: "Workforce", exact: true }).click();
  await expect(
    nav.getByRole("link", { name: "Workforce", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  if (isMobile) await expect(menu).toHaveAttribute("aria-expanded", "false");
});
