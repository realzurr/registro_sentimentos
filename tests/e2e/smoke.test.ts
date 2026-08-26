import { test, expect } from "@playwright/test";

test.describe("App de Virtudes — smoke tests", () => {
  test("landing page loads and shows title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Agenda de Virtudes/);
  });

  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Senha" })).toBeVisible();
    await expect(page.getByRole("button", { name: /entrar/i })).toBeVisible();
  });

  test("admin page redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("meus-registros page redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/meus-registros");
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("page loads without JavaScript errors", async ({ page }) => {
    const jsErrors: string[] = [];
    page.on("pageerror", (err) => jsErrors.push(err.message));
    await page.goto("/");
    await page.waitForTimeout(2000);
    expect(jsErrors).toHaveLength(0);
  });
});
