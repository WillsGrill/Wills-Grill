"use strict";

const ROOT = window.location.pathname.includes("/pages/")
    ? "../"
    : "";

const PATHS = {

    recipes: `${ROOT}data/recipes/recipes.json`,

    ingredients: `${ROOT}data/ingredients/ingredients.json`

};