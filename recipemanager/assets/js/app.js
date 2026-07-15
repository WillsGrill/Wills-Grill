"use strict";

/* ============================================
   Dashboard
============================================ */

document.addEventListener(

    "DOMContentLoaded",

    initialiseDashboard

);

async function initialiseDashboard() {

    await loadDashboardStats();

}

async function loadDashboardStats() {

    try {

        let recipes =
            await loadJSON(CONFIG.recipesFile);

        let ingredients =
            await loadJSON(CONFIG.ingredientsFile);

        if (!Array.isArray(recipes) || !Array.isArray(ingredients)) {
            throw new Error("Website data must contain recipe and ingredient arrays.");
        }

        const recipeDraft = DraftStore.inspect(CONFIG.recipesDraftKey, recipes);
        const ingredientDraft = DraftStore.inspect(CONFIG.ingredientsDraftKey, ingredients);

        updateStat(

            "recipeCount",

            recipes.length

        );

        updateStat(

            "ingredientCount",

            ingredients.length

        );

        renderDraftStatus(recipeDraft, ingredientDraft, recipes.length, ingredients.length);

    }

    catch(error){

        console.error(error);

        updateStat("recipeCount","!");

        updateStat("ingredientCount","!");

    }

}

function renderDraftStatus(recipeDraft, ingredientDraft, recipeCount, ingredientCount) {
    document.querySelector(".draft-dashboard-warning")?.remove();

    if (!recipeDraft.hasDraft && !ingredientDraft.hasDraft) return;

    const warning = document.createElement("section");
    warning.className = `draft-dashboard-warning ${recipeDraft.stale || ingredientDraft.stale ? "error" : ""}`;
    warning.setAttribute("role", "status");
    warning.innerHTML = `
        <h3>${recipeDraft.stale || ingredientDraft.stale ? "Older browser draft detected" : "Browser draft available"}</h3>
        <p>Repository: ${recipeCount} recipes and ${ingredientCount} ingredients. Draft: ${recipeDraft.data.length} recipes and ${ingredientDraft.data.length} ingredients.</p>
        <p>Open Recipes, Ingredients or Export to review, safely merge, back up, or discard the draft before saving.</p>
    `;

    document.querySelector(".content header")?.insertAdjacentElement("afterend", warning);
}

async function loadJSON(path){

    const response = await fetch(path);

    if(!response.ok){

        throw new Error(

            `Unable to load ${path}`

        );

    }

    return await response.json();

}

function updateStat(id,value){

    const element=document.getElementById(id);

    if(!element) return;

    element.textContent=value;

}
