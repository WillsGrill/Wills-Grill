"use strict";

const ROOT = window.location.pathname.includes("/pages/")
    ? "../"
    : "";

const PATHS = {

    recipes: `${ROOT}data/recipes.json`,

    ingredients: `${ROOT}data/ingredients.json`

};