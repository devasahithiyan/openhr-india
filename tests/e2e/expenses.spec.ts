import { test, expect } from "@playwright/test";
test("employee revises a returned expense and follows it through reimbursement", async ({
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
    await page.getByRole("link", { name: "Expenses", exact: true }).click();
  }
  const purpose = "Demo visit " + info.project.name + " " + Date.now();
  const claim = page.locator("article").filter({ hasText: purpose });
  await enter("employee");
  await page.getByText("New expense claim", { exact: true }).click();
  await page.getByLabel("Amount (₹)").fill("850");
  await page.getByLabel("Business purpose").fill(purpose);
  await page.getByRole("button", { name: "Submit claim", exact: true }).click();
  await expect(claim).toContainText("Submitted");
  await enter("manager");
  await claim.getByLabel("Reason for return").fill("Add destination");
  await claim.getByRole("button", { name: "Return for clarification" }).click();
  await expect(claim).toContainText("Return reason");
  await enter("employee");
  await claim.getByLabel("Business purpose").fill(purpose + " Chennai");
  await claim.getByRole("button", { name: "Resubmit claim" }).click();
  await expect(claim).toContainText("Chennai");
  await enter("manager");
  await claim.getByRole("button", { name: "Approve claim" }).click();
  await expect(claim).toContainText("Approved");
  await enter("hr");
  await claim.getByLabel("Payment reference").fill("DEMO-REIMBURSED");
  await claim.getByRole("button", { name: "Record reimbursement" }).click();
  await expect(claim).toContainText("Reimbursed");
  await enter("employee");
  await expect(claim).toContainText("DEMO-REIMBURSED");
});
