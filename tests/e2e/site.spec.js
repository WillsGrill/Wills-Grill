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
  await page.locator(".filter-panel summary").click();
  await page.getByLabel("Protein Source").selectOption("Fish");
  await expect(page.locator(".recipe-card").first()).toBeVisible();
  await page.locator(".recipe-card").first().getByRole("link", { name: "View Recipe" }).click();
  await expect(page.locator("#recipePage h1")).toBeVisible();
  expect(await page.evaluate(() => Boolean(window.jspdf))).toBeFalsy();
  await page.getByRole("button", { name: "Preview & Print PDF" }).click();
  await expect(page.getByRole("dialog", { name: "Your recipe PDF" })).toBeVisible();
  await expect(page.locator("body > header")).toHaveAttribute("inert", "");
  await page.getByRole("button", { name: "Close PDF preview" }).click();
  await expect(page.getByRole("dialog", { name: "Your recipe PDF" })).toHaveCount(0);
  await page.goto("/pages/shopping-list.html");
  await expect(page.getByRole("button", { name: "Copy Shopping List" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Print Shopping List" })).toBeDisabled();
});

test("filter state is shareable, restorable, and clearable", async ({ page }) => {
  await page.goto("/pages/browse.html?q=chicken&protein=Chicken&time=45&difficulty=Easy");
  await expect(page.getByLabel("Search recipes")).toHaveValue("chicken");
  await page.locator(".filter-panel summary").click();
  await expect(page.getByLabel("Protein Source")).toHaveValue("Chicken");
  await expect(page.getByLabel("Maximum time")).toHaveValue("45");
  await expect(page.getByLabel("Difficulty")).toHaveValue("Easy");
  await expect(page.locator("#activeFilterCount")).toHaveText("4 active");
  await page.reload();
  await expect(page.getByLabel("Search recipes")).toHaveValue("chicken");
  await page.locator(".filter-panel summary").click();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(/\/pages\/browse\.html$/);
  await expect(page.locator(".recipe-card")).toHaveCount(await page.evaluate(() => recipes.length));
});

test("keyboard navigation exposes and operates the mobile menu", async ({ page }) => {
  const viewport = page.viewportSize();
  test.skip(!viewport || viewport.width >= 700, "Mobile navigation check");
  await page.goto("/");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Menu" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("navigation").getByRole("link", { name: "Home" })).toBeFocused();
});

test("data loading failure provides an actionable retry state", async ({ page }) => {
  await page.route("**/data/recipes/recipes.json", route => route.abort());
  await page.goto("/pages/browse.html");
  await expect(page.getByRole("alert")).toContainText("Something went wrong");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("invalid saved selection is recovered safely", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("willsGrillShopping", "not-json"));
  await page.goto("/pages/shopping-list.html");
  await expect(page.locator(".selected-recipe-count")).toHaveText("0");
  await expect(page.getByRole("button", { name: "Copy Shopping List" })).toBeDisabled();
  await expect(page.getByText("No recipes have been selected yet.")).toBeVisible();
});

test("shopping selection quantities and clear confirmation behave correctly", async ({ page }) => {
  await page.goto("/pages/browse.html");
  const firstCard = page.locator(".recipe-card").first();
  await firstCard.getByRole("button", { name: /add/i }).click();
  await firstCard.getByRole("button", { name: "Increase recipe quantity" }).click();
  await expect(firstCard.locator(".quantity-value")).toHaveText("2");
  await page.goto("/pages/shopping-list.html");
  page.once("dialog", dialog => dialog.dismiss());
  await page.locator(".selected-recipes-card summary").click();
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.locator(".selected-recipe-count")).toHaveText("2");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.locator(".selected-recipe-count")).toHaveText("0");
});

test("all recipe and shopping PDF layouts render without overflow errors", async ({ page }) => {
  await page.goto("/pages/recipe.html?id=REC025");
  await expect(page.locator("#recipePage h1")).toBeVisible();
  await page.evaluate(() => ensurePDFLibraries());
  const result = await page.evaluate(() => {
    const recipePageCounts = recipes.map(recipe => {
      const doc = new window.jspdf.jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pages = WillsGrillPDF.drawRecipePages(doc, recipe, {
        assets: {},
        imageData: null,
        ingredientLines: formatSectionedIngredientLines(recipe.ingredients),
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
  expect(result.recipePageCounts.filter(item => item.pages !== 1)).toEqual([]);
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
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      }));
      expect(dimensions.scrollWidth, `${path} overflowed at ${width}px (scroll ${dimensions.scrollWidth}px, client ${dimensions.clientWidth}px)`).toBeLessThanOrEqual(dimensions.clientWidth);
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
