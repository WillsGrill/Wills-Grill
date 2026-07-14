/*
==================================================
Will's Grill
shopping.js
==================================================
*/

"use strict";

const STORAGE_KEY = "willsGrillShopping";
const COMPLETED_ITEMS_KEY = "willsGrillCompletedShoppingItems";

/* ============================================
   Initialise
============================================ */

function initialiseShopping() {

    attachShoppingEvents();

    if (typeof generateShoppingList === "function") {
        generateShoppingList();
    }

}

/* ============================================
   Event Listeners
============================================ */

function attachShoppingEvents() {

    document.addEventListener("click", event => {

        const addButton = event.target.closest(".addRecipe");

        if (addButton) {
            const quantity = parseInt(addButton.dataset.quantity || "1", 10);
            toggleRecipe(addButton.dataset.id, quantity);
            return;
        }

        const stepperButton = event.target.closest(".quantity-stepper-btn");

        if (stepperButton) {
            const recipeID = stepperButton.dataset.id;
            const delta = parseInt(stepperButton.dataset.delta || "1", 10);
            updateRecipeQuantity(recipeID, delta);
            return;
        }

        const removeButton = event.target.closest(".removeRecipe");

        if (removeButton) {
            removeRecipeFromSelection(removeButton.dataset.id);
            return;
        }

        const printButton = event.target.closest("#printShopping");

        if (printButton) {
            window.print();
            return;
        }

        const mealPackButton = event.target.closest("#createMealPack");

        if (mealPackButton) {
            window.location.href = "mealpack.html";
            return;
        }

        const copyButton = event.target.closest("#copyShoppingList");

        if (copyButton) {
            copyShoppingListToClipboard();
            return;
        }

        const clearButton = event.target.closest("#clearShopping");

        if (clearButton) {
            clearShoppingSelection();
        }

    });

    document.addEventListener("change", event => {

        const checkbox = event.target.closest(".shopping-item-check");

        if (!checkbox) return;

        updateCompletedShoppingItem(
            checkbox.dataset.shoppingItem,
            checkbox.checked
        );

    });

}

function clearShoppingSelection() {

    const confirmed = window.confirm(
        "Clear all selected recipes and shopping-list tick marks?"
    );

    if (!confirmed) return;

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(COMPLETED_ITEMS_KEY);
    updateButtons();
    updateRecipeCounter();
    generateShoppingList();

}

/* ============================================
   Toggle Recipe
============================================ */

function toggleRecipe(recipeID, quantity = 1) {

    let selected = getSelectedRecipes();
    const existingIndex = selected.findIndex(item => item.id === recipeID);

    if (existingIndex >= 0) {

        const nextQuantity = selected[existingIndex].quantity + quantity;

        if (nextQuantity <= 0) {
            selected.splice(existingIndex, 1);
        } else {
            selected[existingIndex].quantity = nextQuantity;
        }

    } else {

        selected.push({ id: recipeID, quantity });

    }

    saveSelectedRecipes(selected);

    updateButtons();

    updateRecipeCounter();

    generateShoppingList();

}

function updateRecipeQuantity(recipeID, delta) {

    let selected = getSelectedRecipes();
    const existingIndex = selected.findIndex(item => item.id === recipeID);

    if (existingIndex < 0) return;

    const nextQuantity = selected[existingIndex].quantity + delta;

    if (nextQuantity <= 0) {
        selected.splice(existingIndex, 1);
    } else {
        selected[existingIndex].quantity = nextQuantity;
    }

    saveSelectedRecipes(selected);
    updateButtons();
    updateRecipeCounter();
    generateShoppingList();

}

function removeRecipeFromSelection(recipeID) {

    let selected = getSelectedRecipes();
    selected = selected.filter(item => item.id !== recipeID);

    saveSelectedRecipes(selected);
    updateButtons();
    updateRecipeCounter();
    generateShoppingList();

}

/* ============================================
   Local Storage
============================================ */

function saveSelectedRecipes(selected) {

    localStorage.setItem(

        STORAGE_KEY,

        JSON.stringify(selected)

    );

}

function getSelectedRecipes() {

    const data = localStorage.getItem(STORAGE_KEY);

    if (!data) return [];

    try {
        const parsed = JSON.parse(data);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map(item => {

                if (typeof item === "string") {
                    return { id: item, quantity: 1 };
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
        console.warn("Invalid shopping selection data, resetting storage.", error);
        localStorage.removeItem(STORAGE_KEY);
        return [];
    }

}

function getCompletedShoppingItems() {

    const data = localStorage.getItem(COMPLETED_ITEMS_KEY);

    if (!data) return new Set();

    try {
        const parsed = JSON.parse(data);

        return new Set(
            Array.isArray(parsed)
                ? parsed.map(item => String(item))
                : []
        );
    }
    catch (error) {
        console.warn("Invalid completed shopping-item data, resetting storage.", error);
        localStorage.removeItem(COMPLETED_ITEMS_KEY);
        return new Set();
    }

}

function updateCompletedShoppingItem(itemID, completed) {

    if (!itemID) return;

    const completedItems = getCompletedShoppingItems();
    const normalizedID = String(itemID);

    if (completed) {
        completedItems.add(normalizedID);
    }
    else {
        completedItems.delete(normalizedID);
    }

    localStorage.setItem(
        COMPLETED_ITEMS_KEY,
        JSON.stringify([...completedItems])
    );

}

/* ============================================
   Update Buttons
============================================ */

function updateButtons() {

    const selected = getSelectedRecipes();

    document.querySelectorAll(".recipe-quantity-control").forEach(control => {

        const recipeID = control.dataset.id;
        const selection = selected.find(item => item.id === recipeID);
        const added = Boolean(selection);

        if (!added) {
            control.innerHTML = `
                <button
                    class="button button-outline addRecipe"
                    data-id="${recipeID}"
                    data-quantity="1">
                    Add Recipe
                </button>
            `;
            return;
        }

        control.innerHTML = `
            <button
                class="button button-outline quantity-stepper-btn"
                data-id="${recipeID}"
                data-delta="-1">
                −
            </button>
            <span class="quantity-value">${selection.quantity}</span>
            <button
                class="button button-outline quantity-stepper-btn"
                data-id="${recipeID}"
                data-delta="1">
                +
            </button>
            <button
                class="button removeRecipe"
                data-id="${recipeID}">
                🗑
            </button>
        `;

    });

}

/* ============================================
   Counter
============================================ */

function updateRecipeCounter() {

    const counter = document.getElementById(

        "selectedRecipeCount"

    );

    const names = document.getElementById(

        "selectedRecipeNames"

    );

    const selected = getSelectedRecipes();
    const totalCount = selected.reduce((total, item) => total + item.quantity, 0);

    if (counter) {
        counter.textContent = totalCount;
    }

    if (!names) return;

    if (!selected.length) {
        names.textContent = "No recipes selected.";
        return;
    }

    const recipeSummary = selected.map(item => {

        const recipe = Array.isArray(recipes)
            ? recipes.find(r => String(r.id).trim() === String(item.id).trim())
            : null;

        const recipeName = recipe?.name || item.id;

        return item.quantity > 1 ? `${recipeName} ×${item.quantity}` : recipeName;

    });

    names.textContent = recipeSummary.join(", ");

}

function getShoppingIngredientsForRecipes(selections) {

    const selectedItems = Array.isArray(selections)
        ? selections
        : [];

    const shopping = {};

    selectedItems.forEach(selection => {

        let recipeID = "";
        let quantity = 1;

        if (typeof selection === "string") {
            recipeID = String(selection).trim();
        }

        else if (selection && typeof selection === "object") {
            recipeID = String(selection.id || "").trim();
            quantity = parseInt(selection.quantity || 1, 10);
            if (!Number.isFinite(quantity) || quantity <= 0) {
                quantity = 1;
            }
        }

        if (!recipeID) return;

        const recipe = recipes.find(

            r => String(r.id).trim() === recipeID

        );

        if (!recipe) return;

        recipe.ingredients.forEach(item => {

            const ingredient = ingredientFromID(

                item.ingredient

            );

            if (!ingredient) return;

            const key = ingredient.id;

            if (!shopping[key]) {

                shopping[key] = {

                    ...ingredient,

                    quantity: 0

                };

            }

            shopping[key].quantity += item.quantity * quantity;

        });

    });

    return Object.values(shopping);

}

function copyShoppingListToClipboard() {

    const container = document.getElementById("shoppingList");

    if (!container) return;

    const lines = [];

    container.querySelectorAll(".shopping-category").forEach(category => {

        const heading = category.querySelector("h3");

        if (heading && heading.textContent.trim()) {
            lines.push(heading.textContent.trim());
        }

        category.querySelectorAll(".shopping-items li").forEach(item => {

            const text = item.textContent.replace(/\s+/g, " ").trim();

            if (text) {
                lines.push(text);
            }

        });

        lines.push("");

    });

    const text = lines.join("\n").trim();

    if (!text) return;

    const button = document.getElementById("copyShoppingList");

    const updateButtonLabel = label => {
        if (button) {
            button.textContent = label;
        }
    };

    const resetButtonLabel = () => {
        if (button) {
            button.textContent = "Copy Shopping List";
        }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {

        navigator.clipboard.writeText(text)
            .then(() => {
                updateButtonLabel("Copied!");
                window.setTimeout(resetButtonLabel, 1500);
            })
            .catch(() => {
                fallbackCopyShoppingList(text, updateButtonLabel, resetButtonLabel);
            });

        return;

    }

    fallbackCopyShoppingList(text, updateButtonLabel, resetButtonLabel);

}

function fallbackCopyShoppingList(text, updateButtonLabel, resetButtonLabel) {

    const tempTextArea = document.createElement("textarea");
    tempTextArea.value = text;
    tempTextArea.setAttribute("readonly", "");
    tempTextArea.style.position = "fixed";
    tempTextArea.style.left = "-9999px";
    document.body.appendChild(tempTextArea);
    tempTextArea.select();

    try {
        document.execCommand("copy");
        updateButtonLabel("Copied!");
    }
    catch (error) {
        updateButtonLabel("Copy failed");
        console.warn("Unable to copy shopping list.", error);
    }

    document.body.removeChild(tempTextArea);
    window.setTimeout(resetButtonLabel, 1500);

}

function buildShoppingListHTML(items) {

    const categories = {};
    const completedItems = getCompletedShoppingItems();

    items.forEach(item => {

        if (!categories[item.category]) {

            categories[item.category] = [];

        }

        categories[item.category].push(item);

    });

    return Object.keys(categories).sort().map(category => `

<div class="shopping-category">

<h3>${category}</h3>

<ul class="shopping-items">

${categories[category].map(item => `

<li>

<label>

<input
    class="shopping-item-check"
    type="checkbox"
    data-shopping-item="${item.id}"
    ${completedItems.has(String(item.id)) ? "checked" : ""}>

${item.quantity} ${item.unit} ${item.name}

</label>

</li>

`).join('')}

</ul>

</div>

`).join('');

}

/* ============================================
   Shopping List
============================================ */

function generateShoppingList() {

    const shoppingPage = document.getElementById(

        "shoppingList"

    );

    if (!shoppingPage) return;

    const selected = getSelectedRecipes();

    if (!selected.length) {

        shoppingPage.innerHTML = `

<div class="panel">

<p>No recipes have been selected yet.</p>

</div>

`;

        return;

    }

    let shopping = {};
    let missingRecipes = [];

    selected.forEach(selection => {

        const recipeID = selection && selection.id
            ? String(selection.id).trim()
            : "";

        const quantity = parseInt(selection.quantity || 1, 10);

        const recipe = recipes.find(

            r => String(r.id).trim() === recipeID

        );

        if (!recipe) {
            missingRecipes.push(recipeID);
            return;
        }

        recipe.ingredients.forEach(item => {

            const ingredient = ingredientFromID(

                item.ingredient

            );

            if (!ingredient) return;

            const key = ingredient.id;

            if (!shopping[key]) {

                shopping[key] = {

                    ...ingredient,

                    quantity:0

                };

            }

            shopping[key].quantity += item.quantity * quantity;

        });

    });

    const items = Object.values(shopping);

    if (!items.length) {

        shoppingPage.innerHTML = `

<div class="panel">

<p>Selected recipes did not return any shopping ingredients.</p>

${missingRecipes.length ? `<p>Missing recipes: ${missingRecipes.join(", ")}</p>` : ""}

</div>

`;

        return;

    }

    renderShoppingList(items);

}

/* ============================================
   Render Shopping List
============================================ */

function renderShoppingList(items){

    const container = document.getElementById(

        "shoppingList"

    );

    if(!container) return;

    container.innerHTML = buildShoppingListHTML(items);

}

/* ============================================
   Refresh Shopping Page
============================================ */

document.addEventListener(

    "DOMContentLoaded",

    ()=>{

        if (typeof generateShoppingList === "function") {
            generateShoppingList();
        }

    }

);