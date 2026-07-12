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

    const browsePage = document.getElementById("recipeList");
    const recipePage = document.getElementById("recipePage");

    if (!browsePage && !recipePage) {

        return;

    }

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

    if (browsePage) {

        renderRecipes(recipes);

        initialiseSearch();

    }

    if (recipePage) {

        renderRecipePage();

    }

}

/* ==================================================
   Browse Page
================================================== */

function renderRecipes(recipeArray) {

    const container =
        document.getElementById("recipeList");

    if (!container) return;

    container.innerHTML = "";

    recipeArray.forEach(recipe => {

        container.innerHTML += createRecipeCard(recipe);

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

<h3>

${recipe.name}

</h3>

<p>

${recipe.description}

</p>

<div class="recipe-meta">

<span>

⏱ ${recipe.prepTime + recipe.cookTime} mins

</span>

<span>

👥 ${recipe.serves}

</span>

<span>

${recipe.difficulty}

</span>

</div>

<div class="recipe-actions">

<button
class="button viewRecipe"
data-id="${recipe.id}">

View Recipe

</button>

<button
class="button button-outline addRecipe"
data-id="${recipe.id}">

Add

</button>

</div>

</div>

</article>

`;

}

/* ==================================================
   Search
================================================== */

function initialiseSearch() {

    const search =
        document.getElementById("searchBox");

    if (!search) return;

    search.addEventListener("input", () => {

        const value =
            search.value
            .toLowerCase()
            .trim();

        if (value === "") {

            renderRecipes(recipes);

            return;

        }

        const filtered = recipes.filter(recipe => {

            return (

                recipe.name
                    .toLowerCase()
                    .includes(value)

                ||

                recipe.description
                    .toLowerCase()
                    .includes(value)

                ||

                recipe.category
                    .toLowerCase()
                    .includes(value)

            );

        });

        renderRecipes(filtered);

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

<p>This recipe could not be loaded.</p>

</div>

`;

        return;

    }

    const ingredientHTML = recipe.ingredients.map(item => {

        return `

<li>

${formatIngredient(item)}

</li>

`;

    }).join("");

    const stepHTML = recipe.steps.map((step, index) => {

        return `

<div class="step">

<div class="step-number">

${index + 1}

</div>

<div>

${step}

</div>

</div>

`;

    }).join("");

    container.innerHTML = `

<div class="recipe-hero">

<div class="recipe-hero-image">

<img
src="../assets/images/recipes/${recipe.image}"
alt="${recipe.name}">

</div>

<div class="recipe-summary">

<h2>

${recipe.name}

</h2>

<p>

${recipe.description}

</p>

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

<button
class="button addRecipe"
data-id="${recipe.id}">

Add To Shopping List

</button>

</div>

</div>

<div class="recipe-columns">

<div class="panel">

<h3>

Ingredients

</h3>

<ul class="ingredients">

${ingredientHTML}

</ul>

</div>

<div>

<h3>

Method

</h3>

<div class="method">

${stepHTML}

</div>

<div class="panel mt-4">

<h3>

Nutrition

</h3>

<p><strong>Calories:</strong> ${recipe.nutrition.calories}</p>

<p><strong>Protein:</strong> ${recipe.nutrition.protein} g</p>

<p><strong>Carbs:</strong> ${recipe.nutrition.carbs} g</p>

<p><strong>Fat:</strong> ${recipe.nutrition.fat} g</p>

</div>

<div class="panel mt-4">

<h3>

Chef's Tip

</h3>

<p>

${recipe.tip}

</p>

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

document.addEventListener("click", event => {

    const button = event.target.closest(".viewRecipe");

    if (!button) return;

    window.location.href = `recipe.html?id=${button.dataset.id}`;

});