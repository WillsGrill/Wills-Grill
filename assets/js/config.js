"use strict";

const ROOT = window.location.pathname.includes("/pages/")
    ? "../"
    : "";

const PATHS = {

    recipes: `${ROOT}data/recipes/recipes.json`,

    ingredients: `${ROOT}data/ingredients/ingredients.json`

};

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

    const shoppingLink = [...nav.querySelectorAll("a")].find(link => link.textContent.includes("Shopping List"));
    if (shoppingLink && !shoppingLink.querySelector(".nav-count")) {
        const count = document.createElement("span");
        count.className = "nav-count";
        count.setAttribute("aria-label", "selected recipes");
        count.textContent = "0";
        shoppingLink.append(" ", count);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialiseSiteNavigation);
}
else {
    initialiseSiteNavigation();
}
