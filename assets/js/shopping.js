/*
==================================================
Will's Grill
shopping.js
==================================================
*/

"use strict";

const STORAGE_KEY = "willsGrillShopping";

/* ============================================
   Initialise
============================================ */

function initialiseShopping() {

    attachShoppingEvents();

}

/* ============================================
   Event Listeners
============================================ */

function attachShoppingEvents() {

    document.addEventListener("click", event => {

        const button = event.target.closest(".addRecipe");

        if (button) {
            toggleRecipe(button.dataset.id);
            return;
        }

        const printButton = event.target.closest("#printShopping");

        if (printButton) {
            window.print();
            return;
        }

    });

}

/* ============================================
   Toggle Recipe
============================================ */

function toggleRecipe(recipeID) {

    let selected = getSelectedRecipes();

    if (selected.includes(recipeID)) {

        selected = selected.filter(id => id !== recipeID);

    } else {

        selected.push(recipeID);

    }

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

    return JSON.parse(data);

}

/* ============================================
   Update Buttons
============================================ */

function updateButtons() {

    const selected = getSelectedRecipes();

    document.querySelectorAll(".addRecipe").forEach(button => {

        const added = selected.includes(button.dataset.id);

        button.textContent = added

            ? "✓ Added"

            : "Add";

        button.classList.toggle(

            "button-outline",

            !added

        );

    });

}

/* ============================================
   Counter
============================================ */

function updateRecipeCounter() {

    const counter = document.getElementById(

        "selectedRecipeCount"

    );

    if (!counter) return;

    counter.textContent =

        getSelectedRecipes().length;

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

    let shopping = {};

    selected.forEach(recipeID => {

        const recipe = recipes.find(

            r => r.id === recipeID

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

                    quantity:0

                };

            }

            shopping[key].quantity += item.quantity;

        });

    });

    renderShoppingList(

        Object.values(shopping)

    );

}

/* ============================================
   Render Shopping List
============================================ */

function renderShoppingList(items){

    const container = document.getElementById(

        "shoppingList"

    );

    if(!container) return;

    container.innerHTML="";

    const categories={};

    items.forEach(item=>{

        if(!categories[item.category]){

            categories[item.category]=[];

        }

        categories[item.category].push(item);

    });

    Object.keys(categories).sort().forEach(category=>{

        container.innerHTML+=`

<div class="shopping-category">

<h3>

${category}

</h3>

<ul class="shopping-items">

${categories[category].map(item=>`

<li>

<label>

<input type="checkbox">

${item.quantity} ${item.unit} ${item.name}

</label>

</li>

`).join("")}

</ul>

</div>

`;

    });

}

/* ============================================
   Refresh Shopping Page
============================================ */

document.addEventListener(

    "DOMContentLoaded",

    ()=>{

        generateShoppingList();

    }

);