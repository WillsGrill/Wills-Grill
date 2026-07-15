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

    }

}
