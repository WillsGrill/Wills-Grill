/*
==================================================
Will's Grill
Alpha v1.0

app.js
==================================================
*/

"use strict";

document.addEventListener("DOMContentLoaded", async () => {

    await initialiseRecipes();

    initialiseShopping();

    initialiseUI();

    refreshHomepage();

});