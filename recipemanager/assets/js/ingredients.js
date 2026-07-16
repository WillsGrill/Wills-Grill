"use strict";

let ingredients = [];
let recipes = [];
let currentIngredient = null;
let creatingIngredient = false;
let ingredientSearchText = "";
let ingredientCategoryFilter = "";
let ingredientSortKey = "name-asc";
let repositoryIngredients = [];
let ingredientDraftBlocked = false;
let ingredientEditorDirty = false;

const INGREDIENTS_DRAFT_KEY = CONFIG.ingredientsDraftKey;

document.addEventListener("DOMContentLoaded", initialiseIngredientsPage);

window.addEventListener("beforeunload", (event) => {
    if (!ingredientEditorDirty) return;
    event.preventDefault();
    event.returnValue = "";
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.getElementById("ingredientEditorPanel")?.classList.contains("open")) {
        closeIngredientEditor();
    }
});

function initialiseIngredientsPage() {

    const searchInput = document.getElementById("ingredientSearch");
    const exportIngredientsButton = document.getElementById("exportIngredientsButton");
    const newIngredientButton = document.getElementById("newIngredientButton");
    const closeIngredientEditorButton = document.getElementById("closeIngredientEditor");
    const categoryFilter = document.getElementById("ingredientCategoryFilter");
    const sortSelect = document.getElementById("ingredientSort");

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            ingredientSearchText = searchInput.value;
            renderIngredientTable();
        });
    }

    if (categoryFilter) {
        categoryFilter.addEventListener("change", () => {
            ingredientCategoryFilter = categoryFilter.value;
            renderIngredientTable();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener("change", () => {
            ingredientSortKey = sortSelect.value;
            renderIngredientTable();
        });
    }

    if (exportIngredientsButton) {
        exportIngredientsButton.addEventListener("click", exportCurrentIngredients);
    }

    if (newIngredientButton) {
        newIngredientButton.addEventListener("click", () => openIngredientEditor(createBlankIngredient()));
    }

    if (closeIngredientEditorButton) {
        closeIngredientEditorButton.addEventListener("click", closeIngredientEditor);
    }

    loadIngredientData();

}

async function loadIngredientData() {

    try {

        const [ingredientData, recipeData] = await Promise.all([
            loadJSON(CONFIG.ingredientsFile),
            loadJSON(CONFIG.recipesFile)
        ]);

        if (!Array.isArray(ingredientData) || !Array.isArray(recipeData)) {
            throw new Error("Website data must contain ingredient and recipe arrays.");
        }

        // Keep an immutable baseline for draft revision checks. Without the copy,
        // editing `ingredients` also mutated `repositoryIngredients`, so a reload
        // incorrectly treated the newly saved draft as stale.
        repositoryIngredients = ingredientData.map((ingredient) => ({ ...ingredient }));
        const ingredientDraft = await DraftStore.resolve(INGREDIENTS_DRAFT_KEY, repositoryIngredients, "ingredient");
        const recipeDraft = await DraftStore.resolve(CONFIG.recipesDraftKey, recipeData, "recipe");
        ingredients = ingredientDraft.data.map((ingredient) => ({ ...ingredient }));
        recipes = recipeDraft.data;
        ingredientDraftBlocked = Boolean(ingredientDraft.blocked || recipeDraft.blocked);
        populateIngredientCategoryFilter();
        renderIngredientTable();
        renderDraftBlockNotice();

    }
    catch (error) {

        console.error(error);

        const table = document.getElementById("ingredientTable");

        if (table) {
            table.innerHTML = '<tr><td colspan="6" class="empty-state">Unable to load ingredients.</td></tr>';
        }

    }

}

async function loadJSON(path) {

    const response = await fetch(path);

    if (!response.ok) {
        throw new Error(`Unable to load ${path}`);
    }

    return response.json();

}

function exportCurrentIngredients() {
    const validationError = validateIngredientCollection();

    if (validationError) {
        alert(`Ingredients cannot be exported: ${validationError}`);
        return;
    }

    const blob = new Blob([JSON.stringify(ingredients, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ingredients.json";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

function validateIngredientCollection() {
    const ingredientIds = new Set();

    for (const ingredient of ingredients) {
        const validationError = validateIngredient(ingredient);
        if (validationError) return validationError;
        if (ingredientIds.has(ingredient.id)) return `Duplicate ingredient ID: ${ingredient.id}.`;
        ingredientIds.add(ingredient.id);
    }

    return "";
}

function renderIngredientTable() {

    const tableBody = document.getElementById("ingredientTable");

    if (!tableBody) return;

    const query = ingredientSearchText.trim().toLowerCase();
    const visibleIngredients = ingredients.filter((ingredient) => {

        if (ingredientCategoryFilter && ingredient.category !== ingredientCategoryFilter) {
            return false;
        }

        if (!query) return true;

        return [ingredient.id, ingredient.name, ingredient.category, ingredient.unit]
            .filter(Boolean)
            .some((value) => value.toString().toLowerCase().includes(query));

    });

    visibleIngredients.sort(compareIngredients);

    if (!visibleIngredients.length) {
        tableBody.innerHTML = '<tr><td colspan="6" class="empty-state">No ingredients found.</td></tr>';
        return;
    }

    tableBody.innerHTML = visibleIngredients.map((ingredient) => `
        <tr>
            <td>${escapeHtml(ingredient.id || "")}</td>
            <td>${escapeHtml(ingredient.name || "")}</td>
            <td>${escapeHtml(ingredient.category || "")}</td>
            <td>${escapeHtml(ingredient.unit || "")}</td>
            <td>${ingredient.treat ? "Yes" : "No"}</td>
            <td class="edit-action">
                <div class="table-actions">
                    <button type="button" class="secondary-button table-action-button" data-action="edit-ingredient" data-ingredient-id="${escapeHtml(ingredient.id || "")}">Edit</button>
                    <button type="button" class="danger-button table-action-button" data-action="delete-ingredient" data-ingredient-id="${escapeHtml(ingredient.id || "")}">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");

    tableBody.querySelectorAll("[data-action='edit-ingredient']").forEach((button) => {
        button.addEventListener("click", () => openIngredientEditor(findIngredientById(button.getAttribute("data-ingredient-id"))));
    });

    tableBody.querySelectorAll("[data-action='delete-ingredient']").forEach((button) => {
        button.addEventListener("click", () => deleteIngredient(button.getAttribute("data-ingredient-id")));
    });
}

function populateIngredientCategoryFilter() {
    const categoryFilter = document.getElementById("ingredientCategoryFilter");
    if (!categoryFilter) return;

    categoryFilter.innerHTML = '<option value="">All categories</option>' + getIngredientCategories()
        .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
        .join("");
    categoryFilter.value = ingredientCategoryFilter;
}

function compareIngredients(firstIngredient, secondIngredient) {
    const [field, direction] = ingredientSortKey.split("-");
    const firstValue = String(firstIngredient[field] || "").toLowerCase();
    const secondValue = String(secondIngredient[field] || "").toLowerCase();
    const result = firstValue.localeCompare(secondValue, undefined, { numeric: true });
    return direction === "desc" ? -result : result;
}

function findIngredientById(id) {
    if (!id) return null;
    return ingredients.find((ingredient) => ingredient.id === id) || null;
}

function deleteIngredient(id) {
    const ingredient = findIngredientById(id);
    if (!ingredient) return;

    if (ingredientDraftBlocked) {
        alert("This older draft is open for review only. Reload this page and merge or discard it before deleting ingredients.");
        return;
    }

    const usage = recipes.filter((recipe) => {
        return (recipe.ingredients || []).some((row) => row.ingredient === ingredient.id);
    });

    if (usage.length) {
        const recipeNames = usage.map((recipe) => recipe.name || recipe.id).join(", ");
        alert(`Cannot delete ${ingredient.name || ingredient.id}. It is used by: ${recipeNames}.`);
        return;
    }

    if (!confirm(`Delete ${ingredient.name || ingredient.id}?`)) return;

    const deletedIndex = ingredients.findIndex((item) => item.id === ingredient.id);
    ingredients = ingredients.filter((item) => item.id !== ingredient.id);
    saveIngredientDraft();
    populateIngredientCategoryFilter();
    renderIngredientTable();
    showUndoToast(`${ingredient.name || ingredient.id} deleted.`, () => {
        ingredients.splice(Math.max(0, deletedIndex), 0, ingredient);
        saveIngredientDraft();
        populateIngredientCategoryFilter();
        renderIngredientTable();
    });
}

function createBlankIngredient() {
    return {
        id: "",
        name: "",
        category: "",
        unit: "",
        pantry: false,
        treat: false
    };
}

function openIngredientEditor(ingredient) {
    if (!ingredient) return;
    currentIngredient = { ...ingredient };
    creatingIngredient = !ingredient.id;
    ingredientEditorDirty = false;
    renderIngredientEditor();
    const editorPanel = document.getElementById("ingredientEditorPanel");
    if (editorPanel) {
        editorPanel.classList.add("open");
        editorPanel.setAttribute("aria-hidden", "false");
        editorPanel.querySelector("input,button,select,textarea")?.focus();
    }
}

function closeIngredientEditor() {
    if (ingredientEditorDirty && !confirm("Discard your unsaved ingredient changes?")) return;
    const editorPanel = document.getElementById("ingredientEditorPanel");
    if (editorPanel) {
        editorPanel.classList.remove("open");
        editorPanel.setAttribute("aria-hidden", "true");
    }
    currentIngredient = null;
    creatingIngredient = false;
    ingredientEditorDirty = false;
}

function renderIngredientEditor() {
    const editorContent = document.getElementById("ingredientEditorContent");
    if (!editorContent || !currentIngredient) return;

    editorContent.innerHTML = `
        <form id="ingredientEditorForm" class="editor-form">
            <div class="field-grid">
                <label class="full-width">
                    Ingredient ID
                    <input id="ingredientId" value="${escapeHtml(currentIngredient.id || generateIngredientId(currentIngredient.category))}" readonly required>
                </label>
                <label class="full-width">
                    Name
                    <input id="ingredientName" value="${escapeHtml(currentIngredient.name || "")}" required>
                </label>
                <label class="full-width">
                    Category
                    <div class="category-picker">
                        <input id="ingredientCategory" class="category-search-input" value="${escapeHtml(currentIngredient.category || "")}"
                               placeholder="Search or enter a category" autocomplete="off" aria-expanded="false">
                        <div class="category-options" hidden>
                            ${getIngredientCategories().map((category) => `
                                <button type="button" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>
                            `).join("")}
                        </div>
                    </div>
                </label>
                <label class="full-width">
                    Unit
                    <input id="ingredientUnit" value="${escapeHtml(currentIngredient.unit || "")}">
                </label>
                <label class="checkbox-field full-width">
                    <input id="ingredientPantry" type="checkbox" ${currentIngredient.pantry ? "checked" : ""}>
                    Pantry staple
                </label>
                <label class="checkbox-field full-width">
                    <input id="ingredientTreat" type="checkbox" ${currentIngredient.treat ? "checked" : ""}>
                    Mark recipes containing this ingredient as a treat
                </label>
            </div>
            <div class="editor-actions">
                <button type="submit" class="primary-button">Save</button>
                <button type="button" class="secondary-button" id="cancelIngredientEdit">Cancel</button>
            </div>
        </form>
    `;

    const form = document.getElementById("ingredientEditorForm");
    const cancelButton = document.getElementById("cancelIngredientEdit");
    const categoryInput = document.getElementById("ingredientCategory");

    if (categoryInput && creatingIngredient) {
        categoryInput.addEventListener("input", () => {
            const idInput = document.getElementById("ingredientId");
            if (idInput) {
                idInput.value = generateIngredientId(categoryInput.value);
            }
        });
    }

    attachCategoryPicker(document.querySelector(".category-picker"));

    if (form) {
        form.addEventListener("input", () => { ingredientEditorDirty = true; });
        form.addEventListener("change", () => { ingredientEditorDirty = true; });
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            saveIngredientFromEditor();
        });
    }

    if (cancelButton) {
        cancelButton.addEventListener("click", closeIngredientEditor);
    }
}

function getIngredientCategories() {
    return [...new Set(
        ingredients
            .map((ingredient) => (ingredient.category || "").trim())
            .filter(Boolean)
    )].sort((firstCategory, secondCategory) => firstCategory.localeCompare(secondCategory));
}

function attachCategoryPicker(picker) {

    if (!picker) return;

    const input = picker.querySelector("#ingredientCategory");
    const options = picker.querySelector(".category-options");
    if (!input || !options) return;

    const optionButtons = Array.from(options.querySelectorAll("button"));

    const showOptions = () => {
        options.hidden = false;
        input.setAttribute("aria-expanded", "true");
        filterCategoryOptions(input, optionButtons);
    };

    input.addEventListener("focus", showOptions);
    input.addEventListener("input", showOptions);

    optionButtons.forEach((button) => {
        button.addEventListener("mousedown", (event) => event.preventDefault());
        button.addEventListener("click", () => {
            input.value = button.dataset.category || "";
            input.dispatchEvent(new Event("input", { bubbles: true }));
            options.hidden = true;
            input.setAttribute("aria-expanded", "false");
        });
    });

    input.addEventListener("blur", () => {
        window.setTimeout(() => {
            options.hidden = true;
            input.setAttribute("aria-expanded", "false");
        }, 120);
    });

}

function filterCategoryOptions(input, optionButtons) {

    const query = input.value.trim().toLowerCase();

    optionButtons.forEach((button) => {
        button.hidden = query && !button.textContent.toLowerCase().includes(query);
    });

}

function saveIngredientFromEditor() {
    const idInput = document.getElementById("ingredientId");
    const nameInput = document.getElementById("ingredientName");
    const categoryInput = document.getElementById("ingredientCategory");
    const unitInput = document.getElementById("ingredientUnit");
    const pantryInput = document.getElementById("ingredientPantry");
    const treatInput = document.getElementById("ingredientTreat");

    if (!idInput || !nameInput || !categoryInput || !unitInput || !pantryInput || !treatInput) return;

    if (ingredientDraftBlocked) {
        alert("This older draft is open for review only. Reload this page and merge or discard it before saving.");
        return;
    }

    const updatedIngredient = {
        id: creatingIngredient ? generateIngredientId(categoryInput.value) : idInput.value.trim(),
        name: nameInput.value.trim(),
        category: categoryInput.value.trim(),
        unit: unitInput.value.trim(),
        pantry: pantryInput.checked,
        treat: treatInput.checked
    };

    const validationError = validateIngredient(updatedIngredient);
    if (validationError) {
        alert(validationError);
        return;
    }

    const existingIndex = ingredients.findIndex((ingredient) => ingredient.id === currentIngredient.id);

    if (existingIndex >= 0 && currentIngredient.id) {
        ingredients[existingIndex] = updatedIngredient;
    }
    else {
        ingredients.push(updatedIngredient);
    }

    saveIngredientDraft();
    populateIngredientCategoryFilter();
    renderIngredientTable();
    ingredientEditorDirty = false;
    closeIngredientEditor();
}

function validateIngredient(ingredient) {
    if (!ingredient.id || !/^ING-[A-Z]\d{3}$/.test(ingredient.id)) {
        return "Ingredient ID must use the ING-X000 convention.";
    }

    if (!ingredient.name) {
        return "Ingredient name is required.";
    }

    if (!ingredient.category) {
        return "Ingredient category is required.";
    }

    const duplicate = ingredients.some((item) => {
        return item.id === ingredient.id && item.id !== currentIngredient?.id;
    });

    return duplicate ? "Ingredient ID must be unique." : "";
}

function generateIngredientId(category = "") {
    const typeCode = (category.trim().charAt(0) || "X").toUpperCase();
    const prefix = `ING-${typeCode}`;
    const nextNumber = ingredients.reduce((highestNumber, ingredient) => {
        const match = (ingredient.id || "").match(new RegExp(`^${prefix}(\\d+)$`, "i"));
        return match ? Math.max(highestNumber, Number(match[1])) : highestNumber;
    }, 0) + 1;

    return `${prefix}${String(nextNumber).padStart(3, "0")}`;
}

function saveIngredientDraft() {
    DraftStore.write(INGREDIENTS_DRAFT_KEY, ingredients, repositoryIngredients);
}

function renderDraftBlockNotice() {
    document.querySelector(".ingredient-draft-warning")?.remove();
    if (!ingredientDraftBlocked) return;
    const notice = document.createElement("p");
    notice.className = "ingredient-draft-warning editor-feedback error";
    notice.textContent = "An older draft is open for review only. Reload this page and merge or discard it before saving.";
    document.querySelector(".page-header")?.insertAdjacentElement("afterend", notice);
}

function showUndoToast(message, undo) {
    document.querySelector(".manager-toast")?.remove();
    const toast = document.createElement("div");
    toast.className = "manager-toast";
    toast.setAttribute("role", "status");
    toast.innerHTML = `<span>${escapeHtml(message)}</span><button type="button" class="secondary-button">Undo</button>`;
    const timer = window.setTimeout(() => toast.remove(), 7000);
    toast.querySelector("button").addEventListener("click", () => {
        window.clearTimeout(timer);
        toast.remove();
        undo();
    });
    document.body.appendChild(toast);
}

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

}
