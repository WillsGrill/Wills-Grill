/*
==================================================
Will's Grill
app.js
==================================================
*/

"use strict";

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialiseApp);
}
else {
    initialiseApp();
}

async function initialiseApp() {

    try {

        if (typeof initialiseUI === "function") {
            await initialiseUI();
        }

        if (typeof initialiseRecipes === "function") {
            await initialiseRecipes();
        }

        if (typeof initialiseShopping === "function") {
            initialiseShopping();
        }

        if (typeof refreshHomepage === "function") {
            refreshHomepage();
        }

        if (typeof updateRecipeCounter === "function") {
            updateRecipeCounter();
        }

        if (typeof generateShoppingList === "function") {
            generateShoppingList();
        }

    }

    catch (error) {

        console.error("App initialisation failed:", error);

        const target = document.getElementById("recipeList") || document.getElementById("recipePage") || document.getElementById("shoppingList") || document.querySelector("main");
        if (target) {
            target.innerHTML = '<section class="panel error-state" role="alert"><h1>Something went wrong</h1><p>The recipe data could not be loaded. Check your connection and refresh the page.</p><button class="button mt-3" id="retryApplication" type="button">Try again</button></section>';
            document.getElementById("retryApplication")?.addEventListener("click", () => window.location.reload());
        }

    }

}
