/*
==================================================
Will's Grill
ui.js
==================================================
*/

"use strict";

let ingredients = [];

/* ==================================================
   Initialise
================================================== */

async function initialiseUI() {

    await loadIngredients();

}

/* ==================================================
   Load Ingredient Database
================================================== */

async function loadIngredients() {

    try {

        const response = await fetch(PATHS.ingredients);

        if (!response.ok) {

            throw new Error("Unable to load ingredients.");

        }

        ingredients = await response.json();

        const params = new URLSearchParams(window.location.search);
        if (params.get("preview") === "recipemanager") {
            try {
                const preview = JSON.parse(localStorage.getItem("willsgrill-recipe-preview-v1"));
                if (Array.isArray(preview?.ingredients)) ingredients = preview.ingredients;
            }
            catch (error) {
                console.error("Unable to load preview ingredients.", error);
            }
        }

    }

    catch (error) {

        console.error(error);
        throw error;
    }

}

/* ==================================================
   Ingredient Lookup
================================================== */

function ingredientFromID(id) {

    return ingredients.find(

        ingredient => ingredient.id === id

    );

}

/* ==================================================
   Ingredient Formatter
================================================== */

function formatIngredient(item) {

    const ingredient = ingredientFromID(

        item.ingredient

    );

    if (!ingredient) return `${formatQuantity(item.quantity)} × ${item.ingredient}`;
    return formatIngredientRecord(ingredient, item.quantity);

}

function formatQuantity(value) {
    const quantity = Number(value);
    if (!Number.isFinite(quantity)) return String(value ?? "");
    if (Number.isInteger(quantity)) return String(quantity);
    return quantity.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatIngredientRecord(ingredient, quantity) {
    const amount = formatQuantity(quantity);
    const numericAmount = Number(quantity);
    const unit = String(ingredient?.unit || "").trim();
    const name = String(ingredient?.name || ingredient?.id || "Ingredient").trim();
    if (!unit || unit === "each") return `${amount} ${name}`.trim();
    const unitForms = unit === "leaf" ? ["leaf", "leaves"] : [unit, pluraliseUnit(unit)];
    const unitPattern = new RegExp(`\\b(${unitForms.join("|")})\\b`, "i");
    if (unitPattern.test(name)) {
        const desiredForm = numericAmount === 1 ? unitForms[0] : unitForms[1];
        const formattedName = name.replace(unitPattern, match => /^[A-Z]/.test(match)
            ? `${desiredForm.charAt(0).toUpperCase()}${desiredForm.slice(1)}`
            : desiredForm);
        return `${amount} ${formattedName}`.trim();
    }
    const fixedUnits = new Set(["g", "kg", "ml", "l", "tsp", "tbsp"]);
    const displayUnit = fixedUnits.has(unit) || numericAmount === 1
        ? unit
        : pluraliseUnit(unit);
    return `${amount} ${displayUnit} ${name}`.replace(/\s+/g, " ").trim();
}

function pluraliseUnit(unit) {
    if (unit === "leaf") return "leaves";
    if (unit.endsWith("s")) return unit;
    if (unit.endsWith("ch") || unit.endsWith("sh")) return `${unit}es`;
    return `${unit}s`;
}

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

/* ==================================================
   Homepage
================================================== */

function refreshHomepage() {

    const recipeCount =
        document.getElementById("recipeCount");

    if (recipeCount) {

        recipeCount.textContent =
            recipes.length;

    }

}

/* ==================================================
   Helpers
================================================== */

function getIngredientName(id){

    const ingredient = ingredientFromID(id);

    return ingredient
        ? ingredient.name
        : id;

}

function getIngredient(id){

    return ingredientFromID(id);

}
