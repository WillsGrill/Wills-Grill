/*
==================================================
Will's Grill
recipes.js
==================================================
*/

"use strict";

let recipes = [];

/* ==================================================
   Initialise
================================================== */

async function initialiseRecipes() {

    try {

        const response = await fetch(PATHS.recipes);

        if (!response.ok) {

            throw new Error("Unable to load recipes.");

        }

        const recipeData = await response.json();
        if (!Array.isArray(recipeData)) throw new Error("Recipe data must be an array.");
        recipes = recipeData.map(normaliseRecipe).filter(Boolean);
        if (!recipes.length) throw new Error("No valid recipes were found.");

        const preview = getRecipeManagerPreview();
        if (preview?.recipe?.id) {
            const existingIndex = recipes.findIndex(recipe => recipe.id === preview.recipe.id);
            const previewRecipe = normaliseRecipe(preview.recipe);
            if (previewRecipe && existingIndex >= 0) recipes[existingIndex] = previewRecipe;
            else if (previewRecipe) recipes.push(previewRecipe);
        }

        recipes = recipes.map(recipe => ({ ...recipe, treat: isTreatRecipe(recipe) }));

    }

    catch (error) {

        console.error(error);

        renderRecipeLoadError();
        throw error;

    }

    if (document.getElementById("recipeList")) {

        renderRecipes(recipes);

        initialiseSearch();

    }

    if (document.getElementById("recipePage")) {

        renderRecipePage();

    }

}

function normaliseRecipe(value) {
    if (!value || typeof value !== "object") return null;
    const id = String(value.id || "").trim();
    const name = String(value.name || "").trim();
    if (!id || !name) return null;
    const number = (input, fallback = 0) => {
        const parsed = Number(input);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
    };
    const nutrition = value.nutrition && typeof value.nutrition === "object" ? value.nutrition : {};
    return {
        ...value,
        id,
        name,
        description: String(value.description || ""),
        category: String(value.category || "Other"),
        difficulty: String(value.difficulty || "Easy"),
        image: typeof value.image === "string" ? value.image : "",
        prepTime: number(value.prepTime),
        cookTime: number(value.cookTime),
        serves: Math.max(1, number(value.serves, 1)),
        ingredients: Array.isArray(value.ingredients)
            ? value.ingredients.filter(item => item && typeof item === "object").map(item => ({
                ...item,
                ingredient: String(item.ingredient || ""),
                quantity: number(item.quantity),
                unit: typeof item.unit === "string" ? item.unit : ""
            })).filter(item => item.ingredient)
            : [],
        steps: Array.isArray(value.steps) ? value.steps.map(String).filter(Boolean) : [],
        tip: String(value.tip || ""),
        nutrition: {
            calories: number(nutrition.calories),
            protein: number(nutrition.protein),
            carbs: number(nutrition.carbs),
            fat: number(nutrition.fat)
        }
    };
}

function renderRecipeLoadError() {
    const target = document.getElementById("recipeList") || document.getElementById("recipePage");
    if (!target) return;
    target.innerHTML = `<div class="panel error-state" role="alert"><h2>Recipes could not be loaded</h2><p>Check your connection and try again.</p><button class="button" type="button" id="retryRecipes">Try again</button></div>`;
    document.getElementById("retryRecipes")?.addEventListener("click", () => initialiseRecipes().catch(() => {}), { once: true });
}

function getRecipeManagerPreview() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("preview") !== "recipemanager") return null;

    try {
        return JSON.parse(localStorage.getItem("willsgrill-recipe-preview-v1"));
    }
    catch (error) {
        console.error("Unable to load the RecipeManager preview.", error);
        return null;
    }
}

/* ==================================================
   Browse Page
================================================== */

function renderRecipes(recipeArray) {

    const container = document.getElementById("recipeList");

    if (!container) return;

    container.innerHTML = "";

    if (!recipeArray.length) {
        container.innerHTML = `<div class="panel no-results" role="status"><h2>No recipes found</h2><p>Try clearing a filter or using a different search.</p></div>`;
        if (typeof updateButtons === "function") updateButtons();
        return;
    }

    recipeArray.forEach(recipe => {

        container.insertAdjacentHTML("beforeend", createRecipeCard(recipe));

    });

    container.querySelectorAll("img[data-full-image]").forEach(image => {
        image.addEventListener("error", () => {
            if (image.src.endsWith(image.dataset.fullImage)) return;
            image.src = image.dataset.fullImage;
        }, { once: true });
    });

    if (typeof updateButtons === "function") {

        updateButtons();

    }

}

function createRecipeCard(recipe) {

    const imageHTML = recipe.image
        ? `<img src="../assets/images/recipes/thumbs/${escapeHTML(recipe.image)}" data-full-image="../assets/images/recipes/${escapeHTML(recipe.image)}" alt="${escapeHTML(recipe.name)}" width="800" height="450" loading="lazy" decoding="async">`
        : `<div class="recipe-image-placeholder" role="img" aria-label="Image for ${escapeHTML(recipe.name)} coming soon">Image coming soon</div>`;
    const treatBadgeHTML = recipe.treat
        ? `<span class="treat-badge" title="Treat recipe – best enjoyed occasionally">Treat</span>`
        : "";

    return `

<article class="recipe-card">

    <div class="recipe-image">

        ${imageHTML}
        ${treatBadgeHTML}

    </div>

    <div class="recipe-body">

        <h2>${escapeHTML(recipe.name)}</h2>

        <p>${escapeHTML(recipe.description)}</p>

        <div class="recipe-meta">

            <span>${escapeHTML(recipe.prepTime + recipe.cookTime)} mins</span>

            <span>Serves ${escapeHTML(recipe.serves)}</span>

            <span>${escapeHTML(recipe.difficulty)}</span>

        </div>

        <div class="recipe-actions">

            <a
                class="button viewRecipe"
                href="${escapeHTML(getRecipeURL(recipe.id))}">

                View Recipe

            </a>

            <div class="recipe-quantity-control" data-id="${recipe.id}">

                <button
                    class="button button-outline addRecipe"
                    data-id="${escapeHTML(recipe.id)}"
                    data-quantity="1">

                    Add

                </button>

            </div>

        </div>

    </div>

</article>

`;

}

/* ==================================================
   Search
================================================== */

function initialiseSearch() {

    const search = document.getElementById("searchBox");

    if (!search) return;
    const controls = [search, document.getElementById("categoryFilter"), document.getElementById("timeFilter"), document.getElementById("proteinFilter"), document.getElementById("recipeSort")].filter(Boolean);
    const applyFilters = () => {
        const value = search.value.toLowerCase().trim();
        const category = document.getElementById("categoryFilter")?.value || "";
        const maxTime = Number(document.getElementById("timeFilter")?.value || 0);
        const minProtein = Number(document.getElementById("proteinFilter")?.value || 0);
        const sort = document.getElementById("recipeSort")?.value || "featured";
        const filteredRecipes = recipes.filter(recipe => {
            const ingredientText = recipe.ingredients.map(item => {
                const record = Array.isArray(ingredients) ? ingredients.find(ingredient => ingredient.id === item.ingredient) : null;
                return `${item.ingredient} ${record?.name || ""}`;
            }).join(" ");
            const matchesText = !value || [recipe.name, recipe.description, recipe.category, ingredientText]
                .some(text => String(text).toLowerCase().includes(value));
            return matchesText && (!category || recipe.category === category) && (!maxTime || recipe.prepTime + recipe.cookTime <= maxTime) && (!minProtein || recipe.nutrition.protein >= minProtein);
        });
        filteredRecipes.sort((first, second) => {
            if (sort === "time") return (first.prepTime + first.cookTime) - (second.prepTime + second.cookTime) || first.name.localeCompare(second.name);
            if (sort === "protein") return second.nutrition.protein - first.nutrition.protein || first.name.localeCompare(second.name);
            if (sort === "name") return first.name.localeCompare(second.name);
            return 0;
        });
        renderRecipes(filteredRecipes);
    };
    controls.forEach(control => {
        control.addEventListener(control === search ? "input" : "change", applyFilters);
    });

}

/* ==================================================
   Recipe Page
================================================== */

function renderRecipePage() {

    const container = document.getElementById("recipePage");

    if (!container) return;

    const params = new URLSearchParams(window.location.search);

    const pathMatch = window.location.pathname.match(/\/recipes\/([^/]+)\.html$/i);
    const recipeID = params.get("id") || (pathMatch ? decodeURIComponent(pathMatch[1]).toUpperCase() : "");

    const recipe = recipes.find(r => r.id === recipeID);

    if (!recipe) {

        container.innerHTML = `

<div class="panel">

<h1>Recipe not found</h1>

<p>The requested recipe could not be found.</p>

</div>

`;

        document.title = "Recipe not found | Will's Grill";
        document.querySelector("meta[name='robots']")?.setAttribute("content", "noindex");
        return;

    }

    const ingredientHTML = recipe.ingredients.map(item =>

        `<li>${escapeHTML(formatIngredient(item))}</li>`

    ).join("");

    const methodHTML = recipe.steps.map((step, index) =>

        `

<li class="step">

<div class="step-number">${index + 1}</div>

<div>${escapeHTML(step)}</div>

</li>

`

    ).join("");

    const heroImageHTML = recipe.image
        ? `<img src="../assets/images/recipes/${escapeHTML(recipe.image)}" alt="${escapeHTML(recipe.name)}" width="1600" height="900">`
        : `<div class="recipe-image-placeholder" role="img" aria-label="Image for ${escapeHTML(recipe.name)} coming soon">Image coming soon</div>`;
    const treatBadgeHTML = recipe.treat
        ? `<span class="treat-badge treat-badge-large" title="Treat recipe – best enjoyed occasionally">Treat</span>`
        : "";

    container.innerHTML = `

<div class="recipe-hero">

<div class="recipe-summary">

<h1>${escapeHTML(recipe.name)}</h1>

<p>${escapeHTML(recipe.description)}</p>

<div class="recipe-badges">

<span class="badge">

${escapeHTML(recipe.prepTime + recipe.cookTime)} mins

</span>

<span class="badge">

Serves ${escapeHTML(recipe.serves)}

</span>

<span class="badge">

${escapeHTML(recipe.difficulty)}

</span>

</div>

<div class="recipe-actions">

<div class="recipe-quantity-control recipe-quantity-control-large" data-id="${escapeHTML(recipe.id)}">

<button
class="button addRecipe"
data-id="${escapeHTML(recipe.id)}"
data-quantity="1">

Add Recipe

</button>

</div>

<button
class="button button-outline printRecipe"
data-id="${escapeHTML(recipe.id)}">

Preview & Print PDF

</button>

</div>

</div>

<div class="recipe-hero-image">

${heroImageHTML}
${treatBadgeHTML}

</div>

</div>

<div class="recipe-columns">

<section class="panel recipe-ingredients">

<h3>Ingredients</h3>

<ul class="ingredients">

${ingredientHTML}

</ul>

</section>

<div class="recipe-details">

<section class="recipe-method">

<h3>Method</h3>

<ol class="method">

${methodHTML}

</ol>

</section>

<div class="recipe-side">

<section class="panel recipe-nutrition">

<h3>Nutrition <small>(per serving)</small></h3>

<p><strong>Calories:</strong> ${recipe.nutrition.calories}</p>
<p><strong>Protein:</strong> ${recipe.nutrition.protein} g</p>
<p><strong>Carbs:</strong> ${recipe.nutrition.carbs} g</p>
<p><strong>Fat:</strong> ${recipe.nutrition.fat} g</p>

</section>

<section class="panel recipe-tip mt-4">

<h3>Chef's Tip</h3>

<p>${escapeHTML(recipe.tip)}</p>

</section>

</div>

</div>

</div>

`;

    updateRecipeMetadata(recipe);

    if (typeof updateButtons === "function") {

        updateButtons();

    }

}

function updateRecipeMetadata(recipe) {
    document.title = `${recipe.name} | Will's Grill`;
    const description = recipe.description;
    document.querySelector("meta[name='description']")?.setAttribute("content", description);
    document.querySelector("meta[property='og:title']")?.setAttribute("content", recipe.name);
    document.querySelector("meta[property='og:description']")?.setAttribute("content", description);
    const socialImage = document.querySelector("meta[property='og:image']");
    if (socialImage) socialImage.setAttribute("content", recipe.image ? new URL(`../assets/images/recipes/${recipe.image}`, location.href).href : "");
    const canonical = document.querySelector("link[rel='canonical']");
    if (canonical) canonical.href = new URL(getRecipeURL(recipe.id), location.href).href;
    document.getElementById("recipeStructuredData")?.remove();
    const ingredientLines = recipe.ingredients.map(formatIngredient);
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: recipe.name,
        description,
        ...(recipe.image ? { image: new URL(`../assets/images/recipes/${recipe.image}`, location.href).href } : {}),
        prepTime: `PT${recipe.prepTime}M`,
        cookTime: `PT${recipe.cookTime}M`,
        recipeYield: `${recipe.serves} servings`,
        recipeCategory: recipe.category,
        recipeIngredient: ingredientLines,
        recipeInstructions: recipe.steps.map(step => ({ "@type": "HowToStep", text: step })),
        nutrition: { "@type": "NutritionInformation", calories: `${recipe.nutrition.calories} calories`, proteinContent: `${recipe.nutrition.protein} g`, carbohydrateContent: `${recipe.nutrition.carbs} g`, fatContent: `${recipe.nutrition.fat} g` }
    };
    const script = document.createElement("script");
    script.id = "recipeStructuredData";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
}

/* ==================================================
   Navigation
================================================== */

async function loadImageAsDataURL(url) {

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Unable to load image.");
    }

    const blob = await response.blob();

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

}

async function generateRecipePDF(recipe) {

    const jsPDF = window.jspdf?.jsPDF;

    if (!jsPDF) {
        window.print();
        return;
    }

    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true
    });

    const assets = { logoData: null };
    let imageData = null;
    try {
        assets.logoData = await loadImageAsDataURL("../assets/images/logo.webp");
    }
    catch (error) {
        console.warn("Will's Grill logo was omitted from the PDF.", error);
    }
    if (recipe.image) {
        try {
            imageData = await loadImageAsDataURL(`../assets/images/recipes/${recipe.image}`);
        }
        catch (error) {
            console.warn("Recipe image was omitted from the PDF.", error);
        }
    }
    WillsGrillPDF.setDocumentProperties(doc, `${recipe.name} | Will's Grill`, "Will's Grill recipe card");
    WillsGrillPDF.drawRecipePages(doc, recipe, {
        assets,
        imageData,
        ingredientLines: recipe.ingredients.map(formatIngredient),
        serves: recipe.serves
    });
    WillsGrillPDF.addPageNumbers(doc);

    const filename = recipe.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    openRecipePDFPreview(doc, `${filename}-recipe.pdf`);

}

function openRecipePDFPreview(doc, filename) {

    const previousFocus = document.activeElement;
    const pdfURL = URL.createObjectURL(doc.output("blob"));
    const overlay = document.createElement("div");
    const dialog = document.createElement("section");
    const toolbar = document.createElement("div");
    const title = document.createElement("h2");
    const actions = document.createElement("div");
    const printButton = document.createElement("button");
    const downloadButton = document.createElement("button");
    const closeButton = document.createElement("button");
    const frame = document.createElement("iframe");

    overlay.className = "pdf-preview-overlay";
    overlay.setAttribute("role", "presentation");
    dialog.className = "pdf-preview-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "pdfPreviewTitle");
    toolbar.className = "pdf-preview-toolbar";
    title.id = "pdfPreviewTitle";
    title.textContent = "Your recipe PDF";
    actions.className = "pdf-preview-actions";
    printButton.className = "button";
    printButton.textContent = "Print PDF";
    downloadButton.className = "button button-outline";
    downloadButton.textContent = "Download PDF";
    closeButton.className = "pdf-preview-close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close PDF preview");
    closeButton.textContent = "Close";
    frame.className = "pdf-preview-frame";
    frame.title = "Recipe PDF preview";
    frame.src = `${pdfURL}#view=FitH`;

    const handleKeydown = event => {
        if (event.key === "Escape" && document.body.contains(overlay)) {
            closePreview();
            return;
        }
        if (event.key === "Tab") {
            const focusable = [printButton, downloadButton, closeButton];
            if (event.shiftKey && document.activeElement === focusable[0]) {
                event.preventDefault();
                focusable[focusable.length - 1].focus();
            }
            else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
                event.preventDefault();
                focusable[0].focus();
            }
        }
    };

    const closePreview = () => {
        frame.src = "about:blank";
        overlay.remove();
        document.removeEventListener("keydown", handleKeydown);
        URL.revokeObjectURL(pdfURL);
        previousFocus?.focus?.();
    };

    printButton.addEventListener("click", () => {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
    });

    downloadButton.addEventListener("click", () => {
        const link = document.createElement("a");
        link.href = pdfURL;
        link.download = filename;
        link.click();
    });

    closeButton.addEventListener("click", closePreview);

    overlay.addEventListener("click", event => {
        if (event.target === overlay) {
            closePreview();
        }
    });

    document.addEventListener("keydown", handleKeydown);

    actions.append(printButton, downloadButton);
    toolbar.append(title, actions, closeButton);
    dialog.append(toolbar, frame);
    overlay.append(dialog);
    document.body.append(overlay);
    closeButton.focus();

}

document.addEventListener("click", event => {
    const printButton = event.target.closest(".printRecipe");

    if (printButton) {
        const recipe = recipes.find(recipe =>
            recipe.id === printButton.dataset.id
        );

        if (recipe) {
            generateRecipePDF(recipe);
        }

        return;
    }

});
