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

        <div class="mp-card mp-tip-panel">
            <h3>Chef's Tip</h3>
            <p>${recipe.tip}</p>
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
    <button id="printMealPack" class="button">Print Meal Pack</button>
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
        printButton.addEventListener("click", () => window.print());
    }

}
