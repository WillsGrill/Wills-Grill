const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

async function openNavigationLink(page, name) {
  const link = page.getByRole("navigation").getByRole("link", { name });
  if (!(await link.isVisible())) await page.getByRole("button", { name: "Menu" }).click();
  await link.click();
}

test("core recipe planning journey works", async ({ page }) => {
  await page.goto("/pages/browse.html");
  await expect(page.getByRole("heading", { name: "Browse Recipes" })).toBeVisible();
  const recipeCount = await page.evaluate(() => recipes.length);
  await expect(page.locator(".recipe-card")).toHaveCount(recipeCount);
  await page.locator(".recipe-card").first().getByRole("button", { name: /add/i }).click();
  await expect(page.locator(".nav-count")).toHaveText("1");
  await openNavigationLink(page, /shopping list/i);
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
  await page.locator(".recipe-card").first().getByRole("link", { name: "View Recipe" }).click();
  await expect(page.locator("#recipePage h1")).toBeVisible();
  expect(await page.evaluate(() => new window.jspdf.jsPDF().output("arraybuffer").byteLength)).toBeGreaterThan(0);
  await page.goto("/pages/shopping-list.html");
  await expect(page.getByRole("button", { name: "Copy Shopping List" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Print Shopping List" })).toBeDisabled();
});

test("all recipe and shopping PDF layouts render without overflow errors", async ({ page }) => {
  await page.goto("/pages/recipe.html?id=REC025");
  await expect(page.locator("#recipePage h1")).toBeVisible();
  const result = await page.evaluate(() => {
    const recipePageCounts = recipes.map(recipe => {
      const doc = new window.jspdf.jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pages = WillsGrillPDF.drawRecipePages(doc, recipe, {
        assets: {},
        imageData: null,
        ingredientLines: recipe.ingredients.map(formatIngredient),
        serves: recipe.serves
      });
      return { id: recipe.id, pages: pages.lastPage - pages.firstPage + 1 };
    });

    const shoppingDoc = new window.jspdf.jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const grouped = ingredients.reduce((result, ingredient) => {
      (result[ingredient.category] ||= []).push(ingredient);
      return result;
    }, {});
    const blocks = Object.entries(grouped).map(([category, items]) => ({
      category,
      entries: items.map(item => formatIngredientRecord(item, 1))
    }));
    WillsGrillPDF.drawShoppingPages(shoppingDoc, blocks, { assets: {}, useCurrentPage: true });

    return {
      recipePageCounts,
      shoppingPages: shoppingDoc.getNumberOfPages()
    };
  });
  expect(result.recipePageCounts.length).toBeGreaterThan(0);
  expect(result.recipePageCounts.every(item => item.pages >= 1 && item.pages <= 2)).toBeTruthy();
  expect(result.shoppingPages).toBeGreaterThan(1);
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
  for (const path of ["/", "/pages/browse.html", "/recipes/rec001.html", "/pages/shopping-list.html", "/pages/mealpack.html"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(item => ["serious", "critical"].includes(item.impact))).toEqual([]);
  }
});

test("all recipe links load without browser or image errors", async ({ page }) => {
  test.setTimeout(90000);
  const errors = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/pages/browse.html");
  const links = await page.locator(".viewRecipe").evaluateAll(items => items.map(item => item.getAttribute("href")));
  for (const href of links) {
    await page.goto(href);
    await expect(page.locator("#recipePage h1")).toBeVisible();
    const brokenImages = await page.locator("img").evaluateAll(images => images.filter(image => !image.complete || image.naturalWidth === 0).length);
    expect(brokenImages).toBe(0);
  }
  expect(errors).toEqual([]);
});

test("selection survives refresh and browser history", async ({ page }) => {
  await page.goto("/pages/browse.html");
  await page.locator(".recipe-card").first().getByRole("button", { name: /add/i }).click();
  await page.reload();
  await expect(page.locator(".nav-count")).toHaveText("1");
  await page.locator(".viewRecipe").first().click();
  await page.goBack();
  await expect(page.locator(".nav-count")).toHaveText("1");
});

test("requested responsive widths do not create horizontal overflow", async ({ page }, testInfo) => {
  test.setTimeout(90000);
  test.skip(testInfo.project.name !== "desktop", "Run the breakpoint matrix once in Chromium");
  for (const width of [320, 375, 390, 414, 768, 1024, 1280, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: width < 700 ? 700 : 1000 });
    for (const path of ["/", "/pages/browse.html", "/recipes/rec001.html", "/pages/shopping-list.html", "/pages/mealpack.html"]) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
    }
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
