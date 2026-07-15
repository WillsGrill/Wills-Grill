const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

test("core recipe planning journey works", async ({ page }) => {
  await page.goto("/pages/browse.html");
  await expect(page.getByRole("heading", { name: "Browse Recipes" })).toBeVisible();
  await expect(page.locator(".recipe-card")).toHaveCount(25);
  await page.locator(".recipe-card").first().getByRole("button", { name: /add/i }).click();
  await expect(page.locator(".nav-count")).toHaveText("1");
  await page.getByRole("link", { name: /shopping list/i }).click();
  await expect(page.getByRole("heading", { name: "Shopping List" })).toBeVisible();
  await expect(page.locator(".shopping-item-check").first()).toBeVisible();
});

test("search and filters have a clear empty state", async ({ page }) => {
  await page.goto("/pages/browse.html");
  await page.getByLabel("Search recipes").fill("not-a-real-recipe-name");
  await expect(page.getByRole("heading", { name: "No recipes found" })).toBeVisible();
});

test("recipe links, filters, and empty actions behave clearly", async ({ page }) => {
  await page.goto("/pages/browse.html");
  await page.getByLabel("Category").selectOption("Fish");
  await expect(page.locator(".recipe-card").first()).toBeVisible();
  await page.locator(".recipe-card").first().getByRole("button", { name: "View Recipe" }).click();
  await expect(page.locator("#recipePage h1")).toBeVisible();
  expect(await page.evaluate(() => new window.jspdf.jsPDF().output("arraybuffer").byteLength)).toBeGreaterThan(0);
  await page.goto("/pages/shopping-list.html");
  await expect(page.getByRole("button", { name: "Copy Shopping List" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Print Shopping List" })).toBeDisabled();
});

test("mobile menu exposes every main destination", async ({ page }) => {
  const viewport = page.viewportSize();
  test.skip(!viewport || viewport.width >= 700, "Mobile navigation check");
  await page.goto("/");
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("navigation").getByRole("link", { name: /Browse Recipes/ })).toBeVisible();
  await expect(page.getByRole("navigation").getByRole("link", { name: /Create Meal Pack/ })).toBeVisible();
});

test("key pages have no serious accessibility violations", async ({ page }) => {
  for (const path of ["/", "/pages/browse.html", "/pages/shopping-list.html", "/pages/mealpack.html"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(item => ["serious", "critical"].includes(item.impact))).toEqual([]);
  }
});

test("Recipe Manager drafts survive a browser reload without losing ingredient fields", async ({ page }) => {
  await page.goto("/recipemanager/pages/ingredients.html");
  await page.locator("[data-action='edit-ingredient']").first().click();
  const originalName = await page.locator("#ingredientName").inputValue();
  const ingredientId = await page.locator("#ingredientId").inputValue();
  const originalPantry = await page.locator("#ingredientPantry").isChecked();
  await page.locator("#ingredientName").fill(`${originalName} test`);
  await page.locator("#ingredientEditorForm").getByRole("button", { name: "Save" }).click();
  await page.reload();
  await expect(page.locator("#ingredientTable")).toContainText(`${originalName} test`);
  await page.locator(`[data-action='edit-ingredient'][data-ingredient-id='${ingredientId}']`).click();
  await expect(page.locator("#ingredientPantry")).toBeChecked({ checked: originalPantry });
  await page.evaluate(() => localStorage.clear());
});
