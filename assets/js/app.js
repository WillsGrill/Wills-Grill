/*
==================================================
Will's Grill
app.js
==================================================
*/

"use strict";

document.addEventListener("DOMContentLoaded", async () => {

    await initialiseUI();

    await initialiseRecipes();

    initialiseShopping();

    refreshHomepage();

});