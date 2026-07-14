# Wills-Grill

Healthy Mediterranean recipes with smart meal planning.

## Run locally

The recipe and ingredient data are loaded with `fetch()`, so open the site through a local HTTP server rather than directly as a `file://` page.

From the project root, start a local server with Python:

	python3 -m http.server 8000

Then open http://localhost:8000 in a browser.

## Main journeys

- Browse and search recipes.
- Add recipes and adjust their quantities.
- Generate a combined shopping list.
- Tick off shopping items; ticks are retained in the current browser.
- Create and print a meal pack.

## Project structure

- `data/` contains the recipe and ingredient databases.
- `assets/` contains stylesheets, scripts, images, and supporting assets.
- `pages/` contains the Browse, Recipe, Shopping List, and Meal Pack pages.
