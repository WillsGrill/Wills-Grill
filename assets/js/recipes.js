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

<div class="recipe-hero-image">

<img
src="../assets/images/recipes/${recipe.image}"
alt="${recipe.name}">

</div>

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

Download One-Page PDF

</button>

</div>

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
        throw new Error("Unable to load recipe image.");
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
    const margin = 12;
    const gold = [200, 162, 74];
    const black = [17, 17, 17];
    const muted = [79, 79, 79];

    doc.setFillColor(...black);
    doc.rect(0, 0, pageWidth, 8, "F");
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.8);
    doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2));

    try {
        const imageData = await loadImageAsDataURL(
            `../assets/images/recipes/${recipe.image}`
        );

        doc.addImage(imageData, "JPEG", margin + 4, margin + 4, 52, 39);
    }
    catch (error) {
        console.warn("Recipe image was omitted from the PDF.", error);
        doc.setFillColor(245, 245, 245);
        doc.rect(margin + 4, margin + 4, 52, 39, "F");
    }

    const titleX = margin + 62;
    let headerY = margin + 10;

    headerY = recipePDFText(
        doc,
        recipe.name,
        titleX,
        headerY,
        200,
        { fontSize: 18, lineHeight: 7, color: black, fontStyle: "bold" }
    );

    headerY += 2;

    recipePDFText(
        doc,
        recipe.description,
        titleX,
        headerY,
        200,
        { fontSize: 9, lineHeight: 4, color: muted }
    );

    const badgeY = margin + 42;
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(titleX, badgeY, 34, 8, 3, 3, "F");
    doc.roundedRect(titleX + 38, badgeY, 31, 8, 3, 3, "F");
    doc.roundedRect(titleX + 73, badgeY, 24, 8, 3, 3, "F");
    doc.setTextColor(...black);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(`${recipe.prepTime + recipe.cookTime} mins`, titleX + 17, badgeY + 5.2, { align: "center" });
    doc.text(`Serves ${recipe.serves}`, titleX + 53.5, badgeY + 5.2, { align: "center" });
    doc.text(recipe.difficulty, titleX + 85, badgeY + 5.2, { align: "center" });

    const contentY = 68;
    const contentBottom = pageHeight - margin - 6;
    const ingredientsX = margin + 4;
    const methodX = 91;
    const detailsX = 224;

    doc.setDrawColor(...gold);
    doc.setLineWidth(0.45);
    doc.line(margin + 4, 60, pageWidth - margin - 4, 60);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...black);
    doc.text("INGREDIENTS", ingredientsX, contentY);
    doc.text("METHOD", methodX, contentY);
    doc.text("NUTRITION", detailsX, contentY);

    doc.setDrawColor(222, 222, 222);
    doc.setLineWidth(0.25);
    doc.line(84, contentY - 4, 84, contentBottom);
    doc.line(217, contentY - 4, 217, contentBottom);

    let ingredientsY = contentY + 7;

    recipe.ingredients.forEach(item => {
        ingredientsY = recipePDFText(
            doc,
            `• ${formatIngredient(item)}`,
            ingredientsX,
            ingredientsY,
            62,
            { fontSize: 8.2, lineHeight: 3.8, color: muted }
        ) + 1.1;
    });

    let methodY = contentY + 7;

    recipe.steps.forEach((step, index) => {
        doc.setFillColor(...black);
        doc.circle(methodX + 3, methodY - 1.2, 3, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.text(String(index + 1), methodX + 3, methodY + 0.9, { align: "center" });

        const nextY = recipePDFText(
            doc,
            step,
            methodX + 9,
            methodY,
            116,
            { fontSize: 8.2, lineHeight: 3.8, color: muted }
        );

        methodY = nextY + 2;
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
    doc.line(detailsX, detailsY, pageWidth - margin - 4, detailsY);
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
        54,
        { fontSize: 8.2, lineHeight: 3.8, color: muted }
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text("Will's Grill • Healthy food. Simple cooking.", margin + 4, pageHeight - margin - 3);

    const filename = recipe.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    doc.save(`${filename}-recipe.pdf`);

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