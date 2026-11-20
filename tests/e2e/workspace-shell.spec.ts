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

test("keyboard page finder filters destinations and opens the selected workspace", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Company workspace").fill("demo");
  await page.getByLabel("Email", { exact: true }).fill("hr@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Demo-only-1234");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Find a page" }).waitFor();
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Find a page" });
  const search = dialog.getByRole("searchbox");
  await expect(search).toBeFocused();
  await search.fill("unmatched page");
  await expect(dialog.getByRole("status")).toHaveText("No matching pages.");
  await search.fill("workforce");
  await search.press("ArrowDown");
  await expect(dialog.getByRole("link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Workforce operations" }),
  ).toBeVisible();
  await expect(dialog).toBeHidden();
});
