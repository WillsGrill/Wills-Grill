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

    recipesDraftKey: "willsgrill-recipes-draft-v2",

    ingredientsDraftKey: "willsgrill-ingredients-draft-v2",

    recipePreviewKey: "willsgrill-recipe-preview-v1",

    recipePreviewPage: `${ROOT}pages/recipe.html`,

    editorDatabase: "willsgrill-editor-v2",

    recipeImages: `${ROOT}assets/images/recipes/`,

    saveEndpoint: `${ROOT}api/recipemanager/save`,

    sessionEndpoint: `${ROOT}api/recipemanager/session`

};

const DraftStore = (() => {

    const RECORD_VERSION = 3;

    function revision(data) {
        const text = JSON.stringify(Array.isArray(data) ? data : []);
        let hash = 2166136261;

        for (let index = 0; index < text.length; index += 1) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }

        return `v${RECORD_VERSION}-${(hash >>> 0).toString(16).padStart(8, "0")}`;
    }

    function readRaw(key) {
        try {
            return JSON.parse(localStorage.getItem(key));
        }
        catch (error) {
            return null;
        }
    }

    function inspect(key, repositoryData) {
        const freshData = Array.isArray(repositoryData) ? repositoryData : [];
        const raw = readRaw(key);

        if (!raw) {
            return {
                data: freshData,
                base: freshData,
                hasDraft: false,
                stale: false,
                legacy: false,
                blocked: false
            };
        }

        if (Array.isArray(raw)) {
            return {
                data: raw,
                base: [],
                hasDraft: true,
                stale: true,
                legacy: true,
                blocked: true
            };
        }

        const data = Array.isArray(raw.data) ? raw.data : freshData;
        const base = Array.isArray(raw.base) ? raw.base : [];
        const stale = raw.baseRevision !== revision(freshData);

        return {
            data,
            base,
            hasDraft: true,
            stale,
            legacy: raw.version !== RECORD_VERSION,
            blocked: stale
        };
    }

    function write(key, data, repositoryData) {
        const base = Array.isArray(repositoryData) ? repositoryData : [];
        const record = {
            version: RECORD_VERSION,
            baseRevision: revision(base),
            base,
            data: Array.isArray(data) ? data : [],
            savedAt: new Date().toISOString()
        };

        localStorage.setItem(key, JSON.stringify(record));
        return record;
    }

    function clear(key) {
        localStorage.removeItem(key);
    }

    function mergeById(repositoryData, draftData) {
        const merged = new Map();

        (Array.isArray(repositoryData) ? repositoryData : []).forEach((item) => {
            if (item?.id) merged.set(item.id, item);
        });

        (Array.isArray(draftData) ? draftData : []).forEach((item) => {
            if (item?.id) merged.set(item.id, { ...(merged.get(item.id) || {}), ...item });
        });

        return [...merged.values()];
    }

    function downloadBackup(label, data) {
        const filename = `${String(label || "draft").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-backup-${new Date().toISOString().slice(0, 10)}.json`;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    function showConflictDialog(label, state, repositoryData) {
        return new Promise((resolve) => {
            const previousFocus = document.activeElement;
            const overlay = document.createElement("div");
            overlay.className = "draft-conflict-overlay";
            overlay.innerHTML = `
                <section class="draft-conflict-dialog" role="dialog" aria-modal="true" aria-labelledby="draftConflictTitle">
                    <h2 id="draftConflictTitle">Older ${escapeDraftText(label)} draft found</h2>
                    <p>The browser draft contains ${state.data.length} records, while the repository contains ${repositoryData.length}. Saving the older draft could remove newer repository data.</p>
                    <p class="draft-conflict-note">Safe merge keeps every repository record and applies draft records with matching IDs. Automatic merge does not apply deletions.</p>
                    <div class="draft-conflict-actions">
                        <button type="button" class="primary-button" data-choice="merge">Merge safely</button>
                        <button type="button" class="secondary-button" data-choice="discard">Discard old draft</button>
                        <button type="button" class="secondary-button" data-choice="review">Review without saving</button>
                        <button type="button" class="secondary-button" data-choice="backup">Download draft backup</button>
                    </div>
                </section>
            `;

            const finish = (choice) => {
                document.removeEventListener("keydown", handleKeydown);
                overlay.remove();
                previousFocus?.focus?.();
                resolve(choice);
            };

            const handleKeydown = (event) => {
                if (event.key === "Escape") finish("review");
                if (event.key !== "Tab") return;
                const focusable = [...overlay.querySelectorAll("button")];
                const first = focusable[0];
                const last = focusable.at(-1);
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                }
                else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            };

            overlay.querySelector("[data-choice='merge']").addEventListener("click", () => finish("merge"));
            overlay.querySelector("[data-choice='discard']").addEventListener("click", () => finish("discard"));
            overlay.querySelector("[data-choice='review']").addEventListener("click", () => finish("review"));
            overlay.querySelector("[data-choice='backup']").addEventListener("click", () => downloadBackup(label, state.data));
            document.body.appendChild(overlay);
            document.addEventListener("keydown", handleKeydown);
            overlay.querySelector("[data-choice='merge']").focus();
        });
    }

    async function resolve(key, repositoryData, label) {
        const state = inspect(key, repositoryData);
        if (!state.stale) return state;

        const choice = await showConflictDialog(label, state, repositoryData);

        if (choice === "discard") {
            clear(key);
            return inspect(key, repositoryData);
        }

        if (choice === "merge") {
            const data = mergeById(repositoryData, state.data);
            write(key, data, repositoryData);
            return {
                data,
                base: repositoryData,
                hasDraft: true,
                stale: false,
                legacy: false,
                blocked: false,
                merged: true
            };
        }

        return { ...state, blocked: true, reviewOnly: true };
    }

    function escapeDraftText(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    return { inspect, resolve, write, clear, revision, downloadBackup };

})();
