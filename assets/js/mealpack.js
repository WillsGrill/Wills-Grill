/*
==================================================
Will's Grill
mealpack.js
==================================================
*/

"use strict";

const MEALPACK_CONTAINER_ID = "mealpack";
const MEALPACK_STORAGE = "willsGrillShopping";
const MEALPACK_PDF_STATE = {
    url: null,
    filename: ""
};

/* ============================================
   Initialise
============================================ */

document.addEventListener("DOMContentLoaded", initialiseMealPack);

async function initialiseMealPack() {

    if (!document.getElementById(MEALPACK_CONTAINER_ID)) return;

    try {

        if (typeof initialiseUI === "function") {
            await initialiseUI();
        }

        if (typeof initialiseRecipes === "function") {
            await initialiseRecipes();
        }

        if (typeof updateRecipeCounter === "function") {
            updateRecipeCounter();
        }

        await renderMealPack();

    }

    catch (error) {

        console.error("Meal Pack initialisation failed:", error);
        renderMealPackError();

    }

}

/* ============================================
   Helpers
============================================ */

function getSelectedRecipeSelections() {

    const data = localStorage.getItem(MEALPACK_STORAGE);
    if (!data) return [];

    try {
        const parsed = JSON.parse(data);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map(item => {

                if (typeof item === "string") {
                    return { id: String(item).trim(), quantity: 1 };
                }

                if (item && typeof item === "object") {
                    const quantity = parseInt(item.quantity || 1, 10);
                    return {
                        id: String(item.id || "").trim(),
                        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1
                    };
                }

                return null;

            })
            .filter(Boolean)
            .filter(item => item.id);
    }
    catch (error) {
        console.warn("Invalid Meal Pack recipe selection.", error);
        return [];
    }

}

function getSelectedRecipes() {

    const selectedItems = getSelectedRecipeSelections();
    return selectedItems
        .map(selection => {
            const recipe = recipes.find(recipe => String(recipe.id).trim() === String(selection.id).trim());
            return recipe
                ? { ...recipe, quantity: selection.quantity }
                : null;
        })
        .filter(Boolean);

}

function getMealPackData() {

    const selectedRecipes = getSelectedRecipes();
    const ingredientItems = getShoppingIngredientsForRecipes(selectedRecipes);

    return {
        selectedRecipes,
        ingredientItems,
        generatedDate: new Date(),
        recipeCount: selectedRecipes.length,
    };

}

function formatDate(date) {

    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

}

function buildShoppingHTML(items) {

    return buildShoppingListHTML(items);

}

function splitShoppingItemsIntoPages(items, itemsPerPage = 24) {

    const shoppingItems = Array.isArray(items) ? items : [];
    const pages = [];

    for (let index = 0; index < shoppingItems.length; index += itemsPerPage) {
        pages.push(shoppingItems.slice(index, index + itemsPerPage));
    }

    return pages.length ? pages : [[]];

}

function getMealPackPageLayout(selectedRecipes, ingredientItems) {

    const shoppingPageCount =
        splitShoppingItemsIntoPages(ingredientItems).length;

    const firstRecipePage = 3 + shoppingPageCount;

    const contents = [
        {
            label: "Shopping List",
            page: shoppingPageCount > 1 ? `3-${2 + shoppingPageCount}` : "3"
        },
        ...selectedRecipes.map((recipe, index) => ({
            label: recipe.name,
            page: firstRecipePage + index,
        })),
    ];

    return { contents, shoppingPageCount, firstRecipePage };

}

function buildShoppingPages(items) {

    const pages = splitShoppingItemsIntoPages(items);

    return pages.map((pageItems, index) => `

<section class="mp-page mp-shopping-page">

    <div class="mp-card">
        <h2>Shopping List${pages.length > 1 ? ` (${index + 1} of ${pages.length})` : ""}</h2>
        ${buildShoppingHTML(pageItems)}
    </div>

</section>

`).join("");

}

function buildContentsPage(selectedRecipes, ingredientItems) {

    const { contents } = getMealPackPageLayout(selectedRecipes, ingredientItems);

    return `

<section class="mp-page mp-contents">

    <div class="mp-card">

        <h2>Contents</h2>

        <div class="mp-contents-list">

            ${contents.map(row => `

            <div class="mp-contents-row">

                <span>${escapeHTML(row.label)}</span>

                <span>${row.page}</span>

            </div>

            `).join("")}

        </div>

    </div>

</section>

`;

}

function buildRecipePage(recipe) {

    const quantity = parseInt(recipe.quantity || 1, 10);
    const scaledQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;

    let previousIngredientSection = null;
    const ingredientHTML = recipe.ingredients.map(item => {
        const scaledItem = {
            ...item,
            quantity: item.quantity * scaledQuantity
        };
        const text = formatIngredient(scaledItem);
        const section = String(item.section || "").trim();
        const heading = section && section !== previousIngredientSection
            ? `<li class="ingredient-section-heading"><h4>${escapeHTML(section)}</h4></li>`
            : "";
        previousIngredientSection = section;
        return `${heading}<li>${escapeHTML(text)}</li>`;
    }).join("");

    const methodHTML = recipe.steps.map((step, index) => `

        <li>
            <span class="mp-step-number">${index + 1}</span>
            <span>${escapeHTML(step)}</span>
        </li>

    `).join("");

    const imageHTML = recipe.image
        ? `<img src="../assets/images/recipes/${escapeHTML(recipe.image)}" alt="${escapeHTML(recipe.name)}" width="1600" height="900">`
        : `<div class="recipe-image-placeholder" role="img" aria-label="Image for ${escapeHTML(recipe.name)} coming soon">Image coming soon</div>`;
    const treatBadgeHTML = recipe.treat
        ? `<span class="treat-badge" title="Treat recipe – best enjoyed occasionally">Treat</span>`
        : "";
    const freezeableBadgeHTML = recipe.freezeable
        ? `<span class="freezeable-badge" title="Suitable for freezing">Freezeable</span>`
        : "";
    const statusBadgesHTML = treatBadgeHTML || freezeableBadgeHTML
        ? `<div class="recipe-status-badges">${treatBadgeHTML}${freezeableBadgeHTML}</div>`
        : "";

    return `

<section class="mp-page mp-recipe">

    <div class="mp-card mp-recipe-layout">

        <div class="mp-recipe-header">
            <div class="mp-recipe-image">
                ${imageHTML}
                ${statusBadgesHTML}
            </div>

            <div class="mp-recipe-summary">
                <h2>${escapeHTML(recipe.name)}</h2>
                <p>${escapeHTML(recipe.description)}</p>

                <div class="mp-recipe-meta">
                    <span>Prep ${recipe.prepTime} mins</span>
                    <span>Cook ${recipe.cookTime} mins</span>
                    <span>Serves ${recipe.serves * scaledQuantity}</span>
                </div>

                <div class="mp-recipe-badges">
                    <span>${recipe.difficulty}</span>
                </div>
            </div>
        </div>

        <div class="mp-recipe-body">
            <div class="mp-info-panel">
                <h3>Nutrition <small>(per serving)</small></h3>
                <p><strong>Calories:</strong> ${recipe.nutrition.calories}</p>
                <p><strong>Protein:</strong> ${recipe.nutrition.protein} g</p>
                <p><strong>Carbs:</strong> ${recipe.nutrition.carbs} g</p>
                <p><strong>Fat:</strong> ${recipe.nutrition.fat} g</p>

                <div class="mp-tip-panel">
                    <h3>Chef's Tip</h3>
                    <p>${escapeHTML(recipe.tip)}</p>
                </div>
            </div>

            <div class="mp-ingredients-panel">
                <h3>Ingredients</h3>
                <ul class="mp-list mp-list-ingredients">
                    ${ingredientHTML}
                </ul>
            </div>

            <div class="mp-method-panel">
                <h3>Method</h3>
                <ol class="mp-steps">
                    ${methodHTML}
                </ol>
            </div>
        </div>

    </div>

</section>

`;

}

function buildMealPackMarkup() {

    const { selectedRecipes, ingredientItems, generatedDate, recipeCount } = getMealPackData();

    if (!selectedRecipes.length) {
        return `

<div class="mp-empty">

    <div class="mp-empty-card">

        <h1>No recipes selected</h1>

        <p>Choose recipes on the Shopping List page, then click Create Meal Pack.</p>

        <a class="button" href="shopping-list.html">Back to Shopping List</a>

    </div>

</div>

`;
    }

    return `

<div class="mp-toolbar">
    <button id="clearMealPack" class="button button-outline">Clear Recipes</button>
    <a class="button button-outline" href="shopping-list.html">Back to Shopping List</a>
</div>

<section class="mp-pdf-shell">

    <div class="mp-pdf-meta">
        <h1>Your Meal Pack PDF</h1>
        <p>${recipeCount} recipe${recipeCount === 1 ? "" : "s"} • Generated ${formatDate(generatedDate)}</p>
    </div>

    <div class="mp-pdf-actions" aria-label="Meal Pack PDF actions">
        <button id="printMealPack" class="button" disabled>Print PDF</button>
        <button id="downloadMealPack" class="button button-outline" disabled>Download PDF</button>
    </div>

    <p id="mealPackPdfStatus" class="mp-pdf-status" aria-live="polite">Building your custom Meal Pack PDF...</p>

    <div class="mp-pdf-frame-wrap">
        <iframe
            id="mealPackPdfFrame"
            class="mp-pdf-frame"
            title="Meal Pack PDF preview"
            loading="lazy"
            src="about:blank"></iframe>
    </div>

</section>

`;

}

async function renderMealPack() {

    const container = document.getElementById(MEALPACK_CONTAINER_ID);
    if (!container) return;

    container.innerHTML = buildMealPackMarkup();
    attachMealPackEvents();

    const result = await generateMealPackPDFDocument();
    if (!result) {
        setMealPackPDFStatus("Unable to generate PDF preview. Please try again.");
        return;
    }

    applyMealPackPDFToFrame(result.doc, result.filename);
    document.getElementById("printMealPack")?.removeAttribute("disabled");
    document.getElementById("downloadMealPack")?.removeAttribute("disabled");
    setMealPackPDFStatus("Preview ready.");

}

function setMealPackPDFStatus(message) {

    const status = document.getElementById("mealPackPdfStatus");
    if (status) {
        status.textContent = message;
    }

}

function applyMealPackPDFToFrame(doc, filename) {

    const frame = document.getElementById("mealPackPdfFrame");
    if (!frame) return;

    if (MEALPACK_PDF_STATE.url) {
        URL.revokeObjectURL(MEALPACK_PDF_STATE.url);
        MEALPACK_PDF_STATE.url = null;
    }

    MEALPACK_PDF_STATE.url = URL.createObjectURL(doc.output("blob"));
    MEALPACK_PDF_STATE.filename = filename;
    frame.src = `${MEALPACK_PDF_STATE.url}#view=FitH`;

}

function renderMealPackError() {

    const container = document.getElementById(MEALPACK_CONTAINER_ID);
    if (!container) return;

    container.innerHTML = `

<div class="mp-empty">

    <div class="mp-empty-card">

        <h1>Something went wrong</h1>

        <p>We were unable to build your Meal Pack. Please try again.</p>

        <a class="button" href="shopping-list.html">Back to Shopping List</a>

    </div>

</div>

`;

}

/* ============================================
   Meal Pack PDF
============================================ */

async function loadMealPackPDFImageAsDataURL(url) {

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

function drawMealPackPDFFrame(doc, assets, pageLabel, headerTitle = "MEAL PACK") {
    WillsGrillPDF.drawFrame(doc, assets, headerTitle, pageLabel);
}

function drawMealPackCoverPage(doc, data, assets) {

    drawMealPackPDFFrame(doc, assets, "", "MEAL PACK");
    const theme = WillsGrillPDF.theme;

    WillsGrillPDF.drawText(doc, "Meal Pack", 12, 42, 180, {
        fontSize: 24,
        lineHeight: 8,
        color: theme.text,
        fontStyle: "bold"
    });
    WillsGrillPDF.drawText(doc, "A complete plan with shopping list and selected recipes.", 12, 51, 220, {
        fontSize: 9,
        lineHeight: 3.8,
        color: theme.muted
    });

    WillsGrillPDF.drawRoundedImage(doc, assets.heroData, 12, 59, 190, 119, 5);
    WillsGrillPDF.drawCard(doc, 208, 59, 77, 119, { fill: theme.white, radius: 5 });

    const coverRows = [
        ["Date", formatDate(data.generatedDate)],
        ["Recipes", String(data.recipeCount)],
        ["Includes", "Shopping list\nand recipe cards"]
    ];
    coverRows.forEach(([label, value], index) => {
        const y = 77 + (index * 33);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.4);
        doc.setTextColor(...theme.gold);
        doc.text(label.toUpperCase(), 215, y);
        WillsGrillPDF.drawText(doc, value, 215, y + 7, 62, {
            fontSize: index === 1 ? 17 : 10,
            lineHeight: 4.4,
            color: theme.text,
            fontStyle: index === 1 ? "bold" : "normal"
        });
        if (index < coverRows.length - 1) {
            doc.setDrawColor(...theme.grey200);
            doc.setLineWidth(.25);
            doc.line(215, y + 18, 278, y + 18);
        }
    });

}

function drawMealPackContentsPage(doc, entries, assets, shoppingRangeLabel) {

    drawMealPackPDFFrame(doc, assets, "", "MEAL PACK");
    const theme = WillsGrillPDF.theme;

    WillsGrillPDF.drawText(doc, "Contents", 12, 42, 180, {
        fontSize: 20,
        lineHeight: 7,
        color: theme.text,
        fontStyle: "bold"
    });
    WillsGrillPDF.drawText(doc, "Jump directly to the shopping list or any selected recipe.", 12, 49, 220, {
        fontSize: 8.2,
        lineHeight: 3.4,
        color: theme.muted
    });

    const contentsRows = [
        {
            label: "Shopping List",
            pageLabel: shoppingRangeLabel,
            pageNumber: entries.shoppingFirstPage,
        },
        ...entries.recipes,
    ];

    const columnGap = 6;
    const columnWidth = (273 - columnGap) / 2;
    const rowsPerColumn = 13;

    contentsRows.forEach((row, index) => {
        const column = Math.floor(index / rowsPerColumn);
        const rowIndex = index % rowsPerColumn;
        const x = 12 + (column * (columnWidth + columnGap));
        const y = 56 + (rowIndex * 9.7);
        if (column > 1) return;

        WillsGrillPDF.drawCard(doc, x, y, columnWidth, 7.5, {
            fill: index === 0 ? theme.grey100 : theme.white,
            stroke: theme.grey200,
            radius: 2.5,
            lineWidth: .18
        });
        doc.setFont("helvetica", index === 0 ? "bold" : "normal");
        doc.setFontSize(8.2);
        doc.setTextColor(...theme.text);
        const labelLines = doc.splitTextToSize(row.label, columnWidth - 22);
        const label = labelLines[0].length < row.label.length ? `${labelLines[0].replace(/[.,;:]?$/, "")}...` : labelLines[0];
        doc.textWithLink(label, x + 4, y + 4.9, { pageNumber: row.pageNumber });
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...theme.muted);
        const pageLabel = String(row.pageLabel);
        doc.textWithLink(pageLabel, x + columnWidth - 4 - doc.getTextWidth(pageLabel), y + 4.9, {
            pageNumber: row.pageNumber
        });
    });

}

function drawMealPackShoppingSection(doc, items, assets) {
    const categories = {};

    items.forEach(item => {
        if (!categories[item.category]) {
            categories[item.category] = [];
        }
        categories[item.category].push(item);
    });

    const categoryBlocks = Object.keys(categories)
        .sort()
        .map(category => ({
            category,
            entries: categories[category]
                .map(item => formatIngredientRecord(item, item.quantity))
                .sort((a, b) => a.localeCompare(b))
        }));

    return WillsGrillPDF.drawShoppingPages(doc, categoryBlocks, {
        assets,
        useCurrentPage: false
    });

}

function drawMealPackRecipePage(doc, recipe, assets) {
    const quantity = parseInt(recipe.quantity || 1, 10);
    const scaledQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;

    const scaledIngredients = recipe.ingredients.map(item => ({
        ...item,
        quantity: item.quantity * scaledQuantity
    }));

    return WillsGrillPDF.drawRecipePages(doc, recipe, {
        assets,
        imageData: assets.recipeImages[recipe.image] || null,
        ingredientLines: formatSectionedIngredientLines(scaledIngredients),
        serves: recipe.serves * scaledQuantity
    });
}

async function generateMealPackPDFDocument() {

    const jsPDF = window.jspdf?.jsPDF;

    if (!jsPDF) {
        return null;
    }

    const data = getMealPackData();

    if (!data.selectedRecipes.length) {
        return null;
    }

    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
    });

    WillsGrillPDF.setDocumentProperties(doc, "Meal Pack | Will's Grill", "Selected recipes and combined shopping list");

    const assets = {
        logoData: null,
        heroData: null,
        recipeImages: {},
    };

    try {
        assets.logoData = await loadMealPackPDFImageAsDataURL("../assets/images/logo.webp?v=3");
    }
    catch (error) {
        console.warn("Meal Pack PDF logo could not be loaded.", error);
    }

    try {
        assets.heroData = await loadMealPackPDFImageAsDataURL("../assets/images/homepage-hero-image.webp");
    }
    catch (error) {
        console.warn("Meal Pack PDF hero image could not be loaded.", error);
    }

    await Promise.all(data.selectedRecipes.filter(recipe => recipe.image).map(async recipe => {
        try {
            assets.recipeImages[recipe.image] = await loadMealPackPDFImageAsDataURL(
                `../assets/images/recipes/${recipe.image}`
            );
        }
        catch (error) {
            console.warn(`Recipe image ${recipe.image} could not be loaded.`, error);
        }
    }));

    drawMealPackCoverPage(doc, data, assets);

    doc.addPage();

    const shoppingPages = drawMealPackShoppingSection(doc, data.ingredientItems, assets);

    const recipeEntries = [];

    data.selectedRecipes.forEach(recipe => {
        doc.addPage();
        const recipePages = drawMealPackRecipePage(doc, recipe, assets);

        recipeEntries.push({
            label: recipe.name,
            pageLabel: recipePages.firstPage === recipePages.lastPage
                ? String(recipePages.firstPage)
                : `${recipePages.firstPage}-${recipePages.lastPage}`,
            pageNumber: recipePages.firstPage,
        });
    });

    const shoppingRangeLabel = shoppingPages.firstPage === shoppingPages.lastPage
        ? String(shoppingPages.firstPage)
        : `${shoppingPages.firstPage}-${shoppingPages.lastPage}`;

    doc.setPage(2);
    drawMealPackContentsPage(
        doc,
        {
            shoppingFirstPage: shoppingPages.firstPage,
            recipes: recipeEntries,
        },
        assets,
        shoppingRangeLabel
    );

    WillsGrillPDF.addPageNumbers(doc);

    const filename = `meal-pack-${new Date().toISOString().slice(0, 10)}.pdf`;
    return { doc, filename };

}

function attachMealPackEvents() {

    const clearButton = document.getElementById("clearMealPack");
    if (clearButton) {
        clearButton.addEventListener("click", () => {
            if (!window.confirm("Clear every recipe from this Meal Pack?")) return;
            localStorage.removeItem(MEALPACK_STORAGE);
            if (MEALPACK_PDF_STATE.url) {
                URL.revokeObjectURL(MEALPACK_PDF_STATE.url);
                MEALPACK_PDF_STATE.url = null;
            }
            renderMealPack();
        });
    }

    const printButton = document.getElementById("printMealPack");
    if (printButton) {
        printButton.addEventListener("click", () => {
            const frame = document.getElementById("mealPackPdfFrame");
            frame?.contentWindow?.focus();
            frame?.contentWindow?.print();
        });
    }

    const downloadButton = document.getElementById("downloadMealPack");
    if (downloadButton) {
        downloadButton.addEventListener("click", () => {
            if (!MEALPACK_PDF_STATE.url) return;

            const link = document.createElement("a");
            link.href = MEALPACK_PDF_STATE.url;
            link.download = MEALPACK_PDF_STATE.filename || `meal-pack-${new Date().toISOString().slice(0, 10)}.pdf`;
            link.click();
        });
    }

}
