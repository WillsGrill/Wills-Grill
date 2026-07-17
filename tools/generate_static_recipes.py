#!/usr/bin/env python3
"""Generate crawlable recipe pages and sitemap from the canonical JSON data."""

from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE_URL = "https://willsgrill.github.io/Wills-Grill"


def ingredient_line(item: dict, ingredients: dict[str, dict]) -> str:
    record = ingredients.get(str(item.get("ingredient", "")), {})
    quantity = item.get("quantity", "")
    if isinstance(quantity, float) and quantity.is_integer():
        quantity = int(quantity)
    unit = item.get("unit") or record.get("unit") or ""
    name = record.get("name") or item.get("ingredient") or "Ingredient"
    return " ".join(str(part) for part in (quantity, unit, name) if part not in ("", None)).strip()


def render_ingredients(items: list[dict], ingredients: dict[str, dict]) -> str:
    parts = []
    previous_section = None
    for item in items:
        section = str(item.get("section", "")).strip()
        if section and section != previous_section:
            parts.append(f'<li class="ingredient-section-heading"><h4>{html.escape(section)}</h4></li>')
        parts.append(f"<li>{html.escape(ingredient_line(item, ingredients))}</li>")
        previous_section = section
    return "".join(parts)


def render_page(recipe: dict, ingredient_records: dict[str, dict]) -> str:
    recipe_id = str(recipe["id"])
    slug = recipe_id.lower()
    name = html.escape(str(recipe["name"]), quote=True)
    description = html.escape(str(recipe.get("description", "")), quote=True)
    image = str(recipe.get("image", ""))
    canonical = f"{BASE_URL}/recipes/{slug}.html"
    image_url = f"{BASE_URL}/assets/images/recipes/{image}" if image else f"{BASE_URL}/assets/images/homepage-hero-image.webp"
    ingredient_lines = [ingredient_line(item, ingredient_records) for item in recipe.get("ingredients", [])]
    structured_data = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        "name": recipe["name"],
        "description": recipe.get("description", ""),
        "image": image_url,
        "prepTime": f"PT{recipe.get('prepTime', 0)}M",
        "cookTime": f"PT{recipe.get('cookTime', 0)}M",
        "recipeYield": f"{recipe.get('serves', 1)} servings",
        "recipeCategory": recipe.get("category", ""),
        "recipeIngredient": ingredient_lines,
        "recipeInstructions": [{"@type": "HowToStep", "text": step} for step in recipe.get("steps", [])],
        "nutrition": {
            "@type": "NutritionInformation",
            "calories": f"{recipe.get('nutrition', {}).get('calories', 0)} calories",
            "proteinContent": f"{recipe.get('nutrition', {}).get('protein', 0)} g",
            "carbohydrateContent": f"{recipe.get('nutrition', {}).get('carbs', 0)} g",
            "fatContent": f"{recipe.get('nutrition', {}).get('fat', 0)} g",
        },
    }
    json_ld = json.dumps(structured_data, ensure_ascii=False).replace("</", "<\\/")
    ingredients_html = render_ingredients(recipe.get("ingredients", []), ingredient_records)
    steps_html = "".join(f'<li class="step"><div class="step-number">{index}</div><div>{html.escape(str(step))}</div></li>' for index, step in enumerate(recipe.get("steps", []), 1))

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self'; connect-src 'self'; frame-src 'self' blob:; worker-src 'self' blob:; object-src 'self' blob:; base-uri 'self'; form-action 'self'">
<title>{name} | Will's Grill</title>
<meta name="description" content="{description}">
<meta property="og:title" content="{name} | Will's Grill">
<meta property="og:description" content="{description}">
<meta property="og:type" content="article">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{image_url}">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="{canonical}">
<link rel="icon" href="../favicon.svg?v=2" type="image/svg+xml">
<link rel="stylesheet" href="../assets/css/style.css?v=2.4">
<script id="recipeStructuredData" type="application/ld+json">{json_ld}</script>
</head>
<body>
<a class="skip-link button" href="#main-content">Skip to main content</a>
<header><div class="wrapper header-inner">
<a href="../index.html" class="brand"><img src="../assets/images/logo.webp?v=3" alt="Will's Grill" width="820" height="360" class="brand-logo"><div class="logo-tagline"><span class="tagline-white">Healthy food.</span><span class="tagline-gold">Simple cooking.</span></div></a>
<nav><a href="../index.html">Home</a><a href="../pages/browse.html">Browse Recipes</a><a href="../pages/shopping-list.html">Shopping List</a><a href="../pages/mealpack.html">Create Meal Pack</a></nav>
</div></header>
<main id="main-content" class="wrapper section"><div id="recipePage">
<article class="panel recipe-ingredients"><h1>{name}</h1><p>{description}</p><h2>Ingredients</h2><ul class="ingredients">{ingredients_html}</ul><h2>Method</h2><ol>{steps_html}</ol></article>
</div></main>
<footer><div class="wrapper"><p>© Will's Grill</p></div></footer>
<script src="../assets/js/config.js?v=1.3"></script>
<script src="../assets/js/recipes.js?v=1.16"></script>
<script src="../assets/js/shopping.js?v=1.7"></script>
<script src="../assets/js/ui.js?v=1.2"></script>
<script src="../assets/js/app.js?v=1.3"></script>
</body>
</html>
'''


def main() -> None:
    recipes = json.loads((ROOT / "data/recipes/recipes.json").read_text(encoding="utf-8"))
    ingredient_data = json.loads((ROOT / "data/ingredients/ingredients.json").read_text(encoding="utf-8"))
    ingredients = {str(item["id"]): item for item in ingredient_data}
    homepage = ROOT / "index.html"
    homepage_markup = homepage.read_text(encoding="utf-8")
    homepage_markup = re.sub(
        r'(<p class="stat-value" id="recipeCount">\s*)\d+(\s*</p>)',
        rf"\g<1>{len(recipes)}\g<2>",
        homepage_markup,
        count=1,
    )
    homepage.write_text(homepage_markup, encoding="utf-8")
    output = ROOT / "recipes"
    output.mkdir(exist_ok=True)
    expected = set()
    for recipe in recipes:
        filename = f"{str(recipe['id']).lower()}.html"
        expected.add(filename)
        (output / filename).write_text(render_page(recipe, ingredients), encoding="utf-8")
    for existing in output.glob("*.html"):
        if existing.name not in expected:
            existing.unlink()

    public_urls = ["/", "/pages/browse.html", "/pages/shopping-list.html", "/pages/mealpack.html"]
    public_urls.extend(f"/recipes/{str(recipe['id']).lower()}.html" for recipe in recipes)
    sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    sitemap += "".join(f"  <url><loc>{BASE_URL}{path}</loc></url>\n" for path in public_urls)
    sitemap += "</urlset>\n"
    (ROOT / "sitemap.xml").write_text(sitemap, encoding="utf-8")


if __name__ == "__main__":
    main()
