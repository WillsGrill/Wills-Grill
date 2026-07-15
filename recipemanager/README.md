# Recipe Manager

Personal editor for preparing the recipe and ingredient data used by the Will's Grill website.

## Workflow

1. Open Recipes or Ingredients and edit the data.
2. Recipe changes and ingredient changes are kept as local browser drafts.
3. Convert a recipe image from the recipe Image tab. The image is named using the `rec###.jpg` convention and remains staged in the browser instead of downloading separately.
4. Complete all 8 method steps. The fixed number preserves the Will's Grill website layout.
5. Save the recipe so the image is staged for repository upload.
6. Open **Export** and choose **Save to repository**.

The Export page uses the local browser drafts rather than silently replacing them with the public website data. Use **Discard local changes** on the Export page to remove drafts and reload the current website data.

## Running locally

From the repository root, run `python3 recipemanager/local_server.py` and open `http://127.0.0.1:8000/recipemanager/index.html`. This local-only server lets the Export page's **Save to repository** action write validated drafts to `data/recipes/recipes.json`, `data/ingredients/ingredients.json`, and any staged recipe images. Review `git diff`, then commit and push normally. GitHub Pages remains read-only.

## Browser storage

Recipe and ingredient drafts are stored in the current browser profile using `localStorage`. Converted images are staged in IndexedDB. Clearing browser site data removes those drafts and staged images.

This is a personal tool with no login or server-side protection. Do not add private credentials or access tokens to the frontend.
