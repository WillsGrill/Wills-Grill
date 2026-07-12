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

    }

    catch (error) {

        console.error(error);

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

    if (!ingredient) {

        return `${item.quantity} × ${item.ingredient}`;

    }

    let unit = ingredient.unit;

    if (
        item.quantity === 1 &&
        unit === "clove"
    ) {

        unit = "clove";

    }

    else if (
        unit === "clove"
    ) {

        unit = "cloves";

    }

    else if (
        item.quantity === 1 &&
        unit === "each"
    ) {

        unit = "";

    }

    return `${item.quantity} ${unit} ${ingredient.name}`
        .replace(/\s+/g, " ")
        .trim();

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