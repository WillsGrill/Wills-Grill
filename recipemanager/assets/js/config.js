"use strict";

/* ============================================
    Recipe Manager Configuration
============================================ */

const ROOT = window.location.pathname.includes("/recipemanager/pages/")
    ? "../../"
    : "../";

const CONFIG = {

    recipesFile: `${ROOT}data/recipes/recipes.json`,

    ingredientsFile: `${ROOT}data/ingredients/ingredients.json`,

    recipeImages: `${ROOT}assets/images/recipes/`,

    saveEndpoint: `${ROOT}api/recipemanager/save`

};
