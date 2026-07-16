"use strict";

const packageSummary = document.getElementById("packageSummary");
const packageStatus = document.getElementById("packageStatus");
const refreshDataButton = document.getElementById("refreshDataButton");
const saveRepositoryButton = document.getElementById("saveRepositoryButton");

let recipes = [];
let ingredients = [];
let repositoryRecipes = [];
let repositoryIngredients = [];
let saveSession = null;
let exportBlocked = false;

const RECIPES_DRAFT_KEY = CONFIG.recipesDraftKey;
const INGREDIENTS_DRAFT_KEY = CONFIG.ingredientsDraftKey;
const METHOD_STEP_COUNT = 8;
const RECIPE_CATEGORIES = ["Beef", "Chicken", "Fish", "Pork", "Turkey", "Vegetarian", "Venison"];
const RECIPE_DIFFICULTIES = ["Easy", "Medium", "Hard"];

refreshDataButton.addEventListener("click", discardLocalChanges);
saveRepositoryButton.addEventListener("click", saveToRepository);
initialiseExportPage();

async function initialiseExportPage() {
    try {
        const [recipeData, ingredientData] = await Promise.all([
            loadJSON(CONFIG.recipesFile),
            loadJSON(CONFIG.ingredientsFile)
        ]);

        repositoryRecipes = recipeData;
        repositoryIngredients = ingredientData;
        const recipeDraft = await DraftStore.resolve(RECIPES_DRAFT_KEY, recipeData, "recipe");
        const ingredientDraft = await DraftStore.resolve(INGREDIENTS_DRAFT_KEY, ingredientData, "ingredient");
        recipes = recipeDraft.data;
        ingredients = ingredientDraft.data;
        exportBlocked = Boolean(recipeDraft.blocked || ingredientDraft.blocked);

        if (!Array.isArray(recipes) || !Array.isArray(ingredients)) {
            throw new Error("Website data must contain JSON arrays.");
        }

        saveSession = await loadSaveSession();
        const changedImages = await getChangedRecipeImages(recipes);
        packageSummary.textContent = `${recipes.length} recipes, ${ingredients.length} ingredients, and ${changedImages.length} changed image${changedImages.length === 1 ? "" : "s"}.`;
        saveRepositoryButton.disabled = exportBlocked || !saveSession;
        if (exportBlocked) {
            setStatus("An older draft is open for review only. Reload and choose Merge safely or Discard old draft before saving.", true);
        }
        else if (!saveSession) {
            setStatus("Repository saving is available only when Recipe Manager is opened from the local launcher.", true);
        }
    }
    catch (error) {
        console.error(error);
        packageSummary.textContent = "The current website data could not be loaded.";
        setStatus("Unable to prepare the export. Check the configured data source.", true);
    }
}

async function saveToRepository() {
    if (exportBlocked || !saveSession) return;
    saveRepositoryButton.disabled = true;
    setStatus("Saving to the local repository...");

    try {
        const validationError = validateExportData();
        if (validationError) throw new Error(validationError);

        const changedImages = await getChangedRecipeImages(recipes);
        const images = await Promise.all(changedImages.map(async (image) => ({
            filename: image.filename,
            content: await blobToBase64(image.blob)
        })));

        const response = await fetch(CONFIG.saveEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Recipe-Manager-Token": saveSession.token
            },
            body: JSON.stringify({
                recipes,
                ingredients,
                images,
                expectedRevision: saveSession.revision
            })
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            if (response.status === 409) saveSession = null;
            throw new Error(result.error || "The local save request failed.");
        }

        DraftStore.clear(RECIPES_DRAFT_KEY);
        DraftStore.clear(INGREDIENTS_DRAFT_KEY);
        await clearChangedRecipeImages();
        saveSession.revision = result.revision;
        setStatus("Saved to the repository. Browser drafts and staged images were cleared. Review git diff, then commit and push your changes.");
    }
    catch (error) {
        console.error(error);
        const message = error instanceof TypeError
            ? "Unable to reach the local save server. Start Recipe Manager with python3 recipemanager/local_server.py and open its localhost URL."
            : `Unable to save: ${error.message || "Unknown error."}`;
        setStatus(message, true);
    }
    finally {
        saveRepositoryButton.disabled = exportBlocked || !saveSession;
    }
}

function validateExportData() {
    const recipeIds = new Set();
    const ingredientIds = new Set();

    for (const ingredient of ingredients) {
        if (!ingredient.id || !/^ING-[A-Z]\d{3}$/.test(ingredient.id)) return `Ingredient ${ingredient.id || "without an ID"} has an invalid ID.`;
        if (!ingredient.name || !ingredient.category) return `Ingredient ${ingredient.id} is missing a name or category.`;
        if (typeof ingredient.pantry !== "boolean") return `Ingredient ${ingredient.id} needs a true or false pantry value.`;
        if (ingredient.treat !== undefined && typeof ingredient.treat !== "boolean") return `Ingredient ${ingredient.id} has an invalid treat value.`;
        if (ingredientIds.has(ingredient.id)) return `Duplicate ingredient ID: ${ingredient.id}.`;
        ingredientIds.add(ingredient.id);
    }

    for (const recipe of recipes) {
        if (!recipe.id || !/^REC\d{3}$/.test(recipe.id) || recipeIds.has(recipe.id)) return `Recipe IDs must use REC000 and be unique: ${recipe.id || "missing ID"}.`;
        if (!recipe.name || !recipe.category || !recipe.description || !recipe.difficulty || !recipe.tip) {
            return `Recipe ${recipe.id} is missing required information.`;
        }
        if (!RECIPE_CATEGORIES.includes(recipe.category)) return `Recipe ${recipe.id} has an invalid category.`;
        if (!RECIPE_DIFFICULTIES.includes(recipe.difficulty)) return `Recipe ${recipe.id} has an invalid difficulty.`;
        if (recipe.image && !/^rec\d{3}\.webp$/i.test(recipe.image)) return `Recipe ${recipe.id} has an invalid image filename.`;
        if (!Array.isArray(recipe.steps) || recipe.steps.length !== METHOD_STEP_COUNT || recipe.steps.some((step) => !String(step).trim())) {
            return `Recipe ${recipe.id} needs exactly ${METHOD_STEP_COUNT} completed method steps.`;
        }
        if (!Array.isArray(recipe.ingredients) || !recipe.ingredients.length) return `Recipe ${recipe.id} needs at least one ingredient.`;
        if (recipe.ingredients.some((row) => !ingredientIds.has(row.ingredient) || !Number.isFinite(row.quantity) || row.quantity <= 0)) {
            return `Recipe ${recipe.id} has an invalid ingredient reference or quantity.`;
        }
        const numericFields = [recipe.prepTime, recipe.cookTime, recipe.serves, recipe.nutrition?.calories, recipe.nutrition?.protein, recipe.nutrition?.carbs, recipe.nutrition?.fat];
        if (numericFields.some((value) => !Number.isFinite(value) || value < 0) || recipe.serves <= 0) {
            return `Recipe ${recipe.id} has invalid timing, serving, or nutrition values.`;
        }
        recipeIds.add(recipe.id);
    }

    return "";
}

function discardLocalChanges() {
    if (!confirm("Discard local recipe and ingredient changes and reload website data?")) return;
    localStorage.removeItem(RECIPES_DRAFT_KEY);
    localStorage.removeItem(INGREDIENTS_DRAFT_KEY);
    clearChangedRecipeImages().then(() => window.location.reload());
}

async function loadSaveSession() {
    try {
        const response = await fetch(CONFIG.sessionEndpoint, { cache: "no-store" });
        if (!response.ok) return null;
        const session = await response.json();
        return session?.token && session?.revision ? session : null;
    }
    catch (error) {
        return null;
    }
}

function clearChangedRecipeImages() {
    return new Promise((resolve) => {
        if (!window.indexedDB) {
            resolve();
            return;
        }

        const request = indexedDB.open(CONFIG.editorDatabase, 1);
        request.onsuccess = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains("changed-images")) {
                database.close();
                resolve();
                return;
            }

            const transaction = database.transaction("changed-images", "readwrite");
            transaction.objectStore("changed-images").clear();
            transaction.oncomplete = () => {
                database.close();
                resolve();
            };
            transaction.onerror = () => {
                database.close();
                resolve();
            };
        };
        request.onerror = () => resolve();
    });
}

async function loadJSON(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Unable to load ${path}`);
    return response.json();
}

function getChangedRecipeImages(recipeList) {
    return new Promise((resolve) => {
        if (!window.indexedDB) {
            resolve([]);
            return;
        }

        const request = indexedDB.open(CONFIG.editorDatabase, 1);

        request.onupgradeneeded = () => {
            request.result.createObjectStore("changed-images", { keyPath: "filename" });
        };

        request.onsuccess = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains("changed-images")) {
                database.close();
                resolve([]);
                return;
            }
            const transaction = database.transaction("changed-images", "readonly");
            const getAllRequest = transaction.objectStore("changed-images").getAll();
            getAllRequest.onsuccess = () => {
                database.close();
                const referencedImages = new Set(recipeList.map((recipe) => recipe.image).filter(Boolean));
                resolve((getAllRequest.result || []).filter((image) => referencedImages.has(image.filename.replace(/^thumbs\//, ""))));
            };
            getAllRequest.onerror = () => {
                database.close();
                resolve([]);
            };
        };

        request.onerror = () => resolve([]);
    });
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",", 2)[1]);
        reader.onerror = () => reject(new Error("Unable to read a changed recipe image."));
        reader.readAsDataURL(blob);
    });
}

function setStatus(message, isError = false) {
    packageStatus.textContent = message;
    packageStatus.classList.toggle("error", isError);
}
