/*
==================================================
Will's Grill
ui.js
==================================================
*/

"use strict";

let ingredients = [];

/* ============================================
   Initialise
============================================ */

async function initialiseUI(){

    await loadIngredients();

}

/* ============================================
   Load ingredients database
============================================ */

async function loadIngredients(){

    try{

        const response = await fetch("../data/ingredients/ingredients.json");

        ingredients = await response.json();

    }

    catch(error){

        console.error(error);

    }

}

/* ============================================
   Lookup ingredient
============================================ */

function ingredientFromID(id){

    return ingredients.find(

        ingredient => ingredient.id === id

    );

}

/* ============================================
   Format ingredient
============================================ */

function formatIngredient(item){

    const ingredient = ingredientFromID(

        item.ingredient

    );

    if(!ingredient){

        return item.ingredient;

    }

    return `${item.quantity} ${ingredient.unit} ${ingredient.name}`;

}

/* ============================================
   Homepage counters
============================================ */

function refreshHomepage(){

    const recipeCount =

        document.getElementById(

            "recipeCount"

        );

    if(recipeCount){

        recipeCount.textContent = recipes.length;

    }

    updateRecipeCounter();

}