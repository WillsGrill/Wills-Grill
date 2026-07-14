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

        recipes = await response.json();

    }

    catch (error) {

        console.error(error);

        return;

    }

    if (document.getElementById("recipeList")) {

        renderRecipes(recipes);

        initialiseSearch();

    }

    if (document.getElementById("recipePage")) {

        renderRecipePage();

    }

}

/* ==================================================
   Browse Page
================================================== */

function renderRecipes(recipeArray) {

    const container = document.getElementById("recipeList");

    if (!container) return;

    container.innerHTML = "";

    recipeArray.forEach(recipe => {

        container.insertAdjacentHTML("beforeend", createRecipeCard(recipe));

    });

    if (typeof updateButtons === "function") {

        updateButtons();

    }

}

function createRecipeCard(recipe) {

    return `

<article class="recipe-card">

    <div class="recipe-image">

        <img
            src="../assets/images/recipes/${recipe.image}"
            alt="${recipe.name}"
            loading="lazy">

    </div>

    <div class="recipe-body">

        <h3>${recipe.name}</h3>

        <p>${recipe.description}</p>

        <div class="recipe-meta">

            <span>⏱ ${recipe.prepTime + recipe.cookTime} mins</span>

            <span>👥 ${recipe.serves}</span>

            <span>${recipe.difficulty}</span>

        </div>

        <div class="recipe-actions">

            <button
                class="button viewRecipe"
                data-id="${recipe.id}">

                View Recipe

            </button>

            <div class="recipe-quantity-control" data-id="${recipe.id}">

                <button
                    class="button button-outline addRecipe"
                    data-id="${recipe.id}"
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

    search.addEventListener("input", () => {

        const value = search.value.toLowerCase().trim();

        if (!value) {

            renderRecipes(recipes);

            return;

        }

        renderRecipes(

            recipes.filter(recipe =>

                recipe.name.toLowerCase().includes(value) ||

                recipe.description.toLowerCase().includes(value) ||

                recipe.category.toLowerCase().includes(value)

            )

        );

    });

}

/* ==================================================
   Recipe Page
================================================== */

function renderRecipePage() {

    const container = document.getElementById("recipePage");

    if (!container) return;

    const params = new URLSearchParams(window.location.search);

    const recipeID = params.get("id");

    const recipe = recipes.find(r => r.id === recipeID);

    if (!recipe) {

        container.innerHTML = `

<div class="panel">

<h2>Recipe not found</h2>

<p>The requested recipe could not be found.</p>

</div>

`;

        return;

    }

    const ingredientHTML = recipe.ingredients.map(item =>

        `<li>${formatIngredient(item)}</li>`

    ).join("");

    const methodHTML = recipe.steps.map((step, index) =>

        `

<div class="step">

<div class="step-number">${index + 1}</div>

<div>${step}</div>

</div>

`

    ).join("");

    container.innerHTML = `

<div class="recipe-hero">

<div class="recipe-summary">

<h2>${recipe.name}</h2>

<p>${recipe.description}</p>

<div class="recipe-badges">

<span class="badge">

⏱ ${recipe.prepTime + recipe.cookTime} mins

</span>

<span class="badge">

👥 Serves ${recipe.serves}

</span>

<span class="badge">

${recipe.difficulty}

</span>

</div>

<div class="recipe-actions">

<div class="recipe-quantity-control recipe-quantity-control-large" data-id="${recipe.id}">

<button
class="button addRecipe"
data-id="${recipe.id}"
data-quantity="1">

Add Recipe

</button>

</div>

<button
class="button button-outline printRecipe"
data-id="${recipe.id}">

Preview & Print PDF

</button>

</div>

</div>

<div class="recipe-hero-image">

<img
src="../assets/images/recipes/${recipe.image}"
alt="${recipe.name}">

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

<div class="method">

${methodHTML}

</div>

</section>

<div class="recipe-side">

<section class="panel recipe-nutrition">

<h3>Nutrition</h3>

<p><strong>Calories:</strong> ${recipe.nutrition.calories}</p>
<p><strong>Protein:</strong> ${recipe.nutrition.protein} g</p>
<p><strong>Carbs:</strong> ${recipe.nutrition.carbs} g</p>
<p><strong>Fat:</strong> ${recipe.nutrition.fat} g</p>

</section>

<section class="panel recipe-tip mt-4">

<h3>Chef's Tip</h3>

<p>${recipe.tip}</p>

</section>

</div>

</div>

</div>

`;

    if (typeof updateButtons === "function") {

        updateButtons();

    }

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

function recipePDFText(doc, text, x, y, width, options = {}) {

    const {
        fontSize = 9,
        lineHeight = 4.4,
        color = [17, 17, 17],
        fontStyle = "normal"
    } = options;

    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    doc.setFont("helvetica", fontStyle);

    const lines = doc.splitTextToSize(String(text), width);
    doc.text(lines, x, y);

    return y + (lines.length * lineHeight);

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

    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 10;
    const gold = [200, 162, 74];
    const black = [0, 0, 0];
    const muted = [79, 79, 79];
    const light = [245, 245, 245];

    doc.setFillColor(...black);
    doc.rect(0, 0, pageWidth, 23, "F");
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.8);
    doc.line(0, 23, pageWidth, 23);
    doc.rect(margin, 30, pageWidth - (margin * 2), pageHeight - 40);

    try {
        const logoData = await loadImageAsDataURL("../assets/images/logo.jpg");

        doc.addImage(logoData, "JPEG", margin, 2, 34, 19);
    }
    catch (error) {
        console.warn("Will's Grill logo was omitted from the PDF.", error);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...gold);
    doc.text("RECIPE CARD", pageWidth - margin, 12, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("Healthy food. Simple cooking.", pageWidth - margin, 17, { align: "right" });

    try {
        const imageData = await loadImageAsDataURL(
            `../assets/images/recipes/${recipe.image}`
        );

        doc.addImage(imageData, "JPEG", 16, 37, 51, 35);
    }
    catch (error) {
        console.warn("Recipe image was omitted from the PDF.", error);
        doc.setFillColor(...light);
        doc.rect(16, 37, 51, 35, "F");
    }

    const titleX = 76;
    let headerY = 43;

    headerY = recipePDFText(
        doc,
        recipe.name,
        titleX,
        headerY,
        190,
        { fontSize: 18, lineHeight: 7, color: black, fontStyle: "bold" }
    );

    headerY += 1.5;

    const descriptionEndY = recipePDFText(
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
    doc.text(`Serves ${recipe.serves}`, titleX + 53.5, badgeY + 5.2, { align: "center" });
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

    recipe.ingredients.forEach(item => {
        ingredientsY = recipePDFText(
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

        const totalHeight = methodEntries.reduce(
            (total, entry) => total + entry.height,
            0
        );
        const minimumGaps = Math.max(0, recipe.steps.length - 1) * 3;

        if (totalHeight + minimumGaps <= contentBottom - contentY - 7) {
            break;
        }

        methodFontSize -= 0.2;
        methodLineHeight -= 0.08;
    }
    while (methodFontSize >= 7.2);

    const totalMethodHeight = methodEntries.reduce(
        (total, entry) => total + entry.height,
        0
    );
    const availableMethodHeight = contentBottom - contentY - 7;
    const methodGap = recipe.steps.length > 1
        ? Math.max(
            3,
            (availableMethodHeight - totalMethodHeight) / (recipe.steps.length - 1)
        )
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
    recipePDFText(
        doc,
        recipe.tip,
        detailsX,
        detailsY + 6,
        57,
        { fontSize: 8.2, lineHeight: 3.8, color: muted }
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text("Will's Grill • Healthy food. Simple cooking.", 16, pageHeight - 15);

    const filename = recipe.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    openRecipePDFPreview(doc, `${filename}-recipe.pdf`);

}

function openRecipePDFPreview(doc, filename) {

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
    title.textContent = "Your one-page recipe PDF";
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
    frame.title = "Recipe PDF preview";
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

document.addEventListener("click", event => {

    const viewButton = event.target.closest(".viewRecipe");

    if (viewButton) {
        window.location.href = `recipe.html?id=${viewButton.dataset.id}`;
        return;
    }

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