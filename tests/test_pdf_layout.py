import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class PdfLayoutTests(unittest.TestCase):
    def test_pdf_design_system_is_eager_only_where_immediately_required(self):
        mealpack_html = (ROOT / "pages/mealpack.html").read_text()
        self.assertIn("../assets/js/pdf-style.js", mealpack_html)
        for relative_page in ("pages/recipe.html", "pages/shopping-list.html"):
            with self.subTest(page=relative_page):
                self.assertNotIn("../assets/js/pdf-style.js", (ROOT / relative_page).read_text())

        config_script = (ROOT / "assets/js/config.js").read_text()
        self.assertIn("async function ensurePDFLibraries", config_script)
        self.assertIn("assets/js/pdf-style.js", config_script)

    def test_generators_use_shared_measured_layouts(self):
        recipe_script = (ROOT / "assets/js/recipes.js").read_text()
        shopping_script = (ROOT / "assets/js/shopping.js").read_text()
        mealpack_script = (ROOT / "assets/js/mealpack.js").read_text()

        self.assertIn("WillsGrillPDF.drawRecipePages", recipe_script)
        self.assertIn("WillsGrillPDF.drawShoppingPages", shopping_script)
        self.assertIn("WillsGrillPDF.drawRecipePages", mealpack_script)
        self.assertIn("WillsGrillPDF.drawShoppingPages", mealpack_script)
        self.assertIn("assets/images/recipes/thumbs/${recipe.image}", mealpack_script)

        for script in (recipe_script, shopping_script, mealpack_script):
            self.assertNotIn("doc.addImage(", script)

    def test_shared_layout_has_overflow_and_rounded_image_protection(self):
        shared_script = (ROOT / "assets/js/pdf-style.js").read_text()
        for required_feature in (
            "drawRoundedImage",
            "measureStepLayout",
            "drawMethodContinuationPages",
            "measureIngredientLayout",
            "drawIngredientContinuationPages",
            "drawStepBoxes",
            "drawShoppingPages",
            "doc.clip()",
        ):
            with self.subTest(feature=required_feature):
                self.assertIn(required_feature, shared_script)


if __name__ == "__main__":
    unittest.main()
