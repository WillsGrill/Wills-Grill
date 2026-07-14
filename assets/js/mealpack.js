/*
==================================================
Will's Grill
mealpack.js
==================================================
*/

"use strict";

const MEALPACK_CONTAINER_ID = "mealpack";
const MEALPACK_STORAGE = "willsGrillShopping";

const PAGE_BREAK_CLASS = "mealpack-page-break";

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

        renderMealPack();

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

                <span>${row.label}</span>

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

    const ingredientHTML = recipe.ingredients.map(item => {
        const scaledItem = {
            ...item,
            quantity: item.quantity * scaledQuantity
        };
        const text = formatIngredient(scaledItem);
        return `<li>${text}</li>`;
    }).join("");

    const methodHTML = recipe.steps.map((step, index) => `

        <li>
            <span class="mp-step-number">${index + 1}</span>
            <span>${step}</span>
        </li>

    `).join("");

    return `

<section class="mp-page mp-recipe">

    <div class="mp-card mp-recipe-layout">

        <div class="mp-recipe-header">
            <div class="mp-recipe-image">
                <img src="../assets/images/recipes/${recipe.image}" alt="${recipe.name}">
            </div>

            <div class="mp-recipe-summary">
                <h2>${recipe.name}</h2>
                <p>${recipe.description}</p>

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
                <h3>Nutrition</h3>
                <p><strong>Calories:</strong> ${recipe.nutrition.calories}</p>
                <p><strong>Protein:</strong> ${recipe.nutrition.protein} g</p>
                <p><strong>Carbs:</strong> ${recipe.nutrition.carbs} g</p>
                <p><strong>Fat:</strong> ${recipe.nutrition.fat} g</p>

                <div class="mp-tip-panel">
                    <h3>Chef's Tip</h3>
                    <p>${recipe.tip}</p>
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
    <button id="printMealPack" class="button">Preview & Print PDF</button>
    <a class="button button-outline" href="shopping-list.html">Back to Shopping List</a>
</div>

<section class="mp-page mp-cover-page">

    <div class="mp-cover-panel">

        <div class="mp-branding">
            <img src="../assets/images/logo.jpg" alt="Will's Grill" class="mp-logo-image">
            <p class="mp-tagline">Healthy food. Simple cooking.</p>
            <h1>Meal Pack</h1>
        </div>

        <div class="mp-cover-hero-image">
            <img src="../assets/images/homepage-hero-image.jpg" alt="Will's Grill hero image">
        </div>

        <div class="mp-cover-meta">
            <p><strong>Date</strong></p>
            <p>${formatDate(generatedDate)}</p>
            <p><strong>Recipes</strong></p>
            <p>${recipeCount}</p>
            <p><strong>Includes</strong></p>
            <p>Shopping List</p>
        </div>

    </div>

</section>

${buildContentsPage(selectedRecipes, ingredientItems)}

${buildShoppingPages(ingredientItems)}

${selectedRecipes.map(buildRecipePage).join("")}

`;

}

function renderMealPack() {

    const container = document.getElementById(MEALPACK_CONTAINER_ID);
    if (!container) return;

    container.innerHTML = buildMealPackMarkup();
    attachMealPackEvents();

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

function mealPackPDFText(doc, text, x, y, width, options = {}) {

    const {
        fontSize = 9,
        lineHeight = 4.1,
        color = [79, 79, 79],
        fontStyle = "normal"
    } = options;

    doc.setFont("helvetica", fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);

    const lines = doc.splitTextToSize(String(text), width);
    doc.text(lines, x, y);

    return y + (lines.length * lineHeight);

}

function openMealPackPDFPreview(doc, filename) {

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
    dialog.className = "pdf-preview-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "mealPackPdfPreviewTitle");
    toolbar.className = "pdf-preview-toolbar";
    title.id = "mealPackPdfPreviewTitle";
    title.textContent = "Your meal-pack PDF";
    actions.className = "pdf-preview-actions";
    printButton.className = "button";
    printButton.textContent = "Print PDF";
    downloadButton.className = "button button-outline";
    downloadButton.textContent = "Download PDF";
    closeButton.className = "pdf-preview-close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close PDF preview");
    closeButton.textContent = "×";
    frame.className = "pdf-preview-frame";
    frame.title = "Meal-pack PDF preview";
    frame.src = `${pdfURL}#view=FitH`;

    const handleKeydown = event => {
        if (event.key === "Escape" && document.body.contains(overlay)) {
            closePreview();
        }
    };

    const closePreview = () => {
        frame.src = "about:blank";
        overlay.remove();
        document.removeEventListener("keydown", handleKeydown);
        URL.revokeObjectURL(pdfURL);
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

function drawMealPackPDFFrame(doc, assets, pageLabel, headerTitle = "MEAL PACK") {

    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 10;
    const black = [0, 0, 0];
    const gold = [200, 162, 74];
    const muted = [79, 79, 79];

    doc.setFillColor(...black);
    doc.rect(0, 0, pageWidth, 23, "F");
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.8);
    doc.line(0, 23, pageWidth, 23);
    doc.rect(margin, 30, pageWidth - (margin * 2), pageHeight - 40);

    if (assets.logoData) {
        doc.addImage(assets.logoData, "JPEG", margin, 2, 34, 19);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...gold);
    doc.text(headerTitle, pageWidth - margin, 12, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("Healthy food. Simple cooking.", pageWidth - margin, 17, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.4);
    doc.setTextColor(...muted);
    doc.text("Will's Grill • Healthy food. Simple cooking.", 16, 192);
    doc.text(pageLabel, pageWidth / 2, 192, { align: "center" });

}

function drawMealPackCoverPage(doc, data, assets) {

    drawMealPackPDFFrame(doc, assets, "", "MEAL PACK");

    const black = [0, 0, 0];
    const muted = [79, 79, 79];
    const gold = [200, 162, 74];
    const light = [245, 245, 245];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(25);
    doc.setTextColor(...black);
    doc.text("Meal Pack", 16, 54);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...muted);
    doc.text("A complete plan with shopping list and selected recipes.", 16, 62);

    if (assets.heroData) {
        doc.addImage(assets.heroData, "JPEG", 16, 69, 188, 98);
    }
    else {
        doc.setFillColor(...light);
        doc.rect(16, 69, 188, 98, "F");
    }

    doc.setFillColor(...light);
    doc.roundedRect(214, 69, 67, 98, 4, 4, "F");
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.35);
    doc.line(214, 95, 281, 95);
    doc.line(214, 122, 281, 122);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(...black);
    doc.text("DATE", 219, 84);
    doc.text("RECIPES", 219, 111);
    doc.text("INCLUDES", 219, 138);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...muted);
    doc.text(formatDate(data.generatedDate), 219, 90);
    doc.text(String(data.recipeCount), 219, 117);
    doc.text("Shopping List", 219, 144);
    doc.text("Recipe Cards", 219, 150);

}

function drawMealPackContentsPage(doc, entries, assets, shoppingRangeLabel) {

    drawMealPackPDFFrame(doc, assets, "", "MEAL PACK");

    const black = [0, 0, 0];
    const muted = [79, 79, 79];
    const light = [245, 245, 245];
    const gold = [200, 162, 74];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...black);
    doc.text("Contents", 16, 55);

    doc.setFillColor(...light);
    doc.roundedRect(16, 61, 265, 121, 4, 4, "F");

    doc.setDrawColor(...gold);
    doc.setLineWidth(0.5);
    doc.line(20, 71, 277, 71);

    const contentsRows = [
        {
            label: "Shopping List",
            pageLabel: shoppingRangeLabel,
            pageNumber: entries.shoppingFirstPage,
        },
        ...entries.recipes,
    ];

    let rowY = 79;

    contentsRows.forEach(row => {
        if (rowY > 176) return;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.8);
        doc.setTextColor(...black);

        doc.textWithLink(row.label, 21, rowY, {
            pageNumber: row.pageNumber
        });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.2);
        doc.setTextColor(...muted);

        const pageLabel = String(row.pageLabel);
        const pageLabelWidth = doc.getTextWidth(pageLabel);
        doc.textWithLink(pageLabel, 277 - pageLabelWidth, rowY, {
            pageNumber: row.pageNumber,
        });

        rowY += 6;
    });

}

function drawMealPackShoppingSection(doc, items, assets) {

    const pageWidth = 297;
    const black = [0, 0, 0];
    const muted = [79, 79, 79];
    const light = [245, 245, 245];
    const contentTop = 47;
    const contentBottom = 186;
    const columnGap = 7;
    const columns = 4;
    const contentLeft = 16;
    const contentRight = pageWidth - 16;
    const columnWidth = (contentRight - contentLeft - (columnGap * (columns - 1))) / columns;

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
                .map(item => `${item.quantity} ${item.unit} ${item.name}`)
                .sort((a, b) => a.localeCompare(b))
        }));

    let currentColumn = 0;
    let currentY = contentTop;
    let firstPage = null;
    let lastPage = null;

    const startNewShoppingPage = () => {
        doc.addPage();
        const pageNumber = doc.getNumberOfPages();

        drawMealPackPDFFrame(doc, assets, "", "SHOPPING LIST");

        doc.setDrawColor(222, 222, 222);
        doc.setLineWidth(0.25);
        for (let columnIndex = 1; columnIndex < columns; columnIndex += 1) {
            const separatorX = contentLeft + (columnIndex * (columnWidth + columnGap)) - (columnGap / 2);
            doc.line(separatorX, contentTop - 2, separatorX, contentBottom);
        }

        doc.setDrawColor(200, 162, 74);
        doc.setLineWidth(0.35);
        doc.line(contentLeft, contentTop - 8, contentRight, contentTop - 8);

        currentColumn = 0;
        currentY = contentTop;

        if (!firstPage) {
            firstPage = pageNumber;
        }
        lastPage = pageNumber;
    };

    const categoryHeadingHeight = 6;
    const itemSpacing = 1.8;
    const checkboxSize = 2.7;
    const checkboxTextGap = 1.8;
    const entryXPadding = 1.6;
    const textWidth = columnWidth - (entryXPadding * 2) - checkboxSize - checkboxTextGap;

    const moveToNextColumnOrPage = () => {
        if (currentColumn < columns - 1) {
            currentColumn += 1;
            currentY = contentTop;
            return;
        }

        startNewShoppingPage();
    };

    const drawCategoryHeading = category => {
        const x = contentLeft + (currentColumn * (columnWidth + columnGap));

        doc.setFillColor(...light);
        doc.roundedRect(x, currentY - 4, columnWidth, categoryHeadingHeight, 1.5, 1.5, "F");
        doc.setTextColor(...black);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.4);
        doc.text(category.toUpperCase(), x + 1.8, currentY);
        currentY += 5;
    };

    startNewShoppingPage();

    categoryBlocks.forEach(block => {
        const firstEntry = block.entries[0] || "";
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.1);
        const firstLines = doc.splitTextToSize(firstEntry, textWidth);
        const minimumBlockHeight =
            categoryHeadingHeight +
            (Math.max(1, firstLines.length) * 3.9) +
            itemSpacing +
            2;

        if (currentY + minimumBlockHeight > contentBottom) {
            moveToNextColumnOrPage();
        }

        drawCategoryHeading(block.category);

        block.entries.forEach((entry, entryIndex) => {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.1);
            const lines = doc.splitTextToSize(entry, textWidth);
            const entryHeight = (lines.length * 3.9) + itemSpacing;

            if (currentY + entryHeight > contentBottom) {
                moveToNextColumnOrPage();
                drawCategoryHeading(block.category);
            }

            const x = contentLeft + (currentColumn * (columnWidth + columnGap));
            const checkboxX = x + entryXPadding;
            const checkboxY = currentY - 2.3;

            doc.setDrawColor(155, 155, 155);
            doc.setLineWidth(0.25);
            doc.rect(checkboxX, checkboxY, checkboxSize, checkboxSize);

            doc.setTextColor(...muted);
            doc.text(lines, checkboxX + checkboxSize + checkboxTextGap, currentY);
            currentY += entryHeight;

            if (entryIndex === block.entries.length - 1) {
                currentY += 2;
            }
        });
    });

    return {
        firstPage,
        lastPage,
    };

}

function drawMealPackRecipePage(doc, recipe, assets) {

    const pageWidth = 297;
    const margin = 10;
    const gold = [200, 162, 74];
    const black = [0, 0, 0];
    const muted = [79, 79, 79];
    const light = [245, 245, 245];

    const quantity = parseInt(recipe.quantity || 1, 10);
    const scaledQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;

    const scaledIngredients = recipe.ingredients.map(item => ({
        ...item,
        quantity: item.quantity * scaledQuantity
    }));

    drawMealPackPDFFrame(doc, assets, "", "RECIPE CARD");

    if (assets.recipeImages[recipe.image]) {
        doc.addImage(assets.recipeImages[recipe.image], "JPEG", 16, 37, 51, 35);
    }
    else {
        doc.setFillColor(...light);
        doc.rect(16, 37, 51, 35, "F");
    }

    const titleX = 76;
    let headerY = 43;

    headerY = mealPackPDFText(
        doc,
        recipe.name,
        titleX,
        headerY,
        190,
        { fontSize: 18, lineHeight: 7, color: black, fontStyle: "bold" }
    );

    headerY += 1.5;

    const descriptionEndY = mealPackPDFText(
        doc,
        recipe.description,
        titleX,
        headerY,
        190,
        { fontSize: 8.6, lineHeight: 3.8, color: muted }
    );

    const badgeY = Math.max(descriptionEndY + 2, 65);
    doc.setFillColor(...light);
    doc.roundedRect(titleX, badgeY, 34, 8, 3, 3, "F");
    doc.roundedRect(titleX + 38, badgeY, 31, 8, 3, 3, "F");
    doc.roundedRect(titleX + 73, badgeY, 27, 8, 3, 3, "F");
    doc.setTextColor(...black);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(`${recipe.prepTime + recipe.cookTime} mins`, titleX + 17, badgeY + 5.2, { align: "center" });
    doc.text(`Serves ${recipe.serves * scaledQuantity}`, titleX + 53.5, badgeY + 5.2, { align: "center" });
    doc.text(recipe.difficulty, titleX + 86.5, badgeY + 5.2, { align: "center" });

    const contentY = Math.max(badgeY + 18, 88);
    const contentBottom = 188;
    const ingredientsX = 16;
    const methodX = 88;
    const detailsX = 216;

    doc.setDrawColor(...gold);
    doc.setLineWidth(0.45);
    doc.line(16, contentY - 9, pageWidth - 16, contentY - 9);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...black);
    doc.text("INGREDIENTS", ingredientsX, contentY);
    doc.text("METHOD", methodX, contentY);
    doc.text("NUTRITION", detailsX, contentY);

    doc.setDrawColor(222, 222, 222);
    doc.setLineWidth(0.25);
    doc.line(80, contentY - 4, 80, contentBottom);
    doc.line(209, contentY - 4, 209, contentBottom);

    let ingredientsY = contentY + 7;

    scaledIngredients.forEach(item => {
        ingredientsY = mealPackPDFText(
            doc,
            `• ${formatIngredient(item)}`,
            ingredientsX,
            ingredientsY,
            57,
            { fontSize: 8.1, lineHeight: 3.75, color: muted }
        ) + 1.2;
    });

    let methodFontSize = 8.4;
    let methodLineHeight = 4.1;
    let methodEntries;

    do {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(methodFontSize);

        methodEntries = recipe.steps.map(step => {
            const lines = doc.splitTextToSize(step, 112);
            return {
                lines,
                height: Math.max(7, lines.length * methodLineHeight)
            };
        });

        const totalHeight = methodEntries.reduce((total, entry) => total + entry.height, 0);
        const minimumGaps = Math.max(0, recipe.steps.length - 1) * 3;

        if (totalHeight + minimumGaps <= contentBottom - contentY - 7) {
            break;
        }

        methodFontSize -= 0.2;
        methodLineHeight -= 0.08;
    }
    while (methodFontSize >= 7.2);

    const totalMethodHeight = methodEntries.reduce((total, entry) => total + entry.height, 0);
    const availableMethodHeight = contentBottom - contentY - 7;
    const methodGap = recipe.steps.length > 1
        ? Math.max(3, (availableMethodHeight - totalMethodHeight) / (recipe.steps.length - 1))
        : 0;

    let methodY = contentY + 7;

    methodEntries.forEach((entry, index) => {
        doc.setFillColor(...black);
        doc.circle(methodX + 3.5, methodY - 1.2, 3.5, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.8);
        doc.text(String(index + 1), methodX + 3.5, methodY - 1.2, {
            align: "center",
            baseline: "middle"
        });

        doc.setTextColor(...muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(methodFontSize);
        doc.text(entry.lines, methodX + 11, methodY);

        methodY += entry.height + methodGap;
    });

    let detailsY = contentY + 7;

    [
        ["Calories", recipe.nutrition.calories],
        ["Protein", `${recipe.nutrition.protein} g`],
        ["Carbs", `${recipe.nutrition.carbs} g`],
        ["Fat", `${recipe.nutrition.fat} g`]
    ].forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.2);
        doc.setTextColor(...black);
        doc.text(`${label}:`, detailsX, detailsY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...muted);
        doc.text(String(value), detailsX + 24, detailsY);
        detailsY += 5.2;
    });

    detailsY += 6;
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.35);
    doc.line(detailsX, detailsY, pageWidth - 16, detailsY);
    detailsY += 7;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...black);
    doc.text("CHEF'S TIP", detailsX, detailsY);
    mealPackPDFText(
        doc,
        recipe.tip,
        detailsX,
        detailsY + 6,
        57,
        { fontSize: 8.2, lineHeight: 3.8, color: muted }
    );

}

async function generateMealPackPDF() {

    const jsPDF = window.jspdf?.jsPDF;

    if (!jsPDF) {
        window.print();
        return;
    }

    const data = getMealPackData();

    if (!data.selectedRecipes.length) {
        return;
    }

    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
    });

    const assets = {
        logoData: null,
        heroData: null,
        recipeImages: {},
    };

    try {
        assets.logoData = await loadMealPackPDFImageAsDataURL("../assets/images/logo.jpg");
    }
    catch (error) {
        console.warn("Meal Pack PDF logo could not be loaded.", error);
    }

    try {
        assets.heroData = await loadMealPackPDFImageAsDataURL("../assets/images/homepage-hero-image.jpg");
    }
    catch (error) {
        console.warn("Meal Pack PDF hero image could not be loaded.", error);
    }

    await Promise.all(data.selectedRecipes.map(async recipe => {
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
        const recipePage = doc.getNumberOfPages();
        drawMealPackRecipePage(doc, recipe, assets);

        recipeEntries.push({
            label: recipe.name,
            pageLabel: String(recipePage),
            pageNumber: recipePage,
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

    const totalPages = doc.getNumberOfPages();

    for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.4);
        doc.setTextColor(79, 79, 79);
        doc.text(`Page ${page} of ${totalPages}`, 148.5, 192, {
            align: "center"
        });
    }

    const filename = `meal-pack-${new Date().toISOString().slice(0, 10)}.pdf`;
    openMealPackPDFPreview(doc, filename);

}

function attachMealPackEvents() {

    const clearButton = document.getElementById("clearMealPack");
    if (clearButton) {
        clearButton.addEventListener("click", () => {
            localStorage.removeItem(MEALPACK_STORAGE);
            renderMealPack();
        });
    }

    const printButton = document.getElementById("printMealPack");
    if (printButton) {
        printButton.addEventListener("click", () => {
            generateMealPackPDF();
        });
    }

}
