import json
import html
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class DataIntegrityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.recipes = json.loads((ROOT / "data/recipes/recipes.json").read_text())
        cls.ingredients = json.loads((ROOT / "data/ingredients/ingredients.json").read_text())

    def test_ids_are_unique_and_well_formed(self):
        recipe_ids = [recipe["id"] for recipe in self.recipes]
        ingredient_ids = [ingredient["id"] for ingredient in self.ingredients]
        self.assertEqual(len(recipe_ids), len(set(recipe_ids)))
        self.assertEqual(len(ingredient_ids), len(set(ingredient_ids)))
        self.assertTrue(all(re.fullmatch(r"REC\d{3}", item) for item in recipe_ids))
        self.assertTrue(all(re.fullmatch(r"ING-[A-Z]\d{3}", item) for item in ingredient_ids))

    def test_recipe_references_and_numeric_values(self):
        ingredient_ids = {ingredient["id"] for ingredient in self.ingredients}
        for recipe in self.recipes:
            with self.subTest(recipe=recipe["id"]):
                self.assertEqual(8, len(recipe["steps"]))
                self.assertTrue(all(step.strip() for step in recipe["steps"]))
                self.assertGreater(recipe["serves"], 0)
                for row in recipe["ingredients"]:
                    self.assertIn(row["ingredient"], ingredient_ids)
                    self.assertIsInstance(row["quantity"], (int, float))
                    self.assertNotIsInstance(row["quantity"], bool)
                    self.assertGreater(row["quantity"], 0)

    def test_recipe_images_and_thumbnails_exist(self):
        for recipe in self.recipes:
            with self.subTest(recipe=recipe["id"]):
                if not recipe.get("image"):
                    continue
                self.assertTrue((ROOT / "assets/images/recipes" / recipe["image"]).is_file())
                self.assertTrue((ROOT / "assets/images/recipes/thumbs" / recipe["image"]).is_file())

    def test_ingredient_pantry_values_are_boolean(self):
        self.assertTrue(all(isinstance(item.get("pantry"), bool) for item in self.ingredients))

    def test_treat_values_belong_to_ingredients_and_are_boolean(self):
        self.assertFalse(any("treat" in recipe for recipe in self.recipes))
        self.assertTrue(all(isinstance(ingredient["treat"], bool) for ingredient in self.ingredients if "treat" in ingredient))

    def test_local_pages_do_not_depend_on_remote_scripts(self):
        for page in [ROOT / "index.html", *(ROOT / "pages").glob("*.html")]:
            with self.subTest(page=page.name):
                self.assertNotRegex(page.read_text(), r'<script[^>]+src="https?://')

    def test_static_recipe_pages_and_sitemap_cover_every_recipe(self):
        sitemap = (ROOT / "sitemap.xml").read_text()
        for recipe in self.recipes:
            slug = recipe["id"].lower()
            page = ROOT / "recipes" / f"{slug}.html"
            with self.subTest(recipe=recipe["id"]):
                self.assertTrue(page.is_file())
                markup = page.read_text()
                self.assertIn(f"<title>{html.escape(recipe['name'])} | Will's Grill</title>", markup)
                self.assertIn('type="application/ld+json"', markup)
                self.assertIn(f"/recipes/{slug}.html", sitemap)

    def test_public_recipe_strings_have_expected_types(self):
        for recipe in self.recipes:
            with self.subTest(recipe=recipe["id"]):
                for field in ("name", "description", "category", "difficulty", "tip"):
                    self.assertIsInstance(recipe.get(field), str)
                self.assertIsInstance(recipe.get("nutrition"), dict)


if __name__ == "__main__":
    unittest.main()
