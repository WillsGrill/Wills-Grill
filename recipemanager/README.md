# Recipe Manager

Personal editor for preparing the recipe and ingredient data used by the Will's Grill website.

## Workflow

1. Open Recipes or Ingredients and edit the data.
2. Recipe changes and ingredient changes are kept as local browser drafts.
3. Convert a recipe image from the recipe Image tab. The image is named using the `rec###.webp` convention and remains staged in the browser instead of downloading separately.
4. Complete all 8 method steps. The fixed number preserves the Will's Grill website layout.
5. Save the recipe so the image is staged for repository upload.
6. Open **Export** and choose **Save to repository**.

The Export page detects drafts based on older repository data and asks you to merge, discard, review, or back them up before continuing. Use **Discard local changes** on the Export page to remove current drafts and reload the repository data.

## Running locally

On macOS, double-click `Start Recipe Manager.command` in the repository folder. The launcher starts the local server and opens Recipe Manager in Safari. Keep its Terminal window open while editing, then press Control-C in that window when finished.

From the repository root, run `python3 recipemanager/local_server.py` and open `http://127.0.0.1:8000/recipemanager/index.html`. This local-only server lets the Export page's **Save to repository** action write validated drafts to `data/recipes/recipes.json`, `data/ingredients/ingredients.json`, and any staged recipe images. Review `git diff`, then commit and push normally. GitHub Pages remains read-only.

## Browser storage

Recipe and ingredient drafts are stored in the current browser profile using `localStorage`. Converted images are staged in IndexedDB. Clearing browser site data removes those drafts and staged images.

This is a local personal tool. Repository saves require a short-lived session token and an unchanged repository revision, and the server validates the full data schema before writing. Keep using it only on your own computer and do not add private credentials to the frontend.
