"use strict";

const ROOT = window.location.pathname.includes("/pages/") || window.location.pathname.includes("/recipes/")
    ? "../"
    : "";

const PATHS = {

    recipes: `${ROOT}data/recipes/recipes.json`,

    ingredients: `${ROOT}data/ingredients/ingredients.json`

};

const loadedScripts = new Map();

function loadScriptOnce(src) {
    if (loadedScripts.has(src)) return loadedScripts.get(src);

    const existing = [...document.scripts].find(script => script.src && new URL(script.src).pathname === new URL(src, location.href).pathname);
    if (existing) {
        const ready = Promise.resolve();
        loadedScripts.set(src, ready);
        return ready;
    }

    const request = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Unable to load ${src}.`));
        document.head.appendChild(script);
    });
    loadedScripts.set(src, request);
    return request;
}

async function ensurePDFLibraries() {
    if (!window.jspdf?.jsPDF) await loadScriptOnce(`${ROOT}assets/vendor/jspdf.umd.min.js`);
    if (!window.WillsGrillPDF) await loadScriptOnce(`${ROOT}assets/js/pdf-style.js?v=1.11`);
}

function getRecipeURL(recipeID) {
    const slug = String(recipeID || "").trim().toLowerCase();
    return `${ROOT}recipes/${encodeURIComponent(slug)}.html`;
}

function initialiseSiteNavigation() {
    const header = document.querySelector("body > header");
    const nav = header?.querySelector("nav");
    if (!header || !nav) return;

    if (!nav.id) nav.id = "siteNavigation";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "nav-toggle";
    toggle.setAttribute("aria-controls", nav.id);
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "Menu";
    header.querySelector(".header-inner")?.insertBefore(toggle, nav);
    toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", event => {
        if (!event.target.closest("a") || !nav.classList.contains("open")) return;
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
    });
    header.addEventListener("keydown", event => {
        if (event.key !== "Escape" || !nav.classList.contains("open")) return;
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
    });

    const shoppingLink = [...nav.querySelectorAll("a")].find(link => link.textContent.includes("Shopping List"));
    if (shoppingLink && !shoppingLink.querySelector(".nav-count")) {
        shoppingLink.classList.add("shopping-nav-link");
        const count = document.createElement("span");
        count.className = "nav-count";
        count.setAttribute("aria-label", "selected recipes");
        count.textContent = "0";
        shoppingLink.append(count);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialiseSiteNavigation);
}
else {
    initialiseSiteNavigation();
}
